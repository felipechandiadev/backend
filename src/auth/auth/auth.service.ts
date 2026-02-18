import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../modules/users/users.service';
import { JweService } from '../jwe/jwe.service';
import { LoginDto } from '../../modules/users/dto/user.dto';
import * as jwt from 'jsonwebtoken';

export interface SignInResult {
  access_token: string;
  userId: string;
  email: string;
  role: string;
  name: string;
  user: {
    id: string;
    email: string;
    role: string;
    name: string;
    phone?: string;
    personId?: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jweService: JweService,
  ) {}

  async signIn(loginDto: LoginDto): Promise<SignInResult> {
    try {
      console.log('AuthService.signIn called');
      // Validate user credentials
      const user = await this.usersService.login(loginDto);
      console.log('User validated:', user.id);

      // Create JWT payload
      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };
      console.log('Payload created:', payload);

      // Generate token
      let access_token: string;
      if (process.env.NODE_ENV === 'test') {
        // In test environment, use plain JWT
        access_token = jwt.sign(
          payload,
          process.env.JWT_SECRET || 'test-secret',
          {
            expiresIn: '12h',
          },
        );
      } else {
        // Generate JWE token
        access_token = await this.jweService.encrypt(payload, '12h');
      }
      console.log('Token generated:', !!access_token);

      return {
        access_token,
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
          phone: user.personalInfo?.phone,
          personId: user.personId,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.log('Error in signIn:', message);
      // Re-throw with generic message for security
      throw new UnauthorizedException('Credenciales inválidas');
    }
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
      console.log('Error in signOut:', message);
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
}
