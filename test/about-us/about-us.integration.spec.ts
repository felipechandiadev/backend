import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { AboutUs } from '../../src/entities/about-us.entity';

describe('AboutUsController (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let testAboutUsId: string;

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

  it('POST /about-us - debe crear una nueva entrada de información corporativa', async () => {
    const aboutUsData = {
      bio: 'Somos una empresa inmobiliaria líder con más de 15 años de experiencia en el mercado.',
      mision:
        'Brindar servicios inmobiliarios excepcionales que superen las expectativas de nuestros clientes.',
      vision:
        'Ser la empresa inmobiliaria de referencia en el país, reconocida por nuestra integridad y excelencia.',
      multimediaUrl: 'https://example.com/images/company-building.jpg',
    };

    const response = await request(app.getHttpServer())
      .post('/about-us')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(aboutUsData)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.bio).toBe(aboutUsData.bio);
    expect(response.body.mision).toBe(aboutUsData.mision);
    expect(response.body.vision).toBe(aboutUsData.vision);

    testAboutUsId = response.body.id;
  });

  it('GET /about-us - debe obtener la lista de información corporativa', async () => {
    const response = await request(app.getHttpServer())
      .get('/about-us')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBeTruthy();
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('GET /about-us/:id - debe obtener información corporativa por ID', async () => {
    const response = await request(app.getHttpServer())
      .get(`/about-us/${testAboutUsId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.id).toBe(testAboutUsId);
    expect(response.body.bio).toContain('empresa inmobiliaria líder');
    expect(response.body.mision).toContain(
      'servicios inmobiliarios excepcionales',
    );
  });

  it('PATCH /about-us/:id - debe actualizar información corporativa existente', async () => {
    const updateData = {
      bio: 'Somos una empresa inmobiliaria líder con más de 18 años de experiencia en el mercado.',
      vision:
        'Ser la empresa inmobiliaria de referencia en Latinoamérica, reconocida por nuestra integridad y excelencia.',
      multimediaUrl: 'https://example.com/images/company-building-updated.jpg',
    };

    const response = await request(app.getHttpServer())
      .patch(`/about-us/${testAboutUsId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updateData)
      .expect(200);

    expect(response.body.bio).toBe(updateData.bio);
    expect(response.body.vision).toBe(updateData.vision);
    expect(response.body.multimediaUrl).toBe(updateData.multimediaUrl);
  });

  it('DELETE /about-us/:id - debe eliminar información corporativa existente', async () => {
    await request(app.getHttpServer())
      .delete(`/about-us/${testAboutUsId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Verificar que ya no existe
    await request(app.getHttpServer())
      .get(`/about-us/${testAboutUsId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('GET /about-us/:id - debe fallar al buscar un ID que no existe', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    await request(app.getHttpServer())
      .get(`/about-us/${nonExistentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
