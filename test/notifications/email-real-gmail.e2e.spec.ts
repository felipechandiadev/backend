import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from '../../src/modules/notifications/email.service';

describe('EmailService - Real Gmail Delivery to Felipe', () => {
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

  describe('Real Email Delivery Tests', () => {
    it('should send welcome email to felipe.chandia.cast@gmail.com', async () => {
      console.log('🎉 Enviando email de bienvenida...');

      try {
        const result = await service.sendWelcomeEmail(
          'felipe.chandia.cast@gmail.com',
          'Felipe Chandia',
          'felipe.chandia.cast@gmail.com',
        );

        expect(result).toBeDefined();
        expect(result.messageId).toBeDefined();

        console.log('✅ Email de bienvenida enviado exitosamente!');
        console.log('📨 Message ID:', result.messageId);
        console.log('📧 Destinatario: felipe.chandia.cast@gmail.com');
        console.log('📝 Asunto: ¡Bienvenido a Real Estate Platform!');
        console.log('');
        console.log('🔍 Revisa tu bandeja de entrada en Gmail');
      } catch (error) {
        console.error('❌ Error enviando email:', error.message);
        throw error;
      }
    }, 30000);

    it('should send property notification to felipe.chandia.cast@gmail.com', async () => {
      console.log('🏠 Enviando notificación de nueva propiedad...');

      const userData = {
        name: 'Felipe Chandia',
        email: 'felipe.chandia.cast@gmail.com',
      };

      const propertyData = {
        title: 'Casa Moderna en Las Condes',
        price: '$320.000.000',
        size: '140 m²',
        bedrooms: '4',
        bathrooms: '3',
        parking: '2',
        location: 'Las Condes, Santiago',
        description:
          'Hermosa casa moderna con acabados de primera calidad, amplio jardín y excelente ubicación cerca de centros comerciales y colegios. Ideal para familias que buscan comodidad y estilo.',
        matchPercentage: '96',
        url: 'https://realestate.com/property/12345',
        scheduleUrl: 'https://realestate.com/schedule/12345',
      };

      try {
        const result = await service.sendPropertyNotification(
          'felipe.chandia.cast@gmail.com',
          userData,
          propertyData,
        );

        expect(result).toBeDefined();
        expect(result.messageId).toBeDefined();

        console.log('✅ Notificación de propiedad enviada exitosamente!');
        console.log('📨 Message ID:', result.messageId);
        console.log('📧 Destinatario: felipe.chandia.cast@gmail.com');
        console.log('🏡 Propiedad:', propertyData.title);
        console.log('💰 Precio:', propertyData.price);
        console.log('');
        console.log('🔍 Revisa tu bandeja de entrada en Gmail');
      } catch (error) {
        console.error('❌ Error enviando notificación:', error.message);
        throw error;
      }
    }, 30000);

    it('should send password recovery email to felipe.chandia.cast@gmail.com', async () => {
      console.log('🔐 Enviando email de recuperación de contraseña...');

      const resetUrl =
        'https://realestate.com/reset-password?token=abc123xyz789';

      try {
        const result = await service.sendPasswordRecovery(
          'felipe.chandia.cast@gmail.com',
          'Felipe Chandia',
          resetUrl,
          '24 horas',
        );

        expect(result).toBeDefined();
        expect(result.messageId).toBeDefined();

        console.log('✅ Email de recuperación enviado exitosamente!');
        console.log('📨 Message ID:', result.messageId);
        console.log('📧 Destinatario: felipe.chandia.cast@gmail.com');
        console.log('🔗 Reset URL:', resetUrl);
        console.log('');
        console.log('🔍 Revisa tu bandeja de entrada en Gmail');
      } catch (error) {
        console.error(
          '❌ Error enviando email de recuperación:',
          error.message,
        );
        throw error;
      }
    }, 30000);

    it('should send custom HTML email to felipe.chandia.cast@gmail.com', async () => {
      console.log('📄 Enviando email personalizado con HTML...');

      const customHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0;">🏠 Real Estate Platform</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Test de Email Personalizado</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
            <h2 style="color: #2d3748; margin-top: 0;">¡Hola Felipe!</h2>
            
            <p style="color: #4a5568; line-height: 1.6;">
              Este es un <strong>email de prueba personalizado</strong> enviado desde el EmailService del backend.
            </p>
            
            <div style="background: #f7fafc; border-left: 4px solid #4299e1; padding: 15px; margin: 20px 0;">
              <h3 style="color: #2b6cb0; margin-top: 0;">✅ Sistema Funcionando</h3>
              <ul style="color: #4a5568; margin-bottom: 0;">
                <li>EmailService operativo</li>
                <li>Templates HTML renderizando</li>
                <li>SMTP connection establecida</li>
                <li>Delivery a Gmail exitoso</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 25px 0;">
              <div style="background: #48bb78; color: white; padding: 15px; border-radius: 6px; display: inline-block;">
                🎯 ¡EmailService completamente funcional!
              </div>
            </div>
            
            <p style="color: #718096; font-size: 14px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              Enviado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}
            </p>
          </div>
        </div>
      `;

      try {
        const result = await service.sendMail({
          to: 'felipe.chandia.cast@gmail.com',
          subject: '🧪 Test EmailService - HTML Personalizado',
          html: customHtml,
        });

        expect(result).toBeDefined();
        expect(result.messageId).toBeDefined();

        console.log('✅ Email personalizado enviado exitosamente!');
        console.log('📨 Message ID:', result.messageId);
        console.log('📧 Destinatario: felipe.chandia.cast@gmail.com');
        console.log('📝 Asunto: 🧪 Test EmailService - HTML Personalizado');
        console.log('');
        console.log('🔍 Revisa tu bandeja de entrada en Gmail');
      } catch (error) {
        console.error('❌ Error enviando email personalizado:', error.message);
        throw error;
      }
    }, 30000);
  });

  describe('Configuration Validation', () => {
    it('should validate Gmail SMTP configuration', () => {
      const config = service['configService'];

      console.log('⚙️ Validando configuración SMTP...');
      console.log('   Host:', config.get('MAIL_HOST'));
      console.log('   Port:', config.get('MAIL_PORT'));
      console.log('   User:', config.get('MAIL_USER'));
      console.log('   From:', config.get('MAIL_FROM'));
      console.log(
        '   Password configured:',
        config.get('MAIL_PASS') ? '✅ Sí' : '❌ No',
      );

      expect(config.get('MAIL_HOST')).toBe('smtp.gmail.com');
      expect(config.get('MAIL_PORT')).toBe('587');
      expect(config.get('MAIL_USER')).toBe('felipe.chandia.dev@gmail.com');
      expect(config.get('MAIL_FROM')).toBe('felipe.chandia.dev@gmail.com');
      expect(config.get('MAIL_PASS')).toBeDefined();

      console.log('✅ Configuración SMTP válida');
    });
  });
});
