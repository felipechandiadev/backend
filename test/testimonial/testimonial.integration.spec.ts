import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { Testimonial } from '../../src/entities/testimonial.entity';

describe('TestimonialController (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let testTestimonialId: string;

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

  it('POST /testimonials - debe crear un nuevo testimonio', async () => {
    const testimonialData = {
      text: 'Excelente servicio, encontraron la casa perfecta para mi familia en tiempo récord.',
      name: 'María González',
    };

    const response = await request(app.getHttpServer())
      .post('/testimonials')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(testimonialData)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.text).toBe(testimonialData.text);
    expect(response.body.name).toBe(testimonialData.name);

    testTestimonialId = response.body.id;
  });

  it('GET /testimonials - debe obtener la lista de testimonios', async () => {
    const response = await request(app.getHttpServer())
      .get('/testimonials')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBeTruthy();
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('GET /testimonials/:id - debe obtener un testimonio por ID', async () => {
    const response = await request(app.getHttpServer())
      .get(`/testimonials/${testTestimonialId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.id).toBe(testTestimonialId);
    expect(response.body.name).toBe('María González');
    expect(response.body.text).toContain('Excelente servicio');
  });

  it('PATCH /testimonials/:id - debe actualizar un testimonio existente', async () => {
    const updateData = {
      text: 'Excelente servicio, encontraron la casa perfecta para mi familia en tiempo récord. ¡Altamente recomendado!',
    };

    const response = await request(app.getHttpServer())
      .patch(`/testimonials/${testTestimonialId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updateData)
      .expect(200);

    expect(response.body.text).toBe(updateData.text);
  });

  it('DELETE /testimonials/:id - debe eliminar un testimonio existente', async () => {
    await request(app.getHttpServer())
      .delete(`/testimonials/${testTestimonialId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Verificar que ya no existe
    await request(app.getHttpServer())
      .get(`/testimonials/${testTestimonialId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('GET /testimonials/:id - debe fallar al buscar un ID que no existe', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    await request(app.getHttpServer())
      .get(`/testimonials/${nonExistentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
