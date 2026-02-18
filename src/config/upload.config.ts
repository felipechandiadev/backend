import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';

@Injectable()
export class UploadConfigService {
  constructor(private configService: ConfigService) {}

  /**
   * Obtiene la ruta base relativa para almacenar archivos
   */
  getUploadBasePath(): string {
    return this.configService.get('UPLOAD_BASE_PATH', 'public');
  }

  /**
   * Obtiene la URL base pública para acceder a los archivos
   */
  getUploadBaseUrl(): string {
    const backendPublicUrl = this.configService.get('BACKEND_PUBLIC_URL', 'http://localhost:3000');
    return `${backendPublicUrl}/public`;
  }

  /**
   * Obtiene la ruta completa del directorio de uploads
   */
  getUploadDir(): string {
    return path.join(process.cwd(), this.getUploadBasePath());
  }

  /**
   * Obtiene el tamaño máximo de archivo permitido en bytes
   */
  getMaxFileSize(): number {
    return this.configService.get('UPLOAD_MAX_FILE_SIZE', 10485760); // 10MB por defecto
  }

  /**
   * Obtiene las extensiones de archivo permitidas
   */
  getAllowedExtensions(): string[] {
    const extensions = this.configService.get(
      'UPLOAD_ALLOWED_EXTENSIONS',
      'jpg,jpeg,png,gif,webp,pdf,doc,docx'
    );
    return extensions.split(',').map((ext) => ext.trim().toLowerCase());
  }

  /**
   * Construye la URL completa de un archivo subido
   */
  buildFileUrl(filename: string): string {
    return `${this.getUploadBaseUrl()}/${filename}`;
  }

  /**
   * Valida si una extensión está permitida
   */
  isAllowedExtension(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext ? this.getAllowedExtensions().includes(ext) : false;
  }

  /**
   * Valida si un tamaño de archivo está dentro del límite permitido
   */
  isValidFileSize(fileSize: number): boolean {
    return fileSize <= this.getMaxFileSize();
  }
}
