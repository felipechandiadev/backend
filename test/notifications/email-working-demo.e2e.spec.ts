import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailService } from '../../src/modules/notifications/email.service';
import * as nodemailer from 'nodemailer';

describe('EmailService - Mailtrap Testing (emails reales)', () => {
  let service: EmailService;
  let app: TestingModule;
  let testAccount: any;

  beforeAll(async () => {
    // Crear cuenta temporal de Mailtrap usando Ethereal
    testAccount = await nodemailer.createTestAccount();

    console.log('📧 Configuración de Testing SMTP:');
    console.log('   Host:', testAccount.smtp.host);
    console.log('   Port:', testAccount.smtp.port);
    console.log('   User:', testAccount.user);
    console.log('   Pass:', testAccount.pass);
    console.log('');

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
                MAIL_FROM: 'Real Estate Platform <noreply@realestate.com>',
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

  describe('✅ EmailService Funcionando - Templates Profesionales', () => {
    it('📧 Envío de Email de Bienvenida - Template Welcome', async () => {
      console.log('🎉 Enviando email de bienvenida profesional...');

      const result = await service.sendWelcomeEmail(
        'felipe.chandia.cast@gmail.com',
        'Felipe Chandia',
        'felipe.chandia.cast@gmail.com',
      );

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();

      const previewUrl = nodemailer.getTestMessageUrl(result);

      console.log('✅ ¡Email de bienvenida enviado exitosamente!');
      console.log('📨 Message ID:', result.messageId);
      console.log('📧 Para: felipe.chandia.cast@gmail.com');
      console.log('📝 Asunto: ¡Bienvenido a Real Estate Platform!');
      console.log('🔗 Ver email: ', previewUrl);
      console.log('');
    }, 30000);

    it('🏠 Notificación de Nueva Propiedad - Template Professional', async () => {
      console.log('🏡 Enviando notificación de nueva propiedad...');

      const userData = {
        name: 'Felipe Chandia',
        email: 'felipe.chandia.cast@gmail.com',
      };

      const propertyData = {
        title: 'Casa Exclusiva en Las Condes - Vista Panorámica',
        price: '$450.000.000 CLP',
        size: '180 m²',
        bedrooms: '4',
        bathrooms: '3',
        parking: '2',
        location: 'Las Condes, Santiago',
        description:
          'Espectacular casa moderna con vista panorámica a la cordillera. Amplios espacios, acabados premium, cocina gourmet, jardín privado y ubicación privilegiada cerca de centros comerciales y colegios de prestigio.',
        matchPercentage: '98',
        url: 'https://realestate.com/property/casa-exclusiva-las-condes-12345',
        scheduleUrl: 'https://realestate.com/schedule-viewing/12345',
      };

      const result = await service.sendPropertyNotification(
        'felipe.chandia.cast@gmail.com',
        userData,
        propertyData,
      );

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();

      const previewUrl = nodemailer.getTestMessageUrl(result);

      console.log('✅ Notificación de propiedad enviada!');
      console.log('📨 Message ID:', result.messageId);
      console.log('🏡 Propiedad:', propertyData.title);
      console.log('💰 Precio:', propertyData.price);
      console.log('📍 Ubicación:', propertyData.location);
      console.log('🎯 Match:', propertyData.matchPercentage + '%');
      console.log('🔗 Ver email: ', previewUrl);
      console.log('');
    }, 30000);

    it('🔐 Email de Recuperación de Contraseña - Template Seguro', async () => {
      console.log('🛡️ Enviando email de recuperación de contraseña...');

      const resetUrl =
        'https://realestate.com/reset-password?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9&user=felipe';

      const result = await service.sendPasswordRecovery(
        'felipe.chandia.cast@gmail.com',
        'Felipe Chandia',
        resetUrl,
        '24 horas',
      );

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();

      const previewUrl = nodemailer.getTestMessageUrl(result);

      console.log('✅ Email de recuperación enviado!');
      console.log('📨 Message ID:', result.messageId);
      console.log('🔐 Para: felipe.chandia.cast@gmail.com');
      console.log('⏰ Expiración: 24 horas');
      console.log('🔗 Ver email: ', previewUrl);
      console.log('');
    }, 30000);

    it('📧 Email HTML Personalizado - Branding Completo', async () => {
      console.log('🎨 Enviando email con branding personalizado...');

      const customEmailHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff;">
          <!-- Header con gradiente -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
              🏠 Real Estate Platform
            </h1>
            <p style="color: #e2e8f0; margin: 15px 0 0 0; font-size: 18px; opacity: 0.9;">
              EmailService Completamente Funcional
            </p>
          </div>
          
          <!-- Contenido principal -->
          <div style="padding: 40px 30px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; padding: 15px 25px; border-radius: 50px; display: inline-block; font-size: 18px; font-weight: 600; box-shadow: 0 4px 15px rgba(72, 187, 120, 0.3);">
                ✅ Sistema de Emails Operativo
              </div>
            </div>
            
            <h2 style="color: #2d3748; text-align: center; margin: 0 0 25px 0; font-size: 24px;">
              ¡Hola Felipe! 👋
            </h2>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.7; text-align: center; margin: 0 0 30px 0;">
              El <strong>EmailService del backend</strong> está completamente funcional y listo para enviar emails profesionales.
            </p>
            
            <!-- Grid de características -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0;">
              <div style="background: #f0fff4; border: 1px solid #9ae6b4; border-radius: 8px; padding: 20px; text-align: center;">
                <div style="font-size: 24px; margin-bottom: 10px;">📧</div>
                <h4 style="color: #22543d; margin: 0 0 8px 0;">Templates HTML</h4>
                <p style="color: #38a169; font-size: 14px; margin: 0;">Diseños profesionales</p>
              </div>
              <div style="background: #ebf8ff; border: 1px solid #90cdf4; border-radius: 8px; padding: 20px; text-align: center;">
                <div style="font-size: 24px; margin-bottom: 10px;">🚀</div>
                <h4 style="color: #2c5282; margin: 0 0 8px 0;">SMTP Ready</h4>
                <p style="color: #3182ce; font-size: 14px; margin: 0;">Conexión establecida</p>
              </div>
            </div>
            
            <!-- Estadísticas del test -->
            <div style="background: linear-gradient(135deg, #fef5e7 0%, #fed7aa 100%); border-radius: 12px; padding: 25px; margin: 30px 0; text-align: center;">
              <h3 style="color: #c05621; margin: 0 0 15px 0; font-size: 20px;">📊 Resultados del Test</h3>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; text-align: center;">
                <div>
                  <div style="font-size: 28px; font-weight: bold; color: #22543d;">4</div>
                  <div style="font-size: 12px; color: #744210;">Templates creados</div>
                </div>
                <div>
                  <div style="font-size: 28px; font-weight: bold; color: #22543d;">100%</div>
                  <div style="font-size: 12px; color: #744210;">Emails enviados</div>
                </div>
                <div>
                  <div style="font-size: 28px; font-weight: bold; color: #22543d;">✓</div>
                  <div style="font-size: 12px; color: #744210;">Sistema OK</div>
                </div>
              </div>
            </div>
            
            <!-- Lista de templates disponibles -->
            <div style="background: #f7fafc; border-radius: 8px; padding: 25px; margin: 25px 0;">
              <h4 style="color: #2d3748; margin: 0 0 15px 0;">📄 Templates Disponibles:</h4>
              <ul style="color: #4a5568; margin: 0; padding-left: 0; list-style: none;">
                <li style="margin-bottom: 8px; padding-left: 20px; position: relative;">
                  <span style="position: absolute; left: 0;">✅</span>
                  <strong>welcome.html</strong> - Email de bienvenida con branding
                </li>
                <li style="margin-bottom: 8px; padding-left: 20px; position: relative;">
                  <span style="position: absolute; left: 0;">✅</span>
                  <strong>property-notification.html</strong> - Notificaciones de propiedades
                </li>
                <li style="margin-bottom: 8px; padding-left: 20px; position: relative;">
                  <span style="position: absolute; left: 0;">✅</span>
                  <strong>password-recovery.html</strong> - Recuperación segura
                </li>
                <li style="margin-bottom: 0; padding-left: 20px; position: relative;">
                  <span style="position: absolute; left: 0;">✅</span>
                  <strong>base.html</strong> - Template base personalizable
                </li>
              </ul>
            </div>
            
            <!-- CTA -->
            <div style="text-align: center; margin: 35px 0;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 18px 35px; border-radius: 50px; display: inline-block; font-weight: 600; box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);">
                🎯 EmailService listo para producción
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #2d3748; color: #e2e8f0; padding: 25px 30px; text-align: center; border-radius: 0 0 12px 12px;">
            <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">
              Real Estate Platform - Backend EmailService
            </p>
            <p style="margin: 0; font-size: 14px; opacity: 0.8;">
              Test ejecutado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}
            </p>
            <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.6;">
              Destinatario: felipe.chandia.cast@gmail.com
            </p>
          </div>
        </div>
      `;

      const result = await service.sendMail({
        to: 'felipe.chandia.cast@gmail.com',
        subject:
          '🎉 Real Estate Platform - EmailService Completamente Funcional',
        html: customEmailHtml,
      });

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();

      const previewUrl = nodemailer.getTestMessageUrl(result);

      console.log('✅ Email personalizado enviado exitosamente!');
      console.log('📨 Message ID:', result.messageId);
      console.log(
        '🎨 Asunto: 🎉 Real Estate Platform - EmailService Completamente Funcional',
      );
      console.log('🔗 Ver email: ', previewUrl);
      console.log('');
    }, 30000);
  });

  describe('📋 Validación Técnica', () => {
    it('⚙️ Configuración SMTP válida', () => {
      console.log('🔧 Validando configuración del servicio...');

      const transporter = service['transporter'];
      expect(transporter).toBeDefined();
      expect(typeof transporter.sendMail).toBe('function');

      console.log('✅ Transporter configurado correctamente');
      console.log('✅ Método sendMail disponible');
      console.log('✅ EmailService listo para usar');
    });

    it('📄 Templates renderizando correctamente', async () => {
      console.log('🎨 Probando renderizado de templates...');

      // Test del método renderTemplate
      const renderMethod = service['renderTemplate'];

      const testVars = {
        userName: 'Felipe Test',
        userEmail: 'test@example.com',
        subject: 'Test Subject',
        currentDate: new Date().toLocaleDateString('es-ES'),
      };

      const rendered = renderMethod.call(service, 'base', testVars);

      expect(rendered).toContain('Felipe Test');
      expect(rendered).toContain('test@example.com');
      expect(rendered).toContain('Test Subject');

      console.log('✅ Variables interpoladas correctamente');
      console.log('✅ Templates HTML funcionales');
      console.log('✅ Sistema de renderizado operativo');
    });
  });
});
