import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Property } from '../src/entities/property.entity';
import { Multimedia } from '../src/entities/multimedia.entity';
import * as fs from 'fs';
import * as path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

async function uploadTestImages() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  // Configurar cliente R2
  const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
  const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
  const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
  const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
  const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    console.error('❌ Faltan credenciales de R2 en el .env');
    process.exit(1);
  }

  const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  // Crear una imagen de placeholder SVG
  const createPlaceholderImage = (title: string, color: string): Buffer => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${adjustColor(color, -30)};stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="48" fill="white" 
              text-anchor="middle" dominant-baseline="middle" opacity="0.9">
          ${title.substring(0, 30)}
        </text>
        <text x="50%" y="60%" font-family="Arial, sans-serif" font-size="24" fill="white" 
              text-anchor="middle" dominant-baseline="middle" opacity="0.7">
          Imagen de prueba
        </text>
      </svg>
    `;
    return Buffer.from(svg, 'utf-8');
  };

  const adjustColor = (hex: string, amount: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  };

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  try {
    const propertyRepo = dataSource.getRepository(Property);
    const multimediaRepo = dataSource.getRepository(Multimedia);

    // Obtener propiedades sin imágenes
    const properties = await propertyRepo.find({
      where: { mainImageUrl: null as any },
      relations: ['multimedia'],
      take: 12,
    });

    console.log(`\n📸 Subiendo imágenes de prueba a ${properties.length} propiedades...\n`);

    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      const color = colors[i % colors.length];
      
      console.log(`\n[${i + 1}/${properties.length}] ${property.title}`);
      
      // Crear imagen placeholder
      const imageBuffer = createPlaceholderImage(property.title, color);
      const filename = `property-img_${Date.now()}_${Math.random().toString(36).substring(7)}.svg`;
      const key = `properties/img/${filename}`;

      // Subir a R2
      console.log(`   📤 Subiendo a R2: ${key}`);
      const putCommand = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: imageBuffer,
        ContentType: 'image/svg+xml',
        // Metadata omitted - avoid encoding issues with special characters
      });

      await s3Client.send(putCommand);
      
      const publicUrl = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${key}` : `https://${R2_BUCKET_NAME}.r2.dev/${key}`;
      console.log(`   ✅ URL pública: ${publicUrl}`);

      // Crear registro de multimedia
      const multimedia = new Multimedia();
      multimedia.type = 'PROPERTY_IMG' as any;
      multimedia.format = 'IMG' as any;
      multimedia.url = publicUrl;
      multimedia.filename = filename;
      multimedia.fileSize = imageBuffer.length;
      multimedia.seoTitle = property.title;
      multimedia.description = `Imagen de prueba para ${property.title}`;

      const savedMultimedia = await multimediaRepo.save(multimedia);
      
      // Actualizar property
      property.mainImageUrl = publicUrl;
      
      await propertyRepo.save(property);
      
      console.log(`   ✅ Propiedad actualizada`);
    }

    console.log(`\n🎉 ¡Proceso completado!`);
    console.log(`   - ${properties.length} propiedades actualizadas`);
    console.log(`   - Imágenes subidas a Cloudflare R2`);
    console.log(`   - URLs públicas disponibles\n`);

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    await app.close();
    process.exit(1);
  }
}

uploadTestImages();
