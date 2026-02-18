import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadConfigService } from '../../../config/upload.config';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  MultimediaType,
  MultimediaFormat,
} from '../../../entities/multimedia.entity';
import { IStorageProvider } from './storage-provider.interface';

@Injectable()
export class StaticFilesService implements IStorageProvider, OnModuleInit {
  private readonly logger = new Logger(StaticFilesService.name);
  private readonly uploadBasePath: string;

  constructor(
    private configService: ConfigService,
    private uploadConfig: UploadConfigService,
  ) {
    // Obtiene la ruta base de uploads desde UploadConfigService
    this.uploadBasePath = this.uploadConfig.getUploadBasePath();
    this.logger.log(`📁 Local storage initialized: ${this.uploadBasePath}`);
  }

  // Se ejecuta cuando el módulo se inicializa
  async onModuleInit() {
    await this.ensureDirectoriesExist();
  }

  // Asegura que existan todos los directorios necesarios
  private async ensureDirectoriesExist() {
    const directories = [
      // Documentos
      'docs/dni/front',
      'docs/dni/rear',
      // Web
      'web/slides',
      'web/logos',
      'web/staff',
      'web/partnerships',
      'web/aboutUs',
      'web/team-members',
      // Propiedades (consistente con PropertyController)
      'properties/img',
      'properties/video',
      'docs',
    ];

    for (const dir of directories) {
      const fullPath = path.join(this.uploadBasePath, dir);
      await fs.mkdir(fullPath, { recursive: true });
    }
  }

  // Obtiene la ruta completa para un tipo de archivo específico
  getUploadPath(type: MultimediaType): string {
    const paths = {
      [MultimediaType.AGENT_IMG]: 'users',
      [MultimediaType.DNI_FRONT]: 'docs/dni/front',
      [MultimediaType.DNI_REAR]: 'docs/dni/rear',
      [MultimediaType.SLIDE]: 'web/slides',
      [MultimediaType.LOGO]: 'web/logos',
      [MultimediaType.STAFF]: 'web/staff',
      [MultimediaType.PARTNERSHIP]: 'web/partnerships',
      [MultimediaType.PROPERTY_IMG]: 'properties/img',
      [MultimediaType.PROPERTY_VIDEO]: 'properties/video',
      [MultimediaType.TESTIMONIAL_IMG]: 'web/testimonials',
      [MultimediaType.DOCUMENT]: 'docs',
    };

    return path.join(this.uploadBasePath, paths[type] || '');
  }

  // Implementación de IStorageProvider
  async uploadFile(
    fileBuffer: Buffer,
    relativePath: string,
    contentType: string,
  ): Promise<string> {
    const fullPath = this.getFullPath(relativePath);
    const directory = path.dirname(fullPath);

    // Crear directorio si no existe
    await fs.mkdir(directory, { recursive: true });

    // Guardar archivo
    await fs.writeFile(fullPath, fileBuffer);

    this.logger.log(`✅ File saved locally: ${relativePath}`);

    return this.getPublicUrl(relativePath);
  }

  async downloadFile(relativePath: string): Promise<Buffer> {
    const fullPath = this.getFullPath(relativePath);
    return await fs.readFile(fullPath);
  }

  // Genera una URL pública para un archivo
  getPublicUrl(relativePath: string): string {
    // Usar la URL base configurada
    return this.uploadConfig.buildFileUrl(relativePath);
  }

  // Obtiene la ruta completa del sistema de archivos para un archivo
  getFullPath(relativePath: string): string {
    return path.join(this.uploadBasePath, relativePath);
  }

  // DEPRECATED: Use uploadFile instead
  async saveFile(buffer: Buffer, relativePath: string): Promise<void> {
    await this.uploadFile(buffer, relativePath, 'application/octet-stream');
  }

  // Determina el formato del archivo basado en su tipo MIME
  getFormatFromMimeType(mimeType: string): MultimediaFormat {
    if (!mimeType) {
      return MultimediaFormat.DOCUMENT;
    }

    if (mimeType.startsWith('image/')) {
      return MultimediaFormat.IMG;
    }

    if (mimeType.startsWith('video/')) {
      return MultimediaFormat.VIDEO;
    }

    if (
      mimeType.startsWith('application/') ||
      mimeType.startsWith('text/')
    ) {
      return MultimediaFormat.DOCUMENT;
    }

    return MultimediaFormat.DOCUMENT;
  }

  // Verifica si un archivo existe
  async fileExists(relativePath: string): Promise<boolean> {
    try {
      await fs.access(this.getFullPath(relativePath));
      return true;
    } catch {
      return false;
    }
  }

  // Elimina un archivo
  async deleteFile(relativePath: string): Promise<void> {
    const fullPath = this.getFullPath(relativePath);
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        // Ignora error si el archivo no existe
        throw error;
      }
    }
  }

  // Obtiene el tamaño de un archivo
  async getFileSize(relativePath: string): Promise<number> {
    const stats = await fs.stat(this.getFullPath(relativePath));
    return stats.size;
  }
}
