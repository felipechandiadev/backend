import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { ArticleCategory } from '../../src/entities/article.entity';

describe('ArticleController (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let testArticleId: string;

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

  it('POST /articles - debe crear un nuevo artículo', async () => {
    const articleData = {
      title: 'Guía para Comprar tu Primera Casa',
      subtitle: 'Todo lo que necesitas saber antes de invertir',
      text: 'Comprar una casa es una de las decisiones más importantes en la vida. En este artículo te explicamos los pasos a seguir, documentos necesarios y consejos para tomar la mejor decisión.',
      multimediaUrl: 'https://example.com/images/guia-compra-casa.jpg',
      category: ArticleCategory.COMPRAR,
    };

    const response = await request(app.getHttpServer())
      .post('/articles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(articleData)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe(articleData.title);
    expect(response.body.subtitle).toBe(articleData.subtitle);
    expect(response.body.text).toBe(articleData.text);
    expect(response.body.multimediaUrl).toBe(articleData.multimediaUrl);
    expect(response.body.category).toBe(articleData.category);

    testArticleId = response.body.id;
  });

  it('GET /articles - debe obtener todos los artículos', async () => {
    const response = await request(app.getHttpServer())
      .get('/articles')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty('id');
    expect(response.body[0]).toHaveProperty('title');
    expect(response.body[0]).toHaveProperty('category');
  });

  it('GET /articles/:id - debe obtener un artículo por ID', async () => {
    const response = await request(app.getHttpServer())
      .get(`/articles/${testArticleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('id', testArticleId);
    expect(response.body).toHaveProperty('title');
    expect(response.body).toHaveProperty('text');
    expect(response.body).toHaveProperty('category');
  });

  it('PATCH /articles/:id - debe actualizar un artículo', async () => {
    const updateData = {
      title: 'Guía Actualizada para Comprar tu Primera Casa',
      subtitle: 'Versión ampliada con más consejos',
      text: 'Comprar una casa es una de las decisiones más importantes en la vida. En esta versión actualizada incluimos consejos adicionales sobre financiamiento y negociación.',
      category: ArticleCategory.INVERSION,
    };

    const response = await request(app.getHttpServer())
      .patch(`/articles/${testArticleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updateData)
      .expect(200);

    expect(response.body).toHaveProperty('id', testArticleId);
    expect(response.body.title).toBe(updateData.title);
    expect(response.body.subtitle).toBe(updateData.subtitle);
    expect(response.body.category).toBe(updateData.category);
  });

  it('DELETE /articles/:id - debe eliminar un artículo (soft delete)', async () => {
    await request(app.getHttpServer())
      .delete(`/articles/${testArticleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Verificar que ya no existe
    const response = await request(app.getHttpServer())
      .get(`/articles/${testArticleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect(response.body).toHaveProperty('message');
  });

  it('GET /articles/:id - debe retornar 404 para artículo eliminado', async () => {
    const response = await request(app.getHttpServer())
      .get(`/articles/${testArticleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect(response.body).toHaveProperty('message');
  });

  it('POST /articles - debe fallar con datos inválidos', async () => {
    const invalidData = {
      title: '', // título vacío
      text: '', // texto vacío
      category: 'INVALID_CATEGORY', // categoría inválida
    };

    const response = await request(app.getHttpServer())
      .post('/articles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(invalidData)
      .expect(400);

    expect(response.body).toHaveProperty('message');
  });

  it('GET /articles/:id - debe retornar 404 para ID inexistente', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const response = await request(app.getHttpServer())
      .get(`/articles/${nonExistentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect(response.body).toHaveProperty('message');
  });
});
