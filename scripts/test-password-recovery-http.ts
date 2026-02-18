import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import supertest from 'supertest';

import { AppModule } from '../src/app.module';

async function main() {
  let app: INestApplication | null = null;

  try {
    app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
    await app.init();

    const server = app.getHttpServer();
    const response = await supertest(server)
      .post('/auth/password-recovery/request')
      .set('Content-Type', 'application/json')
      .send({ email: 'admin@re.cl' });

    console.log('Status:', response.status);
    console.log('Body:', response.body);
  } catch (error) {
    console.error('Request failed:', error);
  } finally {
    if (app) {
      await app.close();
    }
  }
}

main().catch((error) => {
  console.error('Unexpected failure:', error);
  process.exit(1);
});
