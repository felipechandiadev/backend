import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from '../../entities/notification.entity';
import { User } from '../../entities/user.entity';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { Property } from '../../entities/property.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User, Property]),
    ConfigModule,
    UsersModule,
    MailModule
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, EmailService],
  exports: [NotificationsService, EmailService],
})
export class NotificationsModule {}
