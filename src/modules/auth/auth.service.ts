import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { LoginDto } from '../users/dto/user.dto';
import { CreateUserCommunityDto } from '../users/dto/create-user-community.dto';
import { MailService } from '../mail/mail.service';
import { JweService } from '../../auth/jwe/jwe.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jweService: JweService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async signIn(loginDto: LoginDto) {
    const user = await this.usersService.login(loginDto);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    // Generar el token. En tests usamos JWT simple para que JwtStrategy lo verifique.
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    let access_token: string;
    if (process.env.NODE_ENV === 'test') {
      // Use plain JWT in test env so JwtStrategy (test path) can verify with JWT_SECRET
      const jwt = await import('jsonwebtoken');
      access_token = jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', { expiresIn: '12h' });
    } else {
      // Production / dev: use JWE
      access_token = await this.jweService.encrypt(payload, '12h');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      access_token,
    };
  }

  async signOut(authorizationHeader?: string) {
    if (!authorizationHeader) {
      throw new UnauthorizedException('Token requerido para cerrar sesión');
    }

    const token = authorizationHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      throw new UnauthorizedException('Token inválido');
    }

    try {
      await this.jweService.decrypt(token);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error in signOut:', message);
      throw new UnauthorizedException('Token inválido o expirado');
    }

    return {
      success: true,
      message: 'Sesión cerrada correctamente',
    };
  }

  async refresh(authorizationHeader?: string) {
    if (!authorizationHeader) {
      throw new UnauthorizedException('Token requerido');
    }

    const token = authorizationHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      throw new UnauthorizedException('Token inválido');
    }

    try {
      const payload = await this.jweService.decrypt(token);

      // Re-issue token with same payload
      const newToken = await this.jweService.encrypt(
        { sub: payload.sub, email: payload.email, role: payload.role },
        '12h',
      );

      return { access_token: newToken, expires_in: 12 * 60 * 60 };
    } catch (error) {
      console.log('Error in token refresh:', error instanceof Error ? error.message : error);
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Register a new COMMUNITY user from portal
   * Sends verification email
   */
  async register(
    createUserCommunityDto: CreateUserCommunityDto,
  ): Promise<{
    success: boolean;
    message: string;
    userId?: string;
    error?: string;
  }> {
    try {
      // Create community user
      const user = await this.usersService.createCommunityUser(
        createUserCommunityDto.firstName,
        createUserCommunityDto.lastName,
        createUserCommunityDto.email,
        createUserCommunityDto.password,
      );

      // Build verification link
      // Get frontend URL from environment, fallback to deriving from backend URL
      let frontendUrl = this.configService.get<string>('FRONTEND_PUBLIC_URL');
      
      if (!frontendUrl) {
        // If FRONTEND_PUBLIC_URL is not set, try to derive it from BACKEND_PUBLIC_URL
        const backendUrl = this.configService.get<string>('BACKEND_PUBLIC_URL');
        if (backendUrl) {
          // Replace port 3000 with 3001 for frontend
          frontendUrl = backendUrl.replace(':3000', ':3001');
        } else {
          // Last resort fallback
          frontendUrl = 'http://localhost:3001';
        }
      }
      
      const verificationLink = `${frontendUrl}/portal/verify-email?token=${user.emailVerificationToken}`;

      // Send verification email
      try {
        await this.mailService.sendEmailVerification(
          user.email,
          user.personalInfo?.firstName || 'Usuario',
          verificationLink,
        );
      } catch (mailError) {
        console.error('Error sending verification email:', mailError);
        // Don't throw - email failure shouldn't block registration
        // But log it for debugging
      }

      return {
        success: true,
        message:
          'Usuario registrado exitosamente. Revisa tu correo para verificar tu cuenta.',
        userId: user.id,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error al registrar usuario';
      return {
        success: false,
        message: errorMessage,
        error: errorMessage,
      };
    }
  }

  /**
   * Verify user email using token
   */
  async verifyEmail(token: string): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    try {
      const user = await this.usersService.verifyUserEmail(token);

      // Send welcome email
      try {
        await this.mailService.sendWelcomeEmail(
          user.email,
          user.personalInfo?.firstName || 'Usuario',
        );
      } catch (mailError) {
        console.error('Error sending welcome email:', mailError);
        // Don't throw - verification already succeeded
      }

      return {
        success: true,
        message: 'Correo verificado exitosamente. Ya puedes iniciar sesión.',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error al verificar correo';
      return {
        success: false,
        message: errorMessage,
        error: errorMessage,
      };
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    try {
      const { token } =
        await this.usersService.resendVerificationEmail(email);

      // Build verification link
      // Get frontend URL from environment, fallback to deriving from backend URL
      let frontendUrl = this.configService.get<string>('FRONTEND_PUBLIC_URL');
      
      if (!frontendUrl) {
        // If FRONTEND_PUBLIC_URL is not set, try to derive it from BACKEND_PUBLIC_URL
        const backendUrl = this.configService.get<string>('BACKEND_PUBLIC_URL');
        if (backendUrl) {
          // Replace port 3000 with 3001 for frontend
          frontendUrl = backendUrl.replace(':3000', ':3001');
        } else {
          // Last resort fallback
          frontendUrl = 'http://localhost:3001';
        }
      }
      
      const verificationLink = `${frontendUrl}/portal/verify-email?token=${token}`;

      // Send email
      try {
        const user = await this.usersService.findOne(email);
        await this.mailService.sendEmailVerification(
          email,
          user.personalInfo?.firstName || 'Usuario',
          verificationLink,
        );
      } catch (mailError) {
        console.error('Error sending verification email:', mailError);
      }

      return {
        success: true,
        message: 'Correo de verificación reenviado. Revisa tu bandeja.',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error al reenviar correo';
      return {
        success: false,
        message: errorMessage,
        error: errorMessage,
      };
    }
  }
}
