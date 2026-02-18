import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('MAIL_HOST') || 'smtp.gmail.com',
          port: +(configService.get<string>('MAIL_PORT') || '587'),
          secure: false, // true for 465, false for other ports
          auth: {
            user: configService.get<string>('MAIL_USER'),
            pass: configService.get<string>('MAIL_PASS'),
          },
        },
        defaults: {
          from: `"Real Estate Platform" <${configService.get<string>('MAIL_FROM') || 'noreply@example.com'}>`,
        },
        template: {
          dir: join(__dirname, '..', '..', '..', 'src', 'modules', 'mail', 'templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {
  constructor(private configService: ConfigService) {
    console.log('🔧 MAIL CONFIGURATION:');
    console.log('MAIL_HOST:', this.configService.get<string>('MAIL_HOST'));
    console.log('MAIL_PORT:', this.configService.get<string>('MAIL_PORT'));
    const mailUser = this.configService.get<string>('MAIL_USER');
    const mailPass = this.configService.get<string>('MAIL_PASS');
    console.log('MAIL_USER:', mailUser ? '***' + mailUser.slice(-10) : 'undefined');
    console.log('MAIL_PASS:', mailPass ? '***' + mailPass.slice(-4) : 'undefined');
    console.log('MAIL_FROM:', this.configService.get<string>('MAIL_FROM'));
  }
}