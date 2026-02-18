import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { exec } from 'child_process';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertyModule } from '../../src/modules/property/property.module';
import { AuthModule } from '../../src/auth/auth/auth.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { Property } from '../../src/entities/property.entity';
import { User } from '../../src/entities/user.entity';
import { AuditLog } from '../../src/entities/audit-log.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditModule } from '../../src/audit/audit.module';
import { UserRole, UserStatus } from '../../src/entities/user.entity';

const mockJose = {
  CompactEncrypt: jest.fn().mockReturnThis(),
  setProtectedHeader: jest.fn().mockReturnThis(),
  encrypt: jest.fn().mockResolvedValue('mockToken'),
  CompactDecrypt: jest.fn().mockReturnThis(),
  decrypt: jest.fn().mockResolvedValue({ payload: 'mockPayload' }),
  importPKCS8: jest.fn().mockResolvedValue('mockPrivateKey'),
  importSPKI: jest.fn().mockResolvedValue('mockPublicKey'),
  EncryptJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setIssuer: jest.fn().mockReturnThis(),
    setAudience: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    encrypt: jest.fn().mockResolvedValue('mockToken'),
  })),
};

describe('PropertyController (integration)', () => {
  let app: INestApplication;
  let propertyRepository: Repository<Property>;
  let userRepository: Repository<User>;
  let adminToken: string;
  let testPropertyId: string;

  beforeAll(() => {
    jest.mock('jose', () => mockJose);
  });

  beforeAll(async () => {
    try {
      // Ejecutar seed:reset antes de las pruebas
      console.log('🔄 Resetting database to initial state...');
      await new Promise((resolve, reject) => {
        const seedProcess = exec(
          'npm run seed:reset',
          { env: process.env },
          (error) => {
            if (error) {
              console.error('❌ Failed to reset database:', error.message);
              reject(error);
            } else {
              console.log('✅ Database reset successful');
              resolve(true);
            }
          },
        );
        seedProcess.stdout?.pipe(process.stdout);
        seedProcess.stderr?.pipe(process.stderr);
      });

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot(),
          TypeOrmModule.forRoot({
            type: 'mysql',
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT || '3306', 10),
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
            entities: [Property, User, AuditLog],
            synchronize: true,
          }),
          TypeOrmModule.forFeature([Property, User]),
          PropertyModule,
          UsersModule,
          AuthModule,
          AuditModule,
        ],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
      await app.init();

      propertyRepository = moduleFixture.get<Repository<Property>>(
        getRepositoryToken(Property),
      );
      userRepository = moduleFixture.get<Repository<User>>(
        getRepositoryToken(User),
      );

      // Crear usuario admin para las pruebas
      const adminUser = userRepository.create({
        username: 'admin.property.test',
        email: 'admin.property.test@example.com',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      });
      await adminUser.setPassword('Admin123!');
      const savedAdmin = await userRepository.save(adminUser);

      // Obtener token de admin
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({
          email: 'admin.property.test@example.com',
          password: 'Admin123!',
        });

      adminToken = loginResponse.body.access_token;
    } catch (error) {
      console.error('❌ Error during setup:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      // Eliminar registros existentes
      if (propertyRepository && userRepository) {
        const properties = await propertyRepository.find();
        const users = await userRepository.find();

        if (properties.length > 0) {
          await propertyRepository.softDelete(properties.map((p) => p.id));
        }
        if (users.length > 0) {
          await userRepository.softDelete(users.map((u) => u.id));
        }
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

  describe('POST /properties', () => {
    it('debe crear una nueva propiedad', async () => {
      // Get the admin user
      const admin = await userRepository.findOne({
        where: { email: 'admin.property.test@example.com' },
      });
      expect(admin).toBeDefined();

      const newProperty = {
        title: 'Test Property',
        description: 'A test property description',
        status: 'REQUEST',
        operationType: 'SALE',
        creatorUserId: admin?.id,
        price: 150000000,
        currencyPrice: 'CLP',
        bathrooms: 2,
        bedrooms: 3,
        parkingSpaces: 1,
        builtSquareMeters: 120,
        landSquareMeters: 200,
        region: 'Metropolitana',
        commune: 'Santiago',
      };

      // Intentar crear una propiedad y capturar la respuesta incluso si falla
      const response = await request(app.getHttpServer())
        .post('/properties')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newProperty);

      console.log('Response body:', response.body);
      expect(response.status).toBe(201);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBeDefined();
      expect(response.body.title).toBe(newProperty.title);
      expect(response.body.status).toBe(newProperty.status);
      expect(response.body.operationType).toBe(newProperty.operationType);
      expect(response.body.region).toBe(newProperty.region);
      expect(response.body.commune).toBe(newProperty.commune);

      testPropertyId = response.body.id;
    });

    it('public publish (sin auth) no debe persistir "anonymous" como creatorUserId', async () => {
      const publicPayload = {
        title: 'Public submission',
        status: 'REQUEST',
        operationType: 'SALE',
        price: 50000000,
        currencyPrice: 'CLP',
        state: 'Metropolitana',
        city: 'Santiago',
        address: 'Calle Falsa 123'
      };

      const res = await request(app.getHttpServer())
        .post('/properties/public/publish')
        .send(publicPayload);

      expect(res.status).toBe(201);
      // creatorUserId should be null/undefined in the persisted record
      expect(res.body.creatorUserId == null).toBe(true);
    });

    it('debe fallar al crear una propiedad sin título', async () => {
      const invalidProperty = {
        description: 'Missing title property',
        status: 'REQUEST',
        operation: 'VENTA',
        regionCommune: {
          region: 'Test Region',
          communes: ['Test Commune'],
        },
      };

      await request(app.getHttpServer())
        .post('/properties')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidProperty)
        .expect(400);
    });
  });

  describe('GET /properties', () => {
    it('debe obtener la lista de propiedades', async () => {
      const response = await request(app.getHttpServer())
        .get('/properties')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('debe filtrar propiedades por tipo', async () => {
      // Primero crear una propiedad específica para asegurar que existe una propiedad SALE
      const salePropertyData = {
        title: 'Casa para Venta',
        description: 'Casa específica para venta solamente',
        status: 'PUBLISHED',
        operationType: 'SALE',
        price: 200000000,
        currencyPrice: 'CLP',
        bedrooms: 3,
        bathrooms: 2,
        builtSquareMeters: 150,
        landSquareMeters: 300,
        parkingSpaces: 2,
        region: 'Metropolitana',
        commune: 'Santiago',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/properties')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(salePropertyData)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/properties')
        .query({ operationType: 'SALE' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeGreaterThan(0);

      // Al menos una propiedad debe ser de tipo SALE
      const saleProperties = response.body.filter(
        (prop) => prop.operationType === 'SALE',
      );
      expect(saleProperties.length).toBeGreaterThan(0);
    });

    it('published/filtered?operation=RENT ignores priceMin/priceMax (portal behavior)', async () => {
      const resNoPrice = await request(app.getHttpServer())
        .get('/properties/published/filtered')
        .query({ operation: 'RENT', page: 1 })
        .expect(200);

      const resWithPrice = await request(app.getHttpServer())
        .get('/properties/published/filtered')
        .query({ operation: 'RENT', page: 1, priceMin: 10000000, priceMax: 20000000 })
        .expect(200);

      expect(Array.isArray(resNoPrice.body.data)).toBeTruthy();
      expect(resNoPrice.body.data.length).toBeGreaterThan(0);
      // The portal endpoint should ignore price filters for rent listing (per UX decision)
      expect(resWithPrice.body.data.length).toBe(resNoPrice.body.data.length);
      expect(resWithPrice.body.data.map((p: any) => p.id)).toEqual(resNoPrice.body.data.map((p: any) => p.id));
    });

    it('published/filtered?operation=RENT ignores sort param (keeps default ordering)', async () => {
      const resDefault = await request(app.getHttpServer())
        .get('/properties/published/filtered')
        .query({ operation: 'RENT', page: 1 })
        .expect(200);

      const resWithSort = await request(app.getHttpServer())
        .get('/properties/published/filtered')
        .query({ operation: 'RENT', page: 1, sort: 'price_desc' })
        .expect(200);

      expect(Array.isArray(resDefault.body.data)).toBeTruthy();
      expect(resWithSort.body.data.map((p: any) => p.id)).toEqual(resDefault.body.data.map((p: any) => p.id));
    });
  });

  describe('GET /properties/:id', () => {
    it('debe obtener una propiedad por ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/properties/${testPropertyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(testPropertyId);
      expect(response.body.title).toBe('Test Property');
    });

    it('debe fallar al buscar una ID que no existe', async () => {
      await request(app.getHttpServer())
        .get('/properties/99999999-9999-9999-9999-999999999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /properties/:id', () => {
    it('debe actualizar una propiedad existente', async () => {
      const updateData = {
        title: 'Updated Test Property',
        status: 'PUBLISHED',
        operationType: 'RENT',
        region: 'Updated Region',
        commune: 'Updated Commune',
      };

      const response = await request(app.getHttpServer())
        .patch(`/properties/${testPropertyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
      expect(response.body.status).toBe(updateData.status);
      expect(response.body.operationType).toBe(updateData.operationType);
      expect(response.body.region).toBe(updateData.region);
      expect(response.body.commune).toBe(updateData.commune);
    });

    it('debe fallar al actualizar con precio negativo', async () => {
      const invalidUpdate = {
        price: -1000,
      };

      await request(app.getHttpServer())
        .patch(`/properties/${testPropertyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidUpdate)
        .expect(400);
    });
  });

  describe('DELETE /properties/:id', () => {
    it('debe eliminar una propiedad existente', async () => {
      await request(app.getHttpServer())
        .delete(`/properties/${testPropertyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verificar que la propiedad fue eliminada
      await request(app.getHttpServer())
        .get(`/properties/${testPropertyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
