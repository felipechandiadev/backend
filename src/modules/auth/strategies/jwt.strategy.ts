import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { JweService } from '../../../auth/jwe/jwe.service';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly jweService: JweService) {
    super();
  }

  async validate(request: any) {
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      console.error('[JwtStrategy] No token provided in request headers:', {
        hasAuthHeader: !!request.headers?.authorization,
      });
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Mask token for safe logging (show first and last 8 chars)
      const masked = `${token.slice(0, 8)}...${token.slice(-8)}`;
        console.log('[JwtStrategy] Validating token:', masked, 'len:', token.length);
      let decryptedPayload: any;

      if (process.env.NODE_ENV === 'test') {
        // In test environment, use plain JWT
        decryptedPayload = jwt.verify(
          token,
          process.env.JWT_SECRET || 'test-secret',
        );
      } else {
        // Decrypt the JWE token
        try {
          decryptedPayload = await this.jweService.decrypt(token);
          // Log minimal payload info for diagnostics
          console.log('[JwtStrategy] Token decrypted. sub:', decryptedPayload?.sub ? String(decryptedPayload.sub).slice(0, 8) + '...' : 'none', 'exp:', !!decryptedPayload?.exp);
        } catch (err) {
          console.error('[JwtStrategy] Decrypt failed:', err instanceof Error ? err.message : err);
          throw err;
        }
      }
      if (!decryptedPayload) {
        throw new UnauthorizedException('Invalid token');
      }

      // Check if token is expired
      if (decryptedPayload.exp && decryptedPayload.exp * 1000 < Date.now()) {
        throw new UnauthorizedException('Token expired');
      }

      // Return user information
      return {
        id: decryptedPayload.sub,
        email: decryptedPayload.email,
        role: decryptedPayload.role,
      };
    } catch (error) {
      console.error('[JwtStrategy] Token validation error:', error instanceof Error ? error.message : error);
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}
