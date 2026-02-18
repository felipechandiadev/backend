import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

const OLD_URL = 'https://pub-f23df7eb40cc418aac080ce07e60c1a8.r2.dev';
const NEW_URL = 'https://pub-5ebfb00e2816441a8e34c1ccc36e6195.r2.dev';

async function updateR2Urls() {
  console.log('🔄 Actualizando URLs de R2 en la base de datos...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    // Actualizar tabla properties
    console.log('📝 Actualizando tabla properties...');
    const propertiesResult = await dataSource.query(
      `UPDATE properties 
       SET mainImageUrl = REPLACE(mainImageUrl, ?, ?)
       WHERE mainImageUrl LIKE ?`,
      [OLD_URL, NEW_URL, `${OLD_URL}%`]
    );
    console.log(`   ✅ ${propertiesResult.affectedRows} propiedades actualizadas`);

    // Actualizar tabla multimedia
    console.log('\n📝 Actualizando tabla multimedia...');
    const multimediaResult = await dataSource.query(
      `UPDATE multimedia 
       SET url = REPLACE(url, ?, ?)
       WHERE url LIKE ?`,
      [OLD_URL, NEW_URL, `${OLD_URL}%`]
    );
    console.log(`   ✅ ${multimediaResult.affectedRows} registros multimedia actualizados`);

    // Actualizar tabla slides
    console.log('\n📝 Actualizando tabla slides...');
    const slidesResult = await dataSource.query(
      `UPDATE slides 
       SET imageUrl = REPLACE(imageUrl, ?, ?)
       WHERE imageUrl LIKE ?`,
      [OLD_URL, NEW_URL, `${OLD_URL}%`]
    );
    console.log(`   ✅ ${slidesResult.affectedRows} slides actualizados`);

    // Actualizar tabla articles
    console.log('\n📝 Actualizando tabla articles...');
    const articlesResult = await dataSource.query(
      `UPDATE articles 
       SET multimediaUrl = REPLACE(multimediaUrl, ?, ?)
       WHERE multimediaUrl LIKE ?`,
      [OLD_URL, NEW_URL, `${OLD_URL}%`]
    );
    console.log(`   ✅ ${articlesResult.affectedRows} artículos actualizados`);

    console.log('\n🎉 ¡Todas las URLs han sido actualizadas exitosamente!');
    console.log(`\n📊 Resumen:`);
    console.log(`   - Properties: ${propertiesResult.affectedRows}`);
    console.log(`   - Multimedia: ${multimediaResult.affectedRows}`);
    console.log(`   - Slides: ${slidesResult.affectedRows}`);
    console.log(`   - Articles: ${articlesResult.affectedRows}`);
    console.log(`\n   URL antigua: ${OLD_URL}`);
    console.log(`   URL nueva: ${NEW_URL}`);

  } catch (error) {
    console.error('❌ Error al actualizar URLs:', error);
  } finally {
    await app.close();
  }
}

updateR2Urls();
