import 'reflect-metadata';
import * as crypto from 'crypto';

// Polyfill para crypto en contexto global (DEBE estar ANTES de cualquier otro import)
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = crypto.webcrypto;
}

// Añade randomUUID si no está disponible
if (typeof (globalThis.crypto as any).randomUUID !== 'function') {
  (globalThis.crypto as any).randomUUID = () => crypto.randomUUID();
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Configuración para archivos grandes (especialmente videos de 60MB)
  app.use(express.json({ limit: '70mb' }));
  app.use(express.urlencoded({ 
    limit: '70mb', 
    extended: true,
    parameterLimit: 50000 
  }));

  // Configuración de CORS
  app.enableCors({
    origin: [
      'http://localhost:3001', 
      'http://localhost:3000',
      'http://localhost:3002',
      'http://72.61.6.232:3001',
      'http://72.61.6.232:3000',
      'http://72.61.6.232:3002',
    ], // Permitir frontend en múltiples puertos y la IP pública
    credentials: true, // Importante para NextAuth cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Configuración de validación global
  app.useGlobalPipes(new ValidationPipe());

  // Configuración de archivos estáticos
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/public/',
  });

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('Real Estate Platform API')
    .setDescription('API documentation for Real Estate Platform')
    .setVersion('1.0')
    .addTag('multimedia')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
}
bootstrap();
