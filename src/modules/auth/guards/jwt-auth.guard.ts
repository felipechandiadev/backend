import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JweService } from '../../../auth/jwe/jwe.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly jweService: JweService) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    // Write a debug line for each invocation to a temp log so we can inspect behavior across requests
    try {
      const req = context.switchToHttp().getRequest();
      const fs = await new Function('fs', 'return fs')((await import('fs')));
      const method = req?.method || 'UNKNOWN';
      const url = req?.originalUrl || req?.url || 'UNKNOWN';
      fs.appendFileSync('/tmp/jwt-guard-debug.log', `[${new Date().toISOString()}] canActivate invoked for ${method} ${url}\n`);
    } catch (e) {
      // non-fatal
    }
    // First attempt normal passport jwt flow
    try {
      const result = (await super.canActivate(context)) as boolean;
      return result;
    } catch (err) {
      try {
        const fs = await new Function('fs', 'return fs')((await import('fs')));
        fs.appendFileSync('/tmp/jwt-guard-debug.log', `[${new Date().toISOString()}] super.canActivate threw: ${err instanceof Error ? err.message : String(err)}\n`);
      } catch {}
      // If passport flow fails with Unauthorized, try a manual decrypt fallback
      try {
        const req = context.switchToHttp().getRequest();
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];
        let token: string | null = null;

        if (authHeader && String(authHeader).startsWith('Bearer ')) {
          token = String(authHeader).substring(7).trim();
        }

        if (!token && req.headers && req.headers.cookie) {
          // parse cookies header to find access_token
          const cookieHeader = String(req.headers.cookie || '');
          const match = cookieHeader.match(/(?:^|; )access_token=([^;]+)/);
          if (match) token = decodeURIComponent(match[1]);
        }

        if (token) {
          try {
            const fs = await new Function('fs', 'return fs')((await import('fs')));
            const masked = token.length > 24 ? `${token.substring(0,8)}...${token.slice(-8)}` : token;
            fs.appendFileSync('/tmp/jwt-guard-debug.log', `[${new Date().toISOString()}] Manual decrypt fallback token mask: ${masked}\n`);
          } catch {}

          const payload = await this.jweService.decrypt(token);
          if (payload && payload.sub) {
            // attach user-like object to request so controllers can use it
            req.user = { id: payload.sub, email: payload.email, role: payload.role };
            try { const fs = await new Function('fs', 'return fs')((await import('fs'))); fs.appendFileSync('/tmp/jwt-guard-debug.log', `[${new Date().toISOString()}] Manual decrypt succeeded, sub=${payload.sub}\n`); } catch {}
            return true;
          }
        }
      } catch (fallbackErr) {
        console.warn('[JwtAuthGuard] Manual decrypt fallback failed:', fallbackErr instanceof Error ? fallbackErr.message : fallbackErr);
        try { const fs = await new Function('fs', 'return fs')((await import('fs'))); fs.appendFileSync('/tmp/jwt-guard-debug.log', `[${new Date().toISOString()}] Manual decrypt fallback error: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}\n`); } catch {}
      }

      // Re-throw original error so the framework returns 401
      throw err;
    }
  }
}
