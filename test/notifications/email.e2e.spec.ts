import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from '../../src/modules/notifications/email.service';
import { SendEmailDto } from '../../src/modules/notifications/dto/send-email.dto';

describe('EmailService E2E - Real Email Sending', () => {
  let service: EmailService;
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env',
          isGlobal: true,
        }),
      ],
      providers: [EmailService],
    }).compile();

    service = app.get<EmailService>(EmailService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Real SMTP Email Sending', () => {
    it('should send welcome email to felipe.chandia.cast@gmail.com', async () => {
      const emailDto: SendEmailDto = {
        to: 'felipe.chandia.cast@gmail.com',
        subject: 'Test Email - Real Estate Platform EmailService',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
              🏠 Real Estate Platform
            </h1>
            <p>¡Hola Felipe!</p>
            <p>Este es un correo de prueba enviado desde el <strong>EmailService</strong> del backend de la plataforma inmobiliaria.</p>
            
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #374151; margin-top: 0;">📋 Detalles del Test:</h3>
              <ul>
                <li>✅ EmailService operativo</li>
                <li>✅ Plantilla HTML renderizada correctamente</li>
                <li>✅ Configuración SMTP funcionando</li>
                <li>✅ Integración con nodemailer exitosa</li>
              </ul>
            </div>

            <p>Fecha de envío: <strong>${new Date().toLocaleString('es-ES')}</strong></p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
              <p>Este correo fue enviado automáticamente por el sistema de tests del backend.</p>
              <p>Real Estate Platform Backend - EmailService Test</p>
            </div>
          </div>
        `,
      };

      console.log('🚀 Enviando correo de prueba...');
      console.log('📧 Destinatario:', emailDto.to);
      console.log('📝 Asunto:', emailDto.subject);

      const result = await service.sendMail(emailDto);

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();

      console.log('✅ ¡Correo enviado exitosamente!');
      console.log('📨 Message ID:', result.messageId);
      console.log(
        '📬 Revisa la bandeja de entrada de felipe.chandia.cast@gmail.com',
      );
    }, 30000); // 30 segundos timeout para operaciones de red

    it('should send notification email with template variables', async () => {
      const emailDto: SendEmailDto = {
        to: 'felipe.chandia.cast@gmail.com',
        subject: 'Notificación - Nueva Propiedad Disponible',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #16a34a;">🏡 Nueva Propiedad Disponible</h1>
            
            <p>Estimado/a <strong>Felipe Chandia</strong>,</p>
            
            <p>Te informamos que hay una nueva propiedad que coincide con tus criterios de búsqueda:</p>
            
            <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; background-color: #fafafa;">
              <h3 style="color: #374151; margin-top: 0;">🏠 Casa en Venta - Las Condes</h3>
              <p><strong>Precio:</strong> $280.000.000</p>
              <p><strong>Superficie:</strong> 120 m²</p>
              <p><strong>Dormitorios:</strong> 3</p>
              <p><strong>Baños:</strong> 2</p>
              <p><strong>Estacionamientos:</strong> 2</p>
              <p><strong>Ubicación:</strong> Las Condes, Santiago</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Ver Propiedad Completa
              </a>
            </div>

            <p>¡No pierdas esta oportunidad!</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
              <p>Saludos cordiales,<br>Equipo Real Estate Platform</p>
              <p>📧 Enviado el ${new Date().toLocaleString('es-ES')}</p>
            </div>
          </div>
        `,
      };

      console.log('🏠 Enviando notificación de nueva propiedad...');

      const result = await service.sendMail(emailDto);

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();

      console.log('✅ Notificación enviada exitosamente!');
      console.log('📨 Message ID:', result.messageId);
    }, 30000);

    it('should send plain text email', async () => {
      const emailDto: SendEmailDto = {
        to: 'felipe.chandia.cast@gmail.com',
        subject: 'Test Email - Texto Plano',
        text: `
Hola Felipe,

Este es un correo de prueba en formato de texto plano.

El EmailService del backend está funcionando correctamente y puede enviar tanto correos HTML como de texto plano.

Detalles del sistema:
- Backend: NestJS
- Email Service: Nodemailer  
- SMTP: Gmail
- Fecha: ${new Date().toLocaleString('es-ES')}

Saludos,
Sistema Real Estate Platform
        `,
      };

      console.log('📝 Enviando correo de texto plano...');

      const result = await service.sendMail(emailDto);

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();

      console.log('✅ Correo de texto plano enviado!');
      console.log('📨 Message ID:', result.messageId);
    }, 30000);
  });

  describe('SMTP Configuration Validation', () => {
    it('should have valid SMTP configuration from .env', () => {
      // Verifica que las variables de entorno estén configuradas
      const config = service['configService'];

      expect(config.get('MAIL_HOST')).toBe('smtp.gmail.com');
      expect(config.get('MAIL_PORT')).toBe('587');
      expect(config.get('MAIL_USER')).toBe('felipe.chandia.dev@gmail.com');
      expect(config.get('MAIL_PASS')).toBeDefined();
      expect(config.get('MAIL_FROM')).toBe('felipe.chandia.dev@gmail.com');

      console.log('📧 Configuración SMTP validada:');
      console.log('   Host:', config.get('MAIL_HOST'));
      console.log('   Port:', config.get('MAIL_PORT'));
      console.log('   User:', config.get('MAIL_USER'));
      console.log('   From:', config.get('MAIL_FROM'));
      console.log(
        '   Password configured:',
        config.get('MAIL_PASS') ? '✅' : '❌',
      );
    });

    it('should create transporter without errors', () => {
      // Verifica que el transporter se cree correctamente
      const transporter = service['transporter'];

      expect(transporter).toBeDefined();
      expect(typeof transporter.sendMail).toBe('function');

      console.log('✅ Transporter de nodemailer creado correctamente');
    });
  });
});
