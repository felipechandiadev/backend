import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';

describe('IdentitiesController (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let testIdentityId: string;

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

  it('POST /identities - debe crear una nueva identidad corporativa', async () => {
    const identityData = {
      name: 'Real Estate Pro',
      address: 'Calle Principal 123, Ciudad',
      phone: '+57 300 123 4567',
      mail: 'contacto@realestatepro.com',
      businessHours:
        'Lunes a Viernes: 8:00 AM - 6:00 PM, Sábado: 9:00 AM - 2:00 PM, Domingo: Cerrado',
      socialMedia: {
        facebook: {
          url: 'https://facebook.com/realestatepro',
          available: true,
        },
        instagram: {
          url: 'https://instagram.com/realestatepro',
          available: true,
        },
        linkedin: {
          url: 'https://linkedin.com/company/realestatepro',
          available: true,
        },
        youtube: { url: 'https://twitter.com/realestatepro', available: true },
      },
      partnerships: [
        {
          name: 'Banco Nacional',
          description: 'Alianza estratégica para financiamiento hipotecario',
        },
        {
          name: 'Constructora XYZ',
          description: 'Desarrollo conjunto de proyectos inmobiliarios',
        },
      ],
    };

    const response = await request(app.getHttpServer())
      .post('/identities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(identityData)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe(identityData.name);
    expect(response.body.mail).toBe(identityData.mail);
    expect(response.body.socialMedia).toBeDefined();
    expect(response.body.partnerships).toBeDefined();

    testIdentityId = response.body.id;
  });

  it('GET /identities - debe obtener la lista de identidades corporativas', async () => {
    const response = await request(app.getHttpServer())
      .get('/identities')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty('id');
    expect(response.body[0]).toHaveProperty('name');
    expect(response.body[0]).toHaveProperty('socialMedia');
  });

  it('GET /identities/:id - debe obtener una identidad corporativa por ID', async () => {
    const response = await request(app.getHttpServer())
      .get(`/identities/${testIdentityId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.id).toBe(testIdentityId);
    expect(response.body.name).toBe('Real Estate Pro');
    expect(response.body.socialMedia.linkedin).toBeDefined();
    expect(response.body.partnerships).toBeDefined();
  });

  it('PATCH /identities/:id - debe actualizar una identidad corporativa existente', async () => {
    const updateData = {
      name: 'Real Estate Pro Plus',
      phone: '+57 300 987 6543',
      mail: 'info@realestatepro.com',
    };

    const response = await request(app.getHttpServer())
      .patch(`/identities/${testIdentityId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updateData)
      .expect(200);

    expect(response.body.name).toBe(updateData.name);
    expect(response.body.phone).toBe(updateData.phone);
    expect(response.body.socialMedia.linkedin).toBeDefined();
  });

  it('DELETE /identities/:id - debe eliminar una identidad corporativa existente', async () => {
    await request(app.getHttpServer())
      .delete(`/identities/${testIdentityId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Verificar que ya no existe
    const response = await request(app.getHttpServer())
      .get(`/identities/${testIdentityId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect(response.body).toHaveProperty('message');
  });

  it('GET /identities/:id - debe fallar al buscar un ID que no existe', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const response = await request(app.getHttpServer())
      .get(`/identities/${nonExistentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect(response.body).toHaveProperty('message');
  });

  it('POST /identities - debe fallar con datos inválidos', async () => {
    const invalidData = {
      name: '', // nombre vacío
      mail: 'invalid-email', // email inválido
      phone: 'invalid-phone', // teléfono inválido
    };

    const response = await request(app.getHttpServer())
      .post('/identities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(invalidData)
      .expect(400);

    expect(response.body).toHaveProperty('message');
  });
});
