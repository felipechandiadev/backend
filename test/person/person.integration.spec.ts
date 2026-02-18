import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { Person } from '../../src/entities/person.entity';
import { createJwtToken } from '../utils/jwt';
// Removed Role import as it's not needed

describe('PersonController (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Crear token JWT para autenticación
    jwtToken = await createJwtToken({
      sub: '123',
      email: 'test@example.com',
      role: 'ADMIN',
    });
  });

  beforeEach(async () => {
    // Limpiar la base de datos antes de cada test
    // Eliminar en orden inverso para respetar las restricciones de clave foránea
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.query(`TRUNCATE TABLE ${entity.tableName}`);
    }
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Database reset successful');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /people', () => {
    it('debe crear una nueva persona', async () => {
      const personData = {
        name: 'Test Person',
        dni: '12345678-9',
        address: '123 Test St',
        phone: '+56912345678',
        email: 'test.person@example.com',
      };

      const response = await request(app.getHttpServer())
        .post('/people')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(personData)
        .expect(201);

      console.log('Response body:', response.body);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(personData.name);
      expect(response.body.dni).toBe(personData.dni);
      expect(response.body.address).toBe(personData.address);
      expect(response.body.phone).toBe(personData.phone);
      expect(response.body.email).toBe(personData.email);
      expect(response.body.verified).toBe(false);
    });

    it('debe fallar al crear una persona con un DNI duplicado', async () => {
      const personData = {
        name: 'Test Person',
        dni: '12345678-9',
        email: 'test.person@example.com',
      };

      // Crear la primera persona
      await request(app.getHttpServer())
        .post('/people')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(personData)
        .expect(201);

      // Intentar crear otra persona con el mismo DNI
      await request(app.getHttpServer())
        .post('/people')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(personData)
        .expect(409);
    });
  });

  describe('GET /people', () => {
    it('debe obtener la lista de personas', async () => {
      // Crear algunas personas de prueba
      const person1 = {
        name: 'Person 1',
        dni: '11111111-1',
        email: 'person1@example.com',
      };

      const person2 = {
        name: 'Person 2',
        dni: '22222222-2',
        email: 'person2@example.com',
      };

      await request(app.getHttpServer())
        .post('/people')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(person1);

      await request(app.getHttpServer())
        .post('/people')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(person2);

      const response = await request(app.getHttpServer())
        .get('/people')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });
  });

  describe('GET /people/:id', () => {
    it('debe obtener una persona por ID', async () => {
      // Crear una persona
      const personData = {
        name: 'Test Person',
        dni: '12345678-9',
        email: 'test.person@example.com',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/people')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(personData);

      const personId = createResponse.body.id;

      // Obtener la persona por ID
      const response = await request(app.getHttpServer())
        .get(`/people/${personId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body.id).toBe(personId);
      expect(response.body.name).toBe(personData.name);
      expect(response.body.dni).toBe(personData.dni);
      expect(response.body.email).toBe(personData.email);
    });

    it('debe fallar al buscar una ID que no existe', async () => {
      await request(app.getHttpServer())
        .get('/people/non-existent-id')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(404);
    });
  });

  describe('PATCH /people/:id', () => {
    it('debe actualizar una persona existente', async () => {
      // Crear una persona
      const personData = {
        name: 'Test Person',
        dni: '12345678-9',
        email: 'test.person@example.com',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/people')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(personData);

      const personId = createResponse.body.id;

      // Actualizar la persona
      const updateData = {
        name: 'Updated Name',
        address: 'New Address',
      };

      const response = await request(app.getHttpServer())
        .patch(`/people/${personId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.address).toBe(updateData.address);
      expect(response.body.dni).toBe(personData.dni); // El DNI no debería cambiar
    });
  });

  describe('DELETE /people/:id', () => {
    it('debe eliminar una persona existente', async () => {
      // Crear una persona
      const personData = {
        name: 'Test Person',
        dni: '12345678-9',
        email: 'test.person@example.com',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/people')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(personData);

      const personId = createResponse.body.id;

      // Eliminar la persona
      await request(app.getHttpServer())
        .delete(`/people/${personId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      // Verificar que la persona fue eliminada
      await request(app.getHttpServer())
        .get(`/people/${personId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(404);
    });
  });
});
