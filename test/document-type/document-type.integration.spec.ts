import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';

describe('DocumentTypeController (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let testDocumentTypeId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);

    // Login as admin to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email: 'admin@realestate.com', password: '7890' });

    adminToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /document-types - debe crear un nuevo tipo de documento', async () => {
    const documentTypeData = {
      name: 'Contrato de Venta',
      description: 'Documento legal para transacciones de venta de propiedades',
      available: true,
    };

    const response = await request(app.getHttpServer())
      .post('/document-types')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(documentTypeData)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe(documentTypeData.name);
    expect(response.body.description).toBe(documentTypeData.description);
    expect(response.body.available).toBe(documentTypeData.available);

    testDocumentTypeId = response.body.id;
  });

  it('GET /document-types - debe obtener la lista de tipos de documento', async () => {
    const response = await request(app.getHttpServer())
      .get('/document-types')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBeTruthy();
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('GET /document-types/:id - debe obtener un tipo de documento por ID', async () => {
    const response = await request(app.getHttpServer())
      .get(`/document-types/${testDocumentTypeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.id).toBe(testDocumentTypeId);
    expect(response.body.name).toBe('Contrato de Venta');
    expect(response.body.available).toBe(true);
  });

  it('PATCH /document-types/:id - debe actualizar un tipo de documento existente', async () => {
    const updateData = {
      name: 'Contrato de Venta Actualizado',
      description: 'Documento legal actualizado para transacciones de venta',
      available: false,
    };

    const response = await request(app.getHttpServer())
      .patch(`/document-types/${testDocumentTypeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updateData)
      .expect(200);

    expect(response.body.name).toBe(updateData.name);
    expect(response.body.description).toBe(updateData.description);
    expect(response.body.available).toBe(updateData.available);
  });

  it('DELETE /document-types/:id - debe eliminar un tipo de documento existente', async () => {
    await request(app.getHttpServer())
      .delete(`/document-types/${testDocumentTypeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Verificar que ya no existe
    await request(app.getHttpServer())
      .get(`/document-types/${testDocumentTypeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('GET /document-types/:id - debe fallar al buscar un ID que no existe', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    await request(app.getHttpServer())
      .get(`/document-types/${nonExistentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
