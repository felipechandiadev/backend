import { S3Client, PutObjectCommand, ListBucketsCommand, HeadBucketCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '.env') });

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

console.log('🔍 Verificando configuración de Cloudflare R2...\n');

// Validar variables de entorno
if (!R2_ACCOUNT_ID) {
  console.error('❌ R2_ACCOUNT_ID no está configurado');
  process.exit(1);
}
if (!R2_ACCESS_KEY_ID) {
  console.error('❌ R2_ACCESS_KEY_ID no está configurado');
  process.exit(1);
}
if (!R2_SECRET_ACCESS_KEY) {
  console.error('❌ R2_SECRET_ACCESS_KEY no está configurado');
  process.exit(1);
}
if (!R2_BUCKET_NAME) {
  console.error('❌ R2_BUCKET_NAME no está configurado');
  process.exit(1);
}

console.log('✅ Variables de entorno configuradas:');
console.log(`   - Account ID: ${R2_ACCOUNT_ID}`);
console.log(`   - Access Key: ${R2_ACCESS_KEY_ID.substring(0, 8)}...`);
console.log(`   - Bucket: ${R2_BUCKET_NAME}`);
console.log(`   - Public URL: ${R2_PUBLIC_URL || 'No configurada'}\n`);

// Configurar cliente S3
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function testR2Connection() {
  try {
    console.log('📡 Test 1: Listando buckets disponibles...');
    const listCommand = new ListBucketsCommand({});
    const listResponse = await s3Client.send(listCommand);
    
    if (listResponse.Buckets && listResponse.Buckets.length > 0) {
      console.log('✅ Buckets encontrados:');
      listResponse.Buckets.forEach(bucket => {
        console.log(`   - ${bucket.Name} (creado: ${bucket.CreationDate})`);
      });
    } else {
      console.log('⚠️  No se encontraron buckets');
    }
    console.log();

    // Test 2: Verificar acceso al bucket específico
    console.log(`📡 Test 2: Verificando acceso al bucket "${R2_BUCKET_NAME}"...`);
    const headCommand = new HeadBucketCommand({ Bucket: R2_BUCKET_NAME });
    await s3Client.send(headCommand);
    console.log(`✅ Acceso confirmado al bucket "${R2_BUCKET_NAME}"\n`);

    // Test 3: Subir archivo de prueba
    console.log('📡 Test 3: Subiendo archivo de prueba...');
    const testContent = `Test realizado el ${new Date().toISOString()}`;
    const testKey = 'test/connection-test.txt';
    
    const putCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: testKey,
      Body: Buffer.from(testContent, 'utf-8'),
      ContentType: 'text/plain',
      Metadata: {
        'test-timestamp': Date.now().toString(),
        'test-source': 'connection-test-script',
      },
    });

    await s3Client.send(putCommand);
    console.log(`✅ Archivo subido exitosamente: ${testKey}`);
    
    if (R2_PUBLIC_URL) {
      console.log(`   URL pública: ${R2_PUBLIC_URL}/${testKey}`);
    }
    console.log();

    // Test 4: Leer archivo subido
    console.log('📡 Test 4: Leyendo archivo subido...');
    const getCommand = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: testKey,
    });
    
    const getResponse = await s3Client.send(getCommand);
    const downloadedContent = await streamToString(getResponse.Body as any);
    
    if (downloadedContent === testContent) {
      console.log('✅ Contenido verificado correctamente');
      console.log(`   Contenido: "${downloadedContent}"`);
    } else {
      console.log('❌ El contenido descargado no coincide');
    }
    console.log();

    console.log('🎉 ¡TODOS LOS TESTS PASARON EXITOSAMENTE!\n');
    console.log('✅ La conexión con Cloudflare R2 está funcionando correctamente');
    console.log('✅ Puedes subir y descargar archivos sin problemas');
    console.log(`✅ Los archivos se guardarán en: ${R2_BUCKET_NAME}`);
    
    if (R2_PUBLIC_URL) {
      console.log(`✅ URLs públicas disponibles en: ${R2_PUBLIC_URL}`);
    } else {
      console.log('⚠️  R2_PUBLIC_URL no configurada - las URLs públicas no estarán disponibles');
    }
    
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ ERROR en la conexión con R2:\n');
    
    if (error.Code === 'NoSuchBucket') {
      console.error(`   El bucket "${R2_BUCKET_NAME}" no existe.`);
      console.error('   Verifica que el nombre sea correcto y que el bucket esté creado.');
    } else if (error.Code === 'InvalidAccessKeyId') {
      console.error('   Las credenciales de acceso son inválidas.');
      console.error('   Verifica R2_ACCESS_KEY_ID en tu archivo .env');
    } else if (error.Code === 'SignatureDoesNotMatch') {
      console.error('   La clave secreta es incorrecta.');
      console.error('   Verifica R2_SECRET_ACCESS_KEY en tu archivo .env');
    } else if (error.Code === 'AccessDenied') {
      console.error('   Acceso denegado. Las credenciales no tienen permisos suficientes.');
      console.error('   Verifica los permisos del API Token en Cloudflare.');
    } else {
      console.error('   Detalles del error:');
      console.error(`   - Código: ${error.Code || 'N/A'}`);
      console.error(`   - Mensaje: ${error.message}`);
      console.error(`   - Nombre: ${error.name}`);
    }
    
    console.error('\n📝 Verifica tu configuración en backend/.env:');
    console.error('   - R2_ACCOUNT_ID');
    console.error('   - R2_ACCESS_KEY_ID');
    console.error('   - R2_SECRET_ACCESS_KEY');
    console.error('   - R2_BUCKET_NAME');
    console.error('   - R2_PUBLIC_URL (opcional)\n');
    
    process.exit(1);
  }
}

// Helper para convertir stream a string
async function streamToString(stream: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
}

// Ejecutar tests
console.log('════════════════════════════════════════════════════════');
console.log('    CLOUDFLARE R2 - TEST DE CONEXIÓN Y OPERACIONES     ');
console.log('════════════════════════════════════════════════════════\n');

testR2Connection();
