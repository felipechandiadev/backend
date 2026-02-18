import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { PasswordRecoveryService } from './password-recovery.service';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ValidatePasswordResetDto } from './dto/validate-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  Audit,
  AuditInterceptor,
} from '../../common/interceptors/audit.interceptor';
import { AuditAction, AuditEntityType } from '../../common/enums/audit.enums';
import { Request } from 'express';

@Controller('auth/password-recovery')
@UseInterceptors(AuditInterceptor)
export class PasswordRecoveryController {
  constructor(
    private readonly passwordRecoveryService: PasswordRecoveryService,
  ) {}

  @Post('request')
  @HttpCode(HttpStatus.ACCEPTED)
  @Audit(
    AuditAction.PASSWORD_RESET_REQUESTED,
    AuditEntityType.USER,
    'Solicitud de recuperación de contraseña recibida',
  )
  async requestReset(
    @Body() requestDto: RequestPasswordResetDto,
    @Req() request: Request,
  ) {
    await this.passwordRecoveryService.requestReset(requestDto.email, {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return {
      message:
        'Si el correo existe en nuestra base, te enviaremos instrucciones para restablecer la contraseña.',
    };
  }

  @Post('validate')
  @Audit(
    AuditAction.SYSTEM_EVENT,
    AuditEntityType.USER,
    'Validación de token de recuperación de contraseña',
  )
  async validateToken(@Body() validateDto: ValidatePasswordResetDto) {
    return await this.passwordRecoveryService.validateToken(validateDto.token);
  }

  @Post('reset')
  @Audit(
    AuditAction.PASSWORD_RESET_COMPLETED,
    AuditEntityType.USER,
    'Restablecimiento de contraseña desde flujo de recuperación',
  )
  async resetPassword(@Body() resetDto: ResetPasswordDto) {
    if (resetDto.password !== resetDto.confirmPassword) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }

    await this.passwordRecoveryService.resetPassword(
      resetDto.token,
      resetDto.password,
    );

    return {
      message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.',
    };
  }
}
