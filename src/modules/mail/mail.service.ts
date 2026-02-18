import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

export interface MailTemplateContext {
  name?: string;
  propertyTitle?: string;
  companyName?: string;
  contactEmail?: string;
  message?: string;
  agentName?: string;
  propertyId?: string;
  [key: string]: any;
}

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  /**
   * Envía correo de confirmación de interés en propiedad
   */
  async sendInterestConfirmation(
    email: string,
    name: string,
    propertyTitle: string,
    message?: string,
    contactPhone?: string
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Hemos recibido tu interés en la propiedad',
        template: 'interest-confirmation',
        context: {
          name,
          propertyTitle,
          message,
          contactPhone,
          companyName: 'Real Estate Platform',
          contactEmail: process.env.MAIL_FROM,
          currentYear: new Date().getFullYear(),
        },
      });
      console.log(`✅ Correo de confirmación enviado a ${email} para propiedad: ${propertyTitle}`);
    } catch (error) {
      console.error(`❌ Error enviando correo de confirmación a ${email}:`, error);
      // En desarrollo lanzamos el error para debugging
      if (process.env.NODE_ENV !== 'production') {
        throw error;
      }
      // En producción no lanzamos para no bloquear notificaciones
    }
  }

  /**
   * Envía notificación a administrador/agente sobre nuevo interés
   */
  async sendAdminNotification(
    email: string,
    recipientName: string,
    interestedUserName: string,
    interestedUserEmail: string,
    interestedUserPhone: string | undefined,
    propertyTitle: string,
    message: string
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Nuevo interés en propiedad: ${propertyTitle}`,
        template: 'admin-notification',
        context: {
          recipientName,
          interestedUserName,
          interestedUserEmail,
          interestedUserPhone,
          propertyTitle,
          message,
          companyName: 'Real Estate Platform',
          currentYear: new Date().getFullYear(),
        },
      });
      console.log(`✅ Notificación enviada a administrador ${email}`);
    } catch (error) {
      console.error(`❌ Error enviando notificación a administrador ${email}:`, error);
      // En desarrollo lanzamos el error para debugging
      if (process.env.NODE_ENV !== 'production') {
        throw error;
      }
    }
  }

  /**
   * Envía notificación a administrador sobre nueva solicitud de publicación
   */
  async sendPropertyRequestAdminNotification(
    email: string,
    recipientName: string,
    interestedUserName: string,
    interestedUserEmail: string,
    propertyTitle: string,
    propertyOperation: string
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Nueva solicitud de publicación: ${propertyTitle}`,
        template: 'property-request-admin',
        context: {
          recipientName,
          interestedUserName,
          interestedUserEmail,
          propertyTitle,
          propertyOperation,
          companyName: 'Real Estate Platform',
          currentYear: new Date().getFullYear(),
          platformUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        },
      });
      console.log(`✅ Notificación de solicitud enviada a administrador ${email}`);
    } catch (error) {
      console.error(`❌ Error enviando notificación de solicitud a administrador ${email}:`, error);
    }
  }

  /**
   * Envía confirmación al usuario sobre su solicitud de publicación
   */
  async sendPropertyRequestUserConfirmation(
    email: string,
    name: string,
    propertyTitle: string
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Hemos recibido tu solicitud de publicación',
        template: 'property-request-user',
        context: {
          name,
          propertyTitle,
          companyName: 'Real Estate Platform',
          currentYear: new Date().getFullYear(),
        },
      });
      console.log(`✅ Confirmación de solicitud enviada a ${email}`);
    } catch (error) {
      console.error(`❌ Error enviando confirmación de solicitud a ${email}:`, error);
    }
  }

  /**
   * Método de prueba para verificar envío de correos (SOLO DESARROLLO)
   */
  async testEmail(email: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🧪 Testing email send to: ${email}`);

      await this.mailerService.sendMail({
        to: email,
        subject: 'Test Email - Real Estate Platform',
        template: 'interest-confirmation',
        context: {
          name: 'Usuario de Prueba',
          propertyTitle: 'Propiedad de Prueba',
          message: 'Este es un mensaje de prueba para verificar el funcionamiento del sistema de correos.',
          companyName: 'Real Estate Platform',
          contactEmail: process.env.MAIL_FROM,
          currentYear: new Date().getFullYear(),
        },
      });

      console.log(`✅ Test email sent successfully to ${email}`);
      return { success: true, message: `Correo enviado exitosamente a ${email}` };
    } catch (error) {
      console.error(`❌ Test email failed for ${email}:`, error);
      return { success: false, message: `Error enviando correo: ${error.message}` };
    }
  }

  /**
   * Envía correo de verificación de email para nuevos usuarios
   */
  async sendEmailVerification(
    email: string,
    firstName: string,
    verificationLink: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Verifica tu correo electrónico - Real Estate Platform',
        template: 'email-verification',
        context: {
          firstName,
          verificationLink,
          companyName: 'Real Estate Platform',
          currentYear: new Date().getFullYear(),
        },
      });
      console.log(
        `✅ Correo de verificación enviado a ${email}`,
      );
    } catch (error) {
      console.error(
        `❌ Error enviando correo de verificación a ${email}:`,
        error,
      );
      if (process.env.NODE_ENV !== 'production') {
        throw error;
      }
    }
  }

  /**
   * Envía correo de bienvenida tras verificar email
   */
  async sendWelcomeEmail(
    email: string,
    firstName: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: '¡Bienvenido a Real Estate Platform!',
        template: 'welcome',
        context: {
          firstName,
          companyName: 'Real Estate Platform',
          currentYear: new Date().getFullYear(),
        },
      });
      console.log(
        `✅ Correo de bienvenida enviado a ${email}`,
      );
    } catch (error) {
      console.error(
        `❌ Error enviando correo de bienvenida a ${email}:`,
        error,
      );
      if (process.env.NODE_ENV !== 'production') {
        throw error;
      }
    }
  }

  /**
   * Envía instrucciones para restablecer contraseña
   */
  async sendPasswordReset(
    email: string,
    firstName: string,
    resetLink: string,
    expiresInMinutes: number,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Restablece tu contraseña - Real Estate Platform',
        template: 'password-reset',
        context: {
          firstName,
          resetLink,
          expiresInMinutes,
          companyName: 'Real Estate Platform',
          currentYear: new Date().getFullYear(),
        },
      });
      console.log(`✅ Correo de recuperación enviado a ${email}`);
    } catch (error) {
      console.error(`❌ Error enviando correo de recuperación a ${email}:`, error);
      if (process.env.NODE_ENV !== 'production') {
        throw error;
      }
    }
  }

  /**
   * Envía notificación de cambio de estado de propiedad
   */
  async sendPropertyStatusChangeNotification(
    email: string,
    name: string,
    propertyTitle: string,
    newStatus: string
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Actualización de tu propiedad: ${propertyTitle}`,
        template: 'property-status-change',
        context: {
          name,
          propertyTitle,
          newStatus,
          companyName: 'Real Estate Platform',
          currentYear: new Date().getFullYear(),
        },
      });
      console.log(`✅ Correo de cambio de estado enviado a ${email} para propiedad: ${propertyTitle}`);
    } catch (error) {
      console.error(`❌ Error enviando correo de cambio de estado a ${email}:`, error);
    }
  }
}