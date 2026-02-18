// Load environment variables FIRST
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables before any NestJS imports
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = envContent.split('\n').filter(line => line.includes('='));
  envVars.forEach(line => {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').trim();
    if (key && value) {
      process.env[key.trim()] = value;
    }
  });
  console.log('✅ Environment variables loaded manually from .env');
} else {
  console.log('❌ .env file not found at:', envPath);
}

dotenv.config({ path: envPath });

// Now import NestJS modules AFTER environment variables are loaded
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { NotificationsService } from './src/modules/notifications/notifications.service';
import { MailService } from './src/modules/mail/mail.service';

async function testNotificationEmailFlow() {
  console.log('🚀 TESTING NOTIFICATION EMAIL FLOW');
  console.log('=====================================');

  let app;

  // Verificar variables de entorno
  console.log('🔧 Checking environment variables...');
  console.log('MAIL_HOST:', process.env.MAIL_HOST);
  console.log('MAIL_PORT:', process.env.MAIL_PORT);
  console.log('MAIL_USER:', process.env.MAIL_USER ? '***configured***' : 'NOT SET');
  console.log('MAIL_PASS:', process.env.MAIL_PASS ? '***configured***' : 'NOT SET');
  console.log('MAIL_FROM:', process.env.MAIL_FROM);
  console.log('-------------------------------------');

  try {
    // 1. Inicializar aplicación NestJS
    console.log('🔧 Initializing NestJS app...');
    app = await NestFactory.createApplicationContext(AppModule);
    console.log('✅ NestJS app initialized');

    // 2. Obtener servicios
    console.log('🔧 Getting services...');
    const notificationsService = app.get(NotificationsService);
    const mailService = app.get(MailService);
    console.log('✅ Services obtained');

    // 3. Probar envío directo de email
    console.log('📧 Testing direct email sending...');
    try {
      await mailService.testEmail('felipe.chandia.cast@gmail.com');
      console.log('✅ Direct email test successful');
    } catch (error) {
      console.error('❌ Direct email test failed:', error instanceof Error ? error.message : error);
    }

    // 4. Simular creación de notificación de interés
    console.log('📝 Creating interest notification...');
    const notifications = await notificationsService.notifyInterestOnProperty(
      'test-property-123',
      undefined, // sin agente asignado
      undefined, // usuario anónimo
      'Juan Pérez',
      'felipe.chandia.cast@gmail.com',
      'Estoy interesado en esta propiedad. Me gustaría agendar una visita.'
    );

    console.log(`✅ Created ${notifications.length} notifications`);
    notifications.forEach((n: any, i: number) => {
      console.log(`  ${i + 1}. ID: ${n.id}, Type: ${n.type}, Target users: ${n.targetUserIds?.length || 0}`);
    });

    // 5. Esperar un poco para que los correos asíncronos se procesen
    console.log('⏳ Waiting for async email processing...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🎯 Test completed successfully!');
    console.log('Check your email for notifications.');

  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
  } finally {
    if (app) {
      await app.close();
      console.log('🔌 App closed');
    }
  }
}

testNotificationEmailFlow();