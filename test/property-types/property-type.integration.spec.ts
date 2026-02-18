import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { PropertyType } from '../../src/entities/property-type.entity';

describe('PropertyTypeController (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  beforeEach(async () => {
    // Limpiar la base de datos antes de cada test
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

  describe('POST /property-types', () => {
    it('debe crear un nuevo tipo de propiedad', async () => {
      const propertyTypeData = {
        name: 'Casa',
        description: 'Vivienda unifamiliar',
        hasBedrooms: true,
        hasBathrooms: true,
        hasBuiltSquareMeters: true,
        hasLandSquareMeters: true,
        hasParkingSpaces: true,
      };

      const response = await request(app.getHttpServer())
        .post('/property-types')
        .send(propertyTypeData)
        .expect(201);

      console.log('Response body:', response.body);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(propertyTypeData.name);
      expect(response.body.description).toBe(propertyTypeData.description);
      expect(response.body.hasBedrooms).toBe(propertyTypeData.hasBedrooms);
      expect(response.body.hasBathrooms).toBe(propertyTypeData.hasBathrooms);
      expect(response.body.hasBuiltSquareMeters).toBe(
        propertyTypeData.hasBuiltSquareMeters,
      );
      expect(response.body.hasLandSquareMeters).toBe(
        propertyTypeData.hasLandSquareMeters,
      );
      expect(response.body.hasParkingSpaces).toBe(
        propertyTypeData.hasParkingSpaces,
      );
    });

    it('debe fallar al crear un tipo de propiedad con nombre duplicado', async () => {
      const propertyTypeData = {
        name: 'Casa',
        description: 'Vivienda unifamiliar',
      };

      // Crear el primer tipo de propiedad
      await request(app.getHttpServer())
        .post('/property-types')
        .send(propertyTypeData)
        .expect(201);

      // Intentar crear otro tipo con el mismo nombre
      await request(app.getHttpServer())
        .post('/property-types')
        .send(propertyTypeData)
        .expect(409);
    });
  });

  describe('GET /property-types', () => {
    it('debe obtener la lista de tipos de propiedad', async () => {
      // Crear algunos tipos de propiedad de prueba
      const type1 = {
        name: 'Casa',
        description: 'Vivienda unifamiliar',
      };

      const type2 = {
        name: 'Departamento',
        description: 'Vivienda en edificio',
      };

      await request(app.getHttpServer()).post('/property-types').send(type1);

      await request(app.getHttpServer()).post('/property-types').send(type2);

      const response = await request(app.getHttpServer())
        .get('/property-types')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });
  });

  describe('GET /property-types/:id', () => {
    it('debe obtener un tipo de propiedad por ID', async () => {
      // Crear un tipo de propiedad
      const propertyTypeData = {
        name: 'Casa',
        description: 'Vivienda unifamiliar',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/property-types')
        .send(propertyTypeData);

      const propertyTypeId = createResponse.body.id;

      // Obtener el tipo de propiedad por ID
      const response = await request(app.getHttpServer())
        .get(`/property-types/${propertyTypeId}`)
        .expect(200);

      expect(response.body.id).toBe(propertyTypeId);
      expect(response.body.name).toBe(propertyTypeData.name);
      expect(response.body.description).toBe(propertyTypeData.description);
    });

    it('debe fallar al buscar una ID que no existe', async () => {
      await request(app.getHttpServer())
        .get('/property-types/non-existent-id')
        .expect(404);
    });
  });

  describe('PATCH /property-types/:id', () => {
    it('debe actualizar un tipo de propiedad existente', async () => {
      // Crear un tipo de propiedad
      const propertyTypeData = {
        name: 'Casa',
        description: 'Vivienda unifamiliar',
        hasBedrooms: true,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/property-types')
        .send(propertyTypeData);

      const propertyTypeId = createResponse.body.id;

      // Actualizar el tipo de propiedad
      const updateData = {
        name: 'Casa Unifamiliar',
        description: 'Vivienda unifamiliar actualizada',
        hasBathrooms: true,
      };

      const response = await request(app.getHttpServer())
        .patch(`/property-types/${propertyTypeId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.description).toBe(updateData.description);
      expect(response.body.hasBathrooms).toBe(updateData.hasBathrooms);
      expect(response.body.hasBedrooms).toBe(propertyTypeData.hasBedrooms); // No debería cambiar
    });

    it('debe fallar al actualizar con un nombre duplicado', async () => {
      // Crear dos tipos de propiedad
      const type1 = {
        name: 'Casa',
        description: 'Vivienda unifamiliar',
      };

      const type2 = {
        name: 'Departamento',
        description: 'Vivienda en edificio',
      };

      await request(app.getHttpServer()).post('/property-types').send(type1);

      const createResponse = await request(app.getHttpServer())
        .post('/property-types')
        .send(type2);

      const propertyTypeId = createResponse.body.id;

      // Intentar actualizar el segundo tipo con el nombre del primero
      await request(app.getHttpServer())
        .patch(`/property-types/${propertyTypeId}`)
        .send({ name: 'Casa' })
        .expect(409);
    });
  });

  describe('DELETE /property-types/:id', () => {
    it('debe eliminar un tipo de propiedad existente', async () => {
      // Crear un tipo de propiedad
      const propertyTypeData = {
        name: 'Casa',
        description: 'Vivienda unifamiliar',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/property-types')
        .send(propertyTypeData);

      const propertyTypeId = createResponse.body.id;

      // Eliminar el tipo de propiedad
      await request(app.getHttpServer())
        .delete(`/property-types/${propertyTypeId}`)
        .expect(200);

      // Verificar que el tipo de propiedad fue eliminado
      await request(app.getHttpServer())
        .get(`/property-types/${propertyTypeId}`)
        .expect(404);
    });
  });
});
