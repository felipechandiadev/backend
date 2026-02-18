import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../src/auth/auth/auth.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { AuditModule } from '../../src/audit/audit.module';
import { User } from '../../src/entities/user.entity';
import { AuditLog } from '../../src/entities/audit-log.entity';
import { Person } from '../../src/entities/person.entity';
import { Multimedia } from '../../src/entities/multimedia.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// Utiliza variables de entorno reales para la conexión

describe('AuthController (integration)', () => {
  jest.setTimeout(20000); // Aumenta el timeout global para conexiones lentas
  let app: INestApplication;
  let userRepository: Repository<User>;
  let personRepository: Repository<Person>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(),
        TypeOrmModule.forRoot({
          type: 'mysql',
          connectorPackage: 'mysql2',
          host: process.env.DB_HOST,
          port: parseInt(process.env.DB_PORT || '3306', 10),
          username: process.env.DB_USERNAME,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_DATABASE,
          entities: [User, AuditLog, Person, Multimedia],
          synchronize: true, // Solo para pruebas, no usar en producción
        }),
        TypeOrmModule.forFeature([User]),
        UsersModule,
        AuthModule,
        AuditModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    personRepository = moduleFixture.get<Repository<Person>>(
      getRepositoryToken(Person),
    );
  });

  afterAll(async () => {
    // Limpia la persona asociada y luego el usuario de prueba para evitar errores de FK
    try {
      const user = await userRepository.findOne({
        where: { email: 'test.integration@example.com' },
      });
      if (user) {
        // Eliminar person vinculada al user si existe
        await personRepository.delete({ user: { id: user.id } } as any);
        // Eliminar el usuario
        await userRepository.delete({ id: user.id });
      }
    } catch (err) {
      console.error('Error cleaning test user/person:', err);
    } finally {
      await app.close();
    }
  });

  it('debe registrar y loguear un usuario real', async () => {
    // 1. Registrar usuario vía API
    const password = 'Test1234!';
    const registerData = {
      username: 'testintegration',
      email: 'test.integration@example.com',
      password: password,
      personalInfo: {
        firstName: 'Test',
        lastName: 'Integration',
        phone: '+56912345678',
      },
    };

    const registerResponse = await request(app.getHttpServer())
      .post('/users')
      .send(registerData)
      .expect(201);

    console.log('Register response:', registerResponse.body);

    // Verificar que el usuario se creó
    const createdUser = await userRepository.findOne({
      where: { email: 'test.integration@example.com' },
    });
    console.log('Created user:', createdUser);

    // 2. Hacer login vía API
    const res = await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email: 'test.integration@example.com', password })
      .expect(201);

    expect(res.body).toHaveProperty('access_token');
    expect(res.body.user.email).toBe('test.integration@example.com');
  });
});
