import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  Headers,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from '../users/dto/user.dto';
import { CreateUserCommunityDto } from '../users/dto/create-user-community.dto';
import {
  Audit,
  AuditInterceptor,
} from '../../common/interceptors/audit.interceptor';
import { AuditAction, AuditEntityType } from '../../common/enums/audit.enums';

@Controller('auth')
@ApiTags('Authentication')
@UseInterceptors(AuditInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Sign in with email and password
   * Returns access token, user details, and other session info
   */
  @Post('sign-in')
  @ApiOperation({ summary: 'Sign in user with credentials' })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns access token and user info',
    schema: {
      example: {
        access_token: 'eyJhbGci...',
        user: {
          id: 'uuid',
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'USER',
        },
        expiresIn: 43200,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - missing or invalid email/password',
  })
  @ApiBody({ type: LoginDto })
  @Audit(AuditAction.LOGIN, AuditEntityType.USER, 'User login attempt')
  async signIn(@Body(ValidationPipe) loginDto: LoginDto) {
    return this.authService.signIn(loginDto);
  }

  /**
   * Sign out user
   * Invalidates current session token
   */
  @Post('sign-out')
  @ApiOperation({ summary: 'Sign out user and invalidate session' })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      example: { message: 'User logged out successfully' },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiHeader({
    name: 'authorization',
    description: 'Bearer token from sign-in response',
    required: false,
  })
  @Audit(AuditAction.LOGOUT, AuditEntityType.USER, 'User logout request')
  async signOut(@Headers('authorization') authorization?: string) {
    return this.authService.signOut(authorization);
  }

  @Post('refresh')
  @Audit(AuditAction.READ, AuditEntityType.USER, 'Refresh access token')
  async refresh(@Headers('authorization') authorization?: string) {
    // Log masked header for diagnostics (first 20 chars)
    console.log('[AuthController.refresh] Authorization header received:', authorization ? `${authorization.substring(0, 20)}...` : 'none');
    return await this.authService.refresh(authorization);
  }

  /**
   * Register new COMMUNITY user from portal
   * Sends verification email
   */
  @Post('register')
  @ApiOperation({ summary: 'Register new community user' })
  @ApiResponse({
    status: 200,
    description: 'User registered successfully, verification email sent',
    schema: {
      example: {
        success: true,
        message: 'Usuario registrado exitosamente. Revisa tu correo para verificar tu cuenta.',
        userId: 'uuid',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid email format or weak password',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already registered',
  })
  @ApiBody({ type: CreateUserCommunityDto })
  @Audit(AuditAction.CREATE, AuditEntityType.USER, 'New user registration')
  async register(
    @Body(ValidationPipe) createUserCommunityDto: CreateUserCommunityDto,
  ) {
    return this.authService.register(createUserCommunityDto);
  }

  /**
   * Verify user email with token
   * Token sent to email during registration
   */
  @Post('verify-email')
  @ApiOperation({ summary: 'Verify user email with token' })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      example: {
        success: true,
        message: 'Correo verificado exitosamente. Ya puedes iniciar sesión.',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired token',
  })
  @ApiBody({
    schema: {
      properties: {
        token: { type: 'string', example: 'verification-token-from-email' },
      },
    },
  })
  async verifyEmail(@Body('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  /**
   * Resend verification email
   * Generates new token and sends to email
   */
  @Post('resend-verification-email')
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({
    status: 200,
    description: 'Verification email resent',
    schema: {
      example: {
        success: true,
        message: 'Correo de verificación reenviado. Revisa tu bandeja.',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiBody({
    schema: {
      properties: {
        email: { type: 'string', example: 'user@example.com' },
      },
    },
  })
  async resendVerificationEmail(@Body('email') email: string) {
    return this.authService.resendVerificationEmail(email);
  }
}
