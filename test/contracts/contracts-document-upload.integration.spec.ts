import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { Contract } from '../../src/entities/contract.entity';
import { DocumentType } from '../../src/entities/document-type.entity';
import { User } from '../../src/entities/user.entity';
import { Property } from '../../src/entities/property.entity';
import * as fs from 'fs';
import * as path from 'path';

describe('Contracts Document Upload (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let testContractId: string;
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
        password: 'hashedpassword',
        role: 'ADMIN' as any,
        status: 'ACTIVE' as any,
      } as any);
    }
    adminUserId = testUser!.id;

    // Create a document type for testing
    const documentTypeRepository = dataSource.getRepository(DocumentType);
    let documentType = await documentTypeRepository.findOne({
      where: { name: 'Test Contract Document Type' },
    });
    if (!documentType) {
      documentType = await documentTypeRepository.save({
        name: 'Test Contract Document Type',
        description: 'Document type for contract testing',
        available: true,
      });
    }
    documentTypeId = documentType.id;

    // Create a test property
    const propertyRepository = dataSource.getRepository(Property);
    const testProperty = await propertyRepository.save({
      title: 'Test Property for Contract',
      description: 'Test property description',
      country: 'Test Country',
      price: 100000,
      bedrooms: 3,
      bathrooms: 2,
      area: 150,
      userId: adminUserId,
      status: 'PUBLISHED' as any,
      type: 'HOUSE' as any,
    });
    const testPropertyId = testProperty.id;

    // Create a test contract
    const contractRepository = dataSource.getRepository(Contract);
    const testContract = await contractRepository.save({
      userId: adminUserId,
      propertyId: testPropertyId,
      operation: 'COMPRAVENTA',
      status: 'IN_PROCESS',
      amount: 100000,
      commissionPercent: 0.05,
      commissionAmount: 5000,
      people: [
        {
          personId: 'test-person-id',
          role: 'BUYER' as any,
        },
      ],
      documents: [],
    } as any);
    testContractId = testContract.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /contracts/upload-document - debe subir un documento PDF a un contrato', async () => {
    const testFilePath = path.join(
      process.cwd(),
      '../project/documentsSample/docPdf.pdf',
    );

    // Verificar que el archivo existe
    if (!fs.existsSync(testFilePath)) {
      throw new Error(`Test file not found: ${testFilePath}`);
    }

    const response = await request(app.getHttpServer())
      .post('/contracts/upload-document')
      .field('title', 'Escritura de compraventa')
      .field('documentTypeId', documentTypeId)
      .field('contractId', testContractId)
      .field('uploadedById', adminUserId)
      .field('notes', 'Documento de prueba para contrato')
      .attach('file', testFilePath)
      .expect(201);

    expect(response.body).toHaveProperty('contract');
    expect(response.body).toHaveProperty('document');
    expect(response.body).toHaveProperty('multimedia');
    expect(response.body.document.title).toBe('Escritura de compraventa');
    expect(response.body.document.status).toBe('UPLOADED');
  });

  it('POST /contracts/upload-document - debe subir una imagen de DNI a un contrato', async () => {
    const testFilePath = path.join(
      process.cwd(),
      '../project/documentsSample/dni-front-01.jpg',
    );

    // Verificar que el archivo existe
    if (!fs.existsSync(testFilePath)) {
      throw new Error(`Test file not found: ${testFilePath}`);
    }

    const response = await request(app.getHttpServer())
      .post('/contracts/upload-document')
      .field('title', 'DNI Frontal')
      .field('documentTypeId', documentTypeId)
      .field('contractId', testContractId)
      .field('uploadedById', adminUserId)
      .field('notes', 'Imagen frontal del DNI')
      .attach('file', testFilePath)
      .expect(201);

    expect(response.body).toHaveProperty('contract');
    expect(response.body).toHaveProperty('document');
    expect(response.body).toHaveProperty('multimedia');
    expect(response.body.document.title).toBe('DNI Frontal');
  });

  it('POST /contracts/upload-document - debe actualizar el contrato con el documento subido', async () => {
    const testFilePath = path.join(
      process.cwd(),
      '../project/documentsSample/plano.pdf',
    );

    // Verificar que el archivo existe
    if (!fs.existsSync(testFilePath)) {
      throw new Error(`Test file not found: ${testFilePath}`);
    }

    const response = await request(app.getHttpServer())
      .post('/contracts/upload-document')
      .field('title', 'Plano de la propiedad')
      .field('documentTypeId', documentTypeId)
      .field('contractId', testContractId)
      .field('uploadedById', adminUserId)
      .field('notes', 'Plano arquitectónico de la propiedad')
      .attach('file', testFilePath)
      .expect(201);

    expect(response.body.contract).toHaveProperty('documents');
    expect(Array.isArray(response.body.contract.documents)).toBe(true);

    // Verificar que el documento fue agregado al contrato
    const contractDocuments = response.body.contract.documents;
    const uploadedDoc = contractDocuments.find(
      (doc: any) => doc.documentTypeId === documentTypeId,
    );
    expect(uploadedDoc).toBeDefined();
    expect(uploadedDoc.uploaded).toBe(true);
    expect(uploadedDoc.documentId).toBeDefined();
  });

  it('POST /contracts/upload-document - debe fallar si el tipo de documento no existe', async () => {
    const testFilePath = path.join(
      process.cwd(),
      '../project/documentsSample/sample.pdf',
    );

    await request(app.getHttpServer())
      .post('/contracts/upload-document')
      .field('title', 'Documento de prueba')
      .field('documentTypeId', 'non-existent-id')
      .field('contractId', testContractId)
      .field('uploadedById', adminUserId)
      .attach('file', testFilePath)
      .expect(404);
  });

  it('POST /contracts/upload-document - debe fallar si el contrato no existe', async () => {
    const testFilePath = path.join(
      process.cwd(),
      '../project/documentsSample/sample.pdf',
    );

    await request(app.getHttpServer())
      .post('/contracts/upload-document')
      .field('title', 'Documento de prueba')
      .field('documentTypeId', documentTypeId)
      .field('contractId', 'non-existent-contract-id')
      .field('uploadedById', adminUserId)
      .attach('file', testFilePath)
      .expect(404);
  });
});
