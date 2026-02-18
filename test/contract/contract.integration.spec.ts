import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { User, UserRole, UserStatus } from '../../src/entities/user.entity';
import { Property } from '../../src/entities/property.entity';
import { Person } from '../../src/entities/person.entity';
import { Contract } from '../../src/entities/contract.entity';

describe('ContractController (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let testContractId: string;

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

  it('POST /contracts - debe crear un nuevo contrato', async () => {
    // Obtener un usuario, propiedad y persona existentes de la base de datos
    const userRepository = dataSource.getRepository(User);
    const propertyRepository = dataSource.getRepository(Property);
    const personRepository = dataSource.getRepository(Person);

    let user = await userRepository.findOne({ where: {} });
    let property = await propertyRepository.findOne({ where: {} });
    let person = await personRepository.findOne({ where: {} });

    expect(user).toBeDefined();
    expect(property).toBeDefined();
    expect(person).toBeDefined();

    // Create a user if none exists to make the test self-contained
    if (!user) {
      const unique = Date.now().toString();
      user = userRepository.create({
        username: `contract_user_${unique}`,
        email: `contract_user_${unique}@example.com`,
        password: 'x',
        role: UserRole.COMMUNITY,
        status: UserStatus.ACTIVE,
      } as any) as any;
      user = await userRepository.save(user as any);
    }

    // Create a property if none exists
    if (!property) {
      property = propertyRepository.create({
        title: 'Test Property',
        description: 'Property for contract test',
        status: 'PUBLISHED',
        operationType: 'SALE',
        creatorUser: user,
        priceCLP: 100000,
        priceUF: 0,
      } as any) as any;
      property = await propertyRepository.save(property as any);
    }

    // Create a person if none exists
    if (!person) {
      person = personRepository.create({
        firstName: 'Test',
        lastName: 'Person',
        dni: `12345678-${Date.now()}`,
        email: `person_${Date.now()}@example.com`,
        phone: '+56912345678',
      } as any) as any;
      person = await personRepository.save(person as any);
    }

    const contractData = {
      userId: user!.id,
      propertyId: property!.id,
      operation: 'COMPRAVENTA',
      status: 'IN_PROCESS',
      amount: 250000000,
      commissionPercent: 0.05,
      people: [{ personId: person!.id, role: 'BUYER' }],
      description: 'Contrato de prueba para integración',
    };

    const response = await request(app.getHttpServer())
      .post('/contracts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(contractData)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.operation).toBe(contractData.operation);
    expect(response.body.status).toBe(contractData.status);
    expect(response.body.amount).toBe(contractData.amount);
    expect(response.body.commissionPercent).toBe(
      contractData.commissionPercent,
    );
    expect(response.body.commissionAmount).toBe(12500000); // 5% of 250M

    testContractId = response.body.id;
  });

  it('GET /contracts - debe obtener la lista de contratos', async () => {
    const response = await request(app.getHttpServer())
      .get('/contracts')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBeTruthy();
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('GET /contracts/:id - debe obtener un contrato por ID', async () => {
    const response = await request(app.getHttpServer())
      .get(`/contracts/${testContractId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.id).toBe(testContractId);
    expect(response.body.operation).toBe('COMPRAVENTA');
    expect(response.body.status).toBe('IN_PROCESS');
    expect(response.body.amount).toBe(250000000);
    expect(response.body.commissionPercent).toBe(0.05);
    expect(response.body.commissionAmount).toBe(12500000);
  });

  it('PATCH /contracts/:id - debe actualizar un contrato existente', async () => {
    const updateData = {
      status: 'CLOSED',
      description: 'Contrato actualizado para pruebas',
    };

    const response = await request(app.getHttpServer())
      .patch(`/contracts/${testContractId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updateData)
      .expect(200);

    expect(response.body.status).toBe(updateData.status);
    expect(response.body.description).toBe(updateData.description);
  });

  it('DELETE /contracts/:id - debe eliminar un contrato existente', async () => {
    await request(app.getHttpServer())
      .delete(`/contracts/${testContractId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Verificar que ya no existe
    await request(app.getHttpServer())
      .get(`/contracts/${testContractId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('GET /contracts/:id - debe fallar al buscar un ID que no existe', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    await request(app.getHttpServer())
      .get(`/contracts/${nonExistentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
