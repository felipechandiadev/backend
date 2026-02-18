import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../../modules/users/users.module';
import { JweModule } from '../jwe/jwe.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from '../../modules/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    JweModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
