import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { Document } from '../../src/entities/document.entity';
import { DocumentType } from '../../src/entities/document-type.entity';
import { User } from '../../src/entities/user.entity';
import { DocumentStatus } from '../../src/entities/document.entity';

describe('DocumentController (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let testDocumentId: string;
  let documentTypeId: string;
  let adminUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);

    // Create a test user (check if exists first)
    const userRepository = dataSource.getRepository(User);
    let testUser = await userRepository.findOne({
      where: { username: 'testuser' },
    });
    if (!testUser) {
      testUser = await userRepository.save({
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedpassword', // In real scenario this would be hashed
        role: 'ADMIN' as any,
        status: 'ACTIVE' as any,
      } as any);
    }
    adminUserId = testUser!.id;

    // Create a document type for testing
    const documentTypeRepository = dataSource.getRepository(DocumentType);
    let documentType = await documentTypeRepository.findOne({
      where: { name: 'Test Document Type' },
    });
    if (!documentType) {
      documentType = await documentTypeRepository.save({
        name: 'Test Document Type',
        description: 'Document type for testing',
        available: true,
      });
    }
    documentTypeId = documentType.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /document - debe crear un nuevo documento', async () => {
    const documentData = {
      title: 'Escritura de compraventa',
      documentTypeId: documentTypeId,
      uploadedById: adminUserId,
      notes: 'Documento de prueba',
    };

    const response = await request(app.getHttpServer())
      .post('/document')
      .send(documentData);

    if (response.status !== 201) {
      console.log('Response status:', response.status);
      console.log('Response body:', response.body);
    }

    expect(response.status).toBe(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe(documentData.title);
    expect(response.body.status).toBe('PENDING'); // Default status

    testDocumentId = response.body.id;
  });

  it('GET /document - debe obtener la lista de documentos', async () => {
    const response = await request(app.getHttpServer())
      .get('/document')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('GET /document/:id - debe obtener un documento por ID', async () => {
    const response = await request(app.getHttpServer())
      .get(`/document/${testDocumentId}`)
      .expect(200);

    expect(response.body.id).toBe(testDocumentId);
    expect(response.body.title).toBe('Escritura de compraventa');
  });

  it('PATCH /document/:id - debe actualizar un documento', async () => {
    const updateData = {
      status: DocumentStatus.RECIBIDO,
      notes: 'Documento actualizado para pruebas',
    };

    const response = await request(app.getHttpServer())
      .patch(`/document/${testDocumentId}`)
      .send(updateData)
      .expect(200);
  });

  it('DELETE /document/:id - debe eliminar un documento existente', async () => {
    await request(app.getHttpServer())
      .delete(`/document/${testDocumentId}`)
      .expect(200);

    // Verificar que ya no existe
    await request(app.getHttpServer())
      .get(`/document/${testDocumentId}`)
      .expect(404);
  });

  it('GET /document/:id - debe fallar al buscar un ID que no existe', async () => {
    await request(app.getHttpServer())
      .get('/document/non-existent-id')
      .expect(404);
  });
});
