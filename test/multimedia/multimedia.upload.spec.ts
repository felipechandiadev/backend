import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as path from 'path';
import { AppModule } from '../../src/app.module';

describe('Multimedia Uploads (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should upload an image successfully', async () => {
    const imagePath = path.join(
      __dirname,
      'multimediaSamples/images/property-img-01.jpg',
    );

    const response = await request(app.getHttpServer())
      .post('/multimedia/upload')
      .field('type', 'PROPERTY_IMG')
      .field('seoTitle', 'Test Image')
      .field('description', 'A test image for property')
      .attach('file', imagePath);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('url');
  });

  it('should upload a video successfully', async () => {
    const videoPath = path.join(
      __dirname,
      'multimediaSamples/videos/property-video-01.mp4',
    );

    const response = await request(app.getHttpServer())
      .post('/multimedia/upload')
      .field('type', 'PROPERTY_VIDEO')
      .field('seoTitle', 'Test Video')
      .field('description', 'A test video for property')
      .attach('file', videoPath);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('url');
  });
});
