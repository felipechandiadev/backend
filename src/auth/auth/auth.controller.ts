import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  Headers,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from '../../modules/users/dto/user.dto';
import {
  Audit,
  AuditInterceptor,
} from '../../common/interceptors/audit.interceptor';
import { AuditAction, AuditEntityType } from '../../common/enums/audit.enums';

@Controller('auth')
@UseInterceptors(AuditInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-in')
  @Audit(AuditAction.LOGIN, AuditEntityType.USER, 'User login attempt')
  async signIn(@Body() loginDto: LoginDto) {
    return await this.authService.signIn(loginDto);
  }

  @Post('sign-out')
  @Audit(AuditAction.LOGOUT, AuditEntityType.USER, 'User logout request')
  async signOut(@Headers('authorization') authorization?: string) {
    return await this.authService.signOut(authorization);
  }

  @Post('refresh')
  @Audit(AuditAction.READ, AuditEntityType.USER, 'Refresh access token')
  async refresh(@Headers('authorization') authorization?: string) {
    console.log('[AuthController.refresh] Authorization header received:', authorization ? `${authorization.substring(0, 20)}...` : 'none');
    return await this.authService.refresh(authorization);
  }
}
