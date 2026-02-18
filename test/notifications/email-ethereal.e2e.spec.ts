import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailService } from '../../src/modules/notifications/email.service';
import { SendEmailDto } from '../../src/modules/notifications/dto/send-email.dto';
import * as nodemailer from 'nodemailer';

describe('EmailService E2E - Ethereal Testing', () => {
  let service: EmailService;
  let app: TestingModule;
  let testAccount: any;

  beforeAll(async () => {
    // Crear cuenta de testing con Ethereal
    testAccount = await nodemailer.createTestAccount();

    console.log('🌐 Cuenta de testing Ethereal creada:');
    console.log('   User:', testAccount.user);
    console.log('   Pass:', testAccount.pass);
    console.log('   SMTP Host:', testAccount.smtp.host);
    console.log('   SMTP Port:', testAccount.smtp.port);

    app = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
      ],
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const config = {
                MAIL_HOST: testAccount.smtp.host,
                MAIL_PORT: testAccount.smtp.port,
                MAIL_USER: testAccount.user,
                MAIL_PASS: testAccount.pass,
                MAIL_FROM: 'realestate@example.com',
              };
              return config[key];
            },
          },
        },
      ],
    }).compile();

    service = app.get<EmailService>(EmailService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Email Sending with Ethereal (Testing Service)', () => {
    it('should send test email to felipe.chandia.cast@gmail.com using Ethereal', async () => {
      const emailDto: SendEmailDto = {
        to: 'felipe.chandia.cast@gmail.com',
        subject: '🧪 Test Email - Real Estate Platform (Ethereal Testing)',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
              🏠 Real Estate Platform - EmailService Test
            </h1>
            
            <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <h3 style="color: #92400e; margin-top: 0;">⚠️ Esto es un Test con Ethereal</h3>
              <p style="color: #92400e; margin: 0;">Este correo fue enviado usando Ethereal Mail (servicio de testing). No llegará a tu bandeja real, pero puedes ver el resultado en el link que aparecerá en la consola.</p>
            </div>

            <p>¡Hola Felipe!</p>
            <p>Este es un correo de prueba del <strong>EmailService</strong> del backend.</p>
            
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #374151; margin-top: 0;">📋 Estado del Sistema:</h3>
              <ul>
                <li>✅ EmailService configurado</li>
                <li>✅ Nodemailer funcionando</li>
                <li>✅ Plantillas HTML renderizando</li>
                <li>✅ SMTP connection establecida</li>
              </ul>
            </div>

            <p><strong>Detalles técnicos:</strong></p>
            <ul>
              <li>Servicio: Ethereal Mail (Testing)</li>
              <li>Destinatario real: felipe.chandia.cast@gmail.com</li>
              <li>Fecha: ${new Date().toLocaleString('es-ES')}</li>
              <li>Backend: NestJS + NodeMailer</li>
            </ul>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
              <p>Real Estate Platform - Test Automático</p>
            </div>
          </div>
        `,
      };

      console.log('🚀 Enviando email de prueba con Ethereal...');
      console.log('📧 Destinatario:', emailDto.to);
      console.log('📝 Asunto:', emailDto.subject);

      const result = await service.sendMail(emailDto);

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();

      // Generar URL de previsualización de Ethereal
      const previewUrl = nodemailer.getTestMessageUrl(result);

      console.log('✅ ¡Email enviado exitosamente con Ethereal!');
      console.log('📨 Message ID:', result.messageId);
      console.log('🔗 Ver email en:', previewUrl);
      console.log('');
      console.log(
        '📝 NOTA: Este es un servicio de testing, el email no llegó realmente a felipe.chandia.cast@gmail.com',
      );
      console.log(
        '   Pero puedes ver cómo se vería abriendo el link de arriba',
      );
    }, 30000);

    it('should send property notification via Ethereal', async () => {
      const emailDto: SendEmailDto = {
        to: 'felipe.chandia.cast@gmail.com',
        subject: '🏡 Nueva Propiedad - Las Condes',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #16a34a;">🏡 Nueva Propiedad Disponible</h1>
            
            <p>Estimado <strong>Felipe</strong>,</p>
            
            <p>Hemos encontrado una nueva propiedad que coincide con tus criterios:</p>
            
            <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; background: linear-gradient(135deg, #fafafa 0%, #f0f9ff 100%);">
              <h3 style="color: #374151; margin-top: 0;">🏠 Casa Moderna - Las Condes</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <p><strong>💰 Precio:</strong> $320.000.000</p>
                <p><strong>📐 Superficie:</strong> 140 m²</p>
                <p><strong>🛏️ Dormitorios:</strong> 4</p>
                <p><strong>🚿 Baños:</strong> 3</p>
                <p><strong>🚗 Estacionamientos:</strong> 2</p>
                <p><strong>📍 Comuna:</strong> Las Condes</p>
              </div>
              
              <div style="margin-top: 15px; padding: 10px; background-color: #ecfdf5; border-radius: 6px;">
                <p style="margin: 0; color: #065f46;"><strong>🎯 Match:</strong> 95% compatible con tus preferencias</p>
              </div>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                Ver Detalles Completos
              </a>
            </div>

            <p>¡No dejes pasar esta oportunidad!</p>
            
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 10px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e;"><strong>💡 Tip:</strong> Las propiedades en Las Condes se venden rápido. ¡Agenda una visita pronto!</p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
              <p>Saludos cordiales,<br><strong>Equipo Real Estate Platform</strong></p>
              <p>📅 ${new Date().toLocaleString('es-ES')}</p>
            </div>
          </div>
        `,
      };

      console.log('🏠 Enviando notificación de propiedad...');

      const result = await service.sendMail(emailDto);

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();

      const previewUrl = nodemailer.getTestMessageUrl(result);

      console.log('✅ Notificación enviada!');
      console.log('📨 Message ID:', result.messageId);
      console.log('🔗 Ver email en:', previewUrl);
    }, 30000);
  });

  describe('Template Rendering Test', () => {
    it('should render template with variables correctly', async () => {
      // Test del método renderTemplate privado
      const templateVars = {
        subject: 'Test Subject',
        body: '<p>Test Body Content</p>',
      };

      const renderMethod = service['renderTemplate'];
      const rendered = renderMethod.call(service, templateVars);

      expect(rendered).toContain('Test Subject');
      expect(rendered).toContain('<p>Test Body Content</p>');

      console.log('✅ Template rendering funcionando correctamente');
    });
  });
});
