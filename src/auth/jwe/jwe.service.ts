import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class JweService implements OnModuleInit {
  private publicKey: any;
  private privateKey: any;
  private jose: any;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    // Use dynamic import to avoid TypeScript converting to require()
    this.jose = await new Function(
      'specifier',
      'return import(specifier)',
    )('jose');
    await this.loadKeys();
  }

  private async loadKeys() {
    try {
      const privateKeyPath =
        this.configService.get<string>('JWE_PRIVATE_KEY_PATH') ||
        'keys/private.pem';
      const publicKeyPath =
        this.configService.get<string>('JWE_PUBLIC_KEY_PATH') ||
        'keys/public.pem';

      const privateKeyPem = fs.readFileSync(
        path.resolve(privateKeyPath),
        'utf8',
      );
      const publicKeyPem = fs.readFileSync(path.resolve(publicKeyPath), 'utf8');

      this.privateKey = await this.jose.importPKCS8(
        privateKeyPem,
        'RSA-OAEP-256',
      );
      this.publicKey = await this.jose.importSPKI(publicKeyPem, 'RSA-OAEP-256');
    } catch (error) {
      throw new Error(`Failed to load JWE keys: ${error.message}`);
    }
  }

  async encrypt(payload: any, expiresIn: string = '12h'): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    return new this.jose.EncryptJWT(payload)
      .setProtectedHeader({ alg: 'RSA-OAEP-256', enc: 'A256GCM' })
      .setIssuedAt(now)
      .setIssuer('real-estate-platform')
      .setAudience('real-estate-platform-users')
      .setExpirationTime(expiresIn)
      .encrypt(this.publicKey);
  }

  async decrypt(token: string): Promise<any> {
    try {
      const { payload } = await this.jose.jwtDecrypt(token, this.privateKey, {
        issuer: 'real-estate-platform',
        audience: 'real-estate-platform-users',
      });

      return payload;
    } catch (error) {
      console.error('[JweService] Token decrypt error:', error instanceof Error ? error.message : error);
      throw new Error('Invalid or expired token');
    }
  }
}
