import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PasswordRecoveryService } from './password-recovery.service';
import { PasswordRecoveryController } from './password-recovery.controller';
import { PasswordResetToken } from '../../entities/password-reset-token.entity';
import { User } from '../../entities/user.entity';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { AuditModule } from '../../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PasswordResetToken, User]),
    ConfigModule,
    UsersModule,
    MailModule,
    AuditModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [PasswordRecoveryController],
  providers: [PasswordRecoveryService],
  exports: [PasswordRecoveryService],
})
export class PasswordRecoveryModule {}
