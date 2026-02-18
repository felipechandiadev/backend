import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SendEmailDto } from './dto/send-email.dto';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('MAIL_HOST');
    const port = Number(this.configService.get<number>('MAIL_PORT') || 587);
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASS');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  private renderTemplate(
    templateName: string,
    vars: Record<string, string>,
  ): string {
    const tplPath = join(__dirname, 'templates', `${templateName}.html`);
    let tpl = readFileSync(tplPath, 'utf8');

    // Replace template variables
    Object.keys(vars).forEach((k) => {
      tpl = tpl.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), vars[k]);
    });

    return tpl;
  }

  // Method to render base template (backward compatibility)
  private renderBaseTemplate(vars: Record<string, string>): string {
    return this.renderTemplate('base', vars);
  }

  async sendMail(dto: SendEmailDto, templateName = 'base') {
    // Use provided HTML or render from template
    let html = dto.html;
    if (!html) {
      const templateVars = {
        subject: dto.subject || '',
        body: dto.text || '',
        ...(dto.templateVariables || {}),
      };
      html = this.renderTemplate(templateName, templateVars);
    }

    const mailOptions: nodemailer.SendMailOptions = {
      from:
        this.configService.get<string>('MAIL_FROM') || 'no-reply@example.com',
      to: dto.to,
      subject: dto.subject,
      html,
      text: dto.text,
    };

    const info = await this.transporter.sendMail(mailOptions);
    this.logger.debug(`Email sent: ${info.messageId}`);
    return info;
  }

  // Convenience methods for specific email types
  async sendWelcomeEmail(to: string, userName: string, userEmail: string) {
    return this.sendMail(
      {
        to,
        subject: '¡Bienvenido a Real Estate Platform!',
        templateVariables: {
          userName,
          userEmail,
          platformUrl: 'https://realestate.com',
          currentDate: new Date().toLocaleDateString('es-ES'),
        },
      },
      'welcome',
    );
  }

  async sendPropertyNotification(to: string, userData: any, propertyData: any) {
    return this.sendMail(
      {
        to,
        subject: `🏡 Nueva Propiedad: ${propertyData.title}`,
        templateVariables: {
          userName: userData.name,
          userEmail: userData.email,
          propertyTitle: propertyData.title,
          propertyPrice: propertyData.price,
          propertySize: propertyData.size,
          propertyBedrooms: propertyData.bedrooms,
          propertyBathrooms: propertyData.bathrooms,
          propertyParking: propertyData.parking,
          propertyLocation: propertyData.location,
          propertyDescription: propertyData.description,
          matchPercentage: propertyData.matchPercentage || '95',
          propertyUrl: propertyData.url || '#',
          scheduleViewingUrl: propertyData.scheduleUrl || '#',
          currentDate: new Date().toLocaleDateString('es-ES'),
        },
      },
      'property-notification',
    );
  }

  async sendPasswordRecovery(
    to: string,
    userName: string,
    resetUrl: string,
    expirationTime = '24 horas',
  ) {
    return this.sendMail(
      {
        to,
        subject: 'Recuperación de Contraseña - Real Estate Platform',
        templateVariables: {
          userName,
          userEmail: to,
          resetPasswordUrl: resetUrl,
          expirationTime,
          currentDate: new Date().toLocaleDateString('es-ES'),
        },
      },
      'password-recovery',
    );
  }
}
