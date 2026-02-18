import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../../src/modules/users/users.module';
import { AuthModule } from '../../src/auth/auth/auth.module';
import {
  User,
  UserRole,
  UserStatus,
  Permission,
} from '../../src/entities/user.entity';
import { Person } from '../../src/entities/person.entity';
import { Multimedia } from '../../src/entities/multimedia.entity';
import { AuditLog } from '../../src/entities/audit-log.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditModule } from '../../src/audit/audit.module';
import { JweService } from '../../src/auth/jwe/jwe.service';
import { setJweService, createJwtToken } from '../utils/jwt';
import * as jwt from 'jsonwebtoken';

describe('UsersController (integration)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let personRepository: Repository<Person>;
  let adminToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // Forzar entorno de tests y evitar uso de JWE en pruebas
    process.env.NODE_ENV = 'test';
    // Registrar un mock sencillo para JweService en el util de tests
    const mockJweForUtil: any = {
      encrypt: async (payload: any, ttl?: string) =>
        jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', {
          expiresIn: '1h',
        }),
    };
    setJweService(mockJweForUtil);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'mysql',
          host: process.env.DB_HOST,
          port: parseInt(process.env.DB_PORT || '3306', 10),
          username: process.env.DB_USERNAME,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_DATABASE,
          entities: [User, Person, Multimedia, AuditLog],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([User]),
        UsersModule,
        AuthModule,
        AuditModule,
      ],
    }).compile();

    // Si el JweService está registrado en el módulo, lo sobreescribimos con un mock
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );

    personRepository = moduleFixture.get<Repository<Person>>(
      getRepositoryToken(Person),
    );

    // Crear un usuario admin para las pruebas
    // Limpiar cualquier dato previo (admin y posible usuario de integración)
    try {
      // eliminar personas relacionadas primero para evitar FK
      await personRepository.delete({
        user: { email: 'admin.test@example.com' },
      });
      await personRepository.delete({
        user: { email: 'test.user.integration@example.com' },
      });
    } catch (e) {
      // ignore if not possible
    }
    await userRepository.delete({ email: 'admin.test@example.com' });
    await userRepository.delete({ email: 'test.user.integration@example.com' });

    // Crear usuario admin
    const adminUser = userRepository.create({
      username: 'admin.test',
      email: 'admin.test@example.com',
      role: 'ADMIN',
      status: 'ACTIVE',
    } as Partial<User>);
    await adminUser.setPassword('Admin123!');
    await userRepository.save(adminUser);

    // Obtener token de admin
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({
        email: 'admin.test@example.com',
        password: 'Admin123!',
      });

    adminToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    if (personRepository) {
      // Limpiar personas asociadas a usuarios de prueba primero para evitar FK constraint
      try {
        // Find users by email and delete related persons by userId
        const adminUser = await userRepository.findOne({
          where: { email: 'admin.test@example.com' },
        });
        const testUser = await userRepository.findOne({
          where: { email: 'test.user.integration@example.com' },
        });
        if (adminUser) {
          await personRepository.delete({ user: { id: adminUser.id } } as any);
        }
        if (testUser) {
          await personRepository.delete({ user: { id: testUser.id } } as any);
        }
      } catch (e) {
        // ignore
      }
    }
    if (userRepository) {
      await userRepository.delete({ email: 'admin.test@example.com' });
      await userRepository.delete({
        email: 'test.user.integration@example.com',
      });
    }
    if (app) {
      await app.close();
    }
  });

  describe('POST /users', () => {
    it('debe crear un nuevo usuario', async () => {
      const newUser = {
        username: 'testuser_integration',
        email: 'test.user.integration@example.com',
        password: 'Test123!',
        role: UserRole.COMMUNITY,
        permissions: [],
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBeDefined();
      expect(response.body.email).toBe(newUser.email);
      expect(response.body.username).toBe(newUser.username);
      expect(response.body.role).toBe(UserRole.COMMUNITY);
      expect(response.body).not.toHaveProperty('password');

      testUserId = response.body.id;
    });

    it('debe fallar al crear un usuario con email duplicado', async () => {
      const duplicateUser = {
        username: 'testuser2',
        email: 'test.user.integration@example.com', // Email duplicado
        password: 'Test123!',
        role: 'USER',
        status: 'ACTIVE',
      };

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateUser)
        .expect(400);
    });
  });

  describe('GET /users', () => {
    it('debe obtener la lista de usuarios', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /users/:id', () => {
    it('debe obtener un usuario por ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(testUserId);
    });

    it('debe fallar al buscar un ID que no existe', async () => {
      await request(app.getHttpServer())
        .get('/users/99999999-9999-9999-9999-999999999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /users/:id', () => {
    it('debe actualizar un usuario existente', async () => {
      const updateData = {
        username: 'updateduser',
        status: 'INACTIVE',
      };

      const response = await request(app.getHttpServer())
        .patch(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.username).toBe(updateData.username);
      expect(response.body.status).toBe(updateData.status);
    });
  });

  describe('PATCH /users/:id/change-password', () => {
    it('debe cambiar la contraseña de un usuario', async () => {
      // Primero cambiar el estado a ACTIVE para poder hacer login
      await request(app.getHttpServer())
        .patch(`/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: UserStatus.ACTIVE })
        .expect(200);

      const changePasswordData = {
        currentPassword: 'Test123!',
        newPassword: 'NewTest123!',
      };

      await request(app.getHttpServer())
        .patch(`/users/${testUserId}/change-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(changePasswordData)
        .expect(200);

      // Verificar que la nueva contraseña funciona
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({
          email: 'test.user.integration@example.com',
          password: 'NewTest123!',
        });

      // Allow either 200 or 201 depending on implementation
      expect([200, 201]).toContain(loginResponse.status);
      expect(loginResponse.body.access_token).toBeDefined();

      expect(loginResponse.body.access_token).toBeDefined();
    });

    it('debe fallar con contraseña actual incorrecta', async () => {
      const changePasswordData = {
        currentPassword: 'WrongPassword!',
        newPassword: 'NewTest123!',
      };

      await request(app.getHttpServer())
        .patch(`/users/${testUserId}/change-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(changePasswordData)
        .expect(401);
    });

    it('debe fallar al cambiar contraseña de usuario que no existe', async () => {
      const changePasswordData = {
        currentPassword: 'Test123!',
        newPassword: 'NewTest123!',
      };

      await request(app.getHttpServer())
        .patch('/users/99999999-9999-9999-9999-999999999999/change-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(changePasswordData)
        .expect(404);
    });
  });

  describe('GET /users/:id/profile', () => {
    it('debe obtener el perfil extendido de un usuario', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${testUserId}/profile`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(testUserId);
      expect(response.body).toHaveProperty('username');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('role');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('permissions');
      expect(response.body).toHaveProperty('personalInfo');
    });

    it('debe fallar al obtener perfil de usuario que no existe', async () => {
      await request(app.getHttpServer())
        .get('/users/99999999-9999-9999-9999-999999999999/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /users/:id/status', () => {
    it('debe cambiar el estado de un usuario', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: UserStatus.INACTIVE })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(testUserId);
      expect(response.body.status).toBe(UserStatus.INACTIVE);
    });

    it('debe fallar al cambiar estado de usuario que no existe', async () => {
      await request(app.getHttpServer())
        .patch('/users/99999999-9999-9999-9999-999999999999/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /users/:id/role', () => {
    it('debe cambiar el rol de un usuario', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${testUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.AGENT })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(testUserId);
      expect(response.body.role).toBe(UserRole.AGENT);
    });

    it('debe fallar al cambiar rol de usuario que no existe', async () => {
      await request(app.getHttpServer())
        .patch('/users/99999999-9999-9999-9999-999999999999/role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.ADMIN })
        .expect(404);
    });
  });

  describe('PATCH /users/:id/permissions', () => {
    it('debe cambiar los permisos de un usuario', async () => {
      const newPermissions = [
        Permission.MANAGE_USERS,
        Permission.MANAGE_PROPERTIES,
      ];

      const response = await request(app.getHttpServer())
        .patch(`/users/${testUserId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions: newPermissions })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(testUserId);
      expect(response.body.permissions).toEqual(newPermissions);
    });

    it('debe fallar al cambiar permisos de usuario que no existe', async () => {
      await request(app.getHttpServer())
        .patch('/users/99999999-9999-9999-9999-999999999999/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions: [Permission.MANAGE_USERS] })
        .expect(404);
    });
  });
});
