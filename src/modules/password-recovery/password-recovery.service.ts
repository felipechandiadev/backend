import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { PasswordResetToken } from '../../entities/password-reset-token.entity';
import { User } from '../../entities/user.entity';
import { randomBytes } from 'crypto';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../../audit/audit.service';
import { AuditAction, AuditEntityType } from '../../common/enums/audit.enums';

export interface ValidateTokenResult {
  valid: boolean;
  emailHint: string;
  expiresAt: string;
}

@Injectable()
export class PasswordRecoveryService {
  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    @Inject(AuditService)
    private readonly auditService: AuditService,
  ) {}

  async requestReset(
    email: string,
    options: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    const expiresInMinutes = this.getTokenTtlMinutes();

    if (!user) {
      await this.auditService.createAuditLog({
        action: AuditAction.PASSWORD_RESET_REQUESTED,
        entityType: AuditEntityType.USER,
        description: 'Solicitud de recuperación de contraseña para email no asociado a usuario',
        metadata: { email: normalizedEmail },
        success: true,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
      });
      return;
    }

    await this.passwordResetTokenRepository.update(
      {
        userId: user.id,
        consumedAt: IsNull(),
      },
      { consumedAt: new Date() },
    );

    const token = randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const resetEntry = this.passwordResetTokenRepository.create({
      userId: user.id,
      token,
      expiresAt,
      requestedIp: options.ipAddress ?? null,
    });
    await this.passwordResetTokenRepository.save(resetEntry);

    const resetUrl = this.buildResetUrl(token);

    await this.mailService.sendPasswordReset(
      user.email,
      user.personalInfo?.firstName || user.name || 'Usuario',
      resetUrl,
      expiresInMinutes,
    );

    await this.auditService.createAuditLog({
      userId: user.id,
      action: AuditAction.PASSWORD_RESET_REQUESTED,
      entityType: AuditEntityType.USER,
      entityId: resetEntry.id,
      description: 'Token de recuperación de contraseña generado y enviado',
      metadata: {
        expiresAt,
        tokenSuffix: token.slice(-6),
      },
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      success: true,
    });
  }

  async validateToken(token: string): Promise<ValidateTokenResult> {
    const tokenRecord = await this.passwordResetTokenRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!tokenRecord || tokenRecord.consumedAt) {
      throw new BadRequestException('El enlace de recuperación no es válido. Solicita uno nuevo.');
    }

    if (tokenRecord.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('El enlace de recuperación ha expirado. Solicita uno nuevo.');
    }

    return {
      valid: true,
      emailHint: this.maskEmail(tokenRecord.user.email),
      expiresAt: tokenRecord.expiresAt.toISOString(),
    };
  }

  async resetPassword(token: string, password: string): Promise<{ email: string }> {
    const tokenRecord = await this.passwordResetTokenRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!tokenRecord || tokenRecord.consumedAt) {
      throw new BadRequestException('El enlace de recuperación no es válido. Solicita uno nuevo.');
    }

    if (tokenRecord.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('El enlace de recuperación ha expirado. Solicita uno nuevo.');
    }

    tokenRecord.consumedAt = new Date();
    await tokenRecord.user.setPassword(password);
    await this.userRepository.save(tokenRecord.user);
    await this.passwordResetTokenRepository.save(tokenRecord);

    await this.auditService.createAuditLog({
      userId: tokenRecord.user.id,
      action: AuditAction.PASSWORD_RESET_COMPLETED,
      entityType: AuditEntityType.USER,
      entityId: tokenRecord.user.id,
      description: 'Contraseña restablecida mediante flujo de recuperación',
      metadata: { tokenId: tokenRecord.id, tokenSuffix: token.slice(-6) },
      success: true,
    });

    return { email: tokenRecord.user.email };
  }

  private getTokenTtlMinutes(): number {
    const raw = this.configService.get<string>('PASSWORD_RESET_TOKEN_TTL');
    const parsed = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
  }

  private buildResetUrl(token: string): string {
    const frontendBaseUrl =
      this.configService.get<string>('FRONTEND_PUBLIC_URL')?.replace(/\/$/, '') ||
      this.deriveFrontendUrlFromBackend();

    return `${frontendBaseUrl}/portal/reset-password?token=${token}`;
  }

  private deriveFrontendUrlFromBackend(): string {
    const backendUrl = this.configService.get<string>('BACKEND_PUBLIC_URL');
    if (backendUrl) {
      return backendUrl.replace(':3000', ':3001').replace(/\/$/, '');
    }
    return 'http://localhost:3001';
  }

  private maskEmail(email: string): string {
    const [userPart, domainPart] = email.split('@');
    if (!domainPart) {
      return email;
    }

    const visibleChars = Math.min(2, userPart.length);
    const maskedUser = `${userPart.slice(0, visibleChars)}${'*'.repeat(
      Math.max(userPart.length - visibleChars, 1),
    )}`;

    return `${maskedUser}@${domainPart}`;
  }
}
