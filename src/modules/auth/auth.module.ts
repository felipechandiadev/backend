import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JweService } from '../../auth/jwe/jwe.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { forwardRef } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'test-secret',
      signOptions: { expiresIn: '12h' },
    }),
    forwardRef(() => UsersModule),
    MailModule,
  ],
  providers: [JwtStrategy, JwtAuthGuard, JweService, AuthService],
  controllers: [AuthController],
  exports: [JwtModule, JwtAuthGuard, AuthService, JweService],
})
export class AuthModule {}
