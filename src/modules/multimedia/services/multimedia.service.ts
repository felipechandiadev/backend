import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  Multimedia,
  MultimediaType,
  MultimediaFormat,
} from '../../../entities/multimedia.entity';
import {
  MultimediaUploadMetadata,
  MultimediaResponse,
} from '../interfaces/multimedia.interface';
import { StaticFilesService } from './static-files.service';
import { CloudflareStorageService } from './cloudflare-storage.service';
import { IStorageProvider } from './storage-provider.interface';

@Injectable()
export class MultimediaService {
  private readonly logger = new Logger(MultimediaService.name);
  private storageProvider: IStorageProvider;

  constructor(
    @InjectRepository(Multimedia)
    private readonly multimediaRepository: Repository<Multimedia>,
    private readonly staticFilesService: StaticFilesService,
    private readonly cloudflareStorage: CloudflareStorageService,
    private readonly configService: ConfigService,
  ) {
    // Seleccionar provider según configuración
    const provider = this.configService.get<string>('STORAGE_PROVIDER', 'local');
    
    if (provider === 'r2') {
      this.storageProvider = this.cloudflareStorage;
      this.logger.log('🚀 Using Cloudflare R2 storage');
    } else {
      this.storageProvider = this.staticFilesService;
      this.logger.log('📁 Using local storage');
    }
  }


  private getUploadPath(type: MultimediaType): string {
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

    return paths[type] || '';
  }

  private generateUniqueFilename(
    originalName: string,
    type: MultimediaType,
  ): string {
    // Obtener la extensión del archivo original
    const extension = path.extname(originalName);

    // Crear prefijo basado en el tipo
    const typePrefix = type.toLowerCase().replace('_', '-');

    // Generar timestamp en formato YYYYMMDD_HHMMSS
    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/[-:]/g, '') // Remover guiones y dos puntos
      .replace('T', '_') // Reemplazar T con underscore
      .split('.')[0]; // Remover milisegundos

    // Generar string aleatorio de 8 caracteres
    const randomString = Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();

    // Combinar todo: prefijo_tipo_timestamp_random.ext
    return `${typePrefix}_${timestamp}_${randomString}${extension}`;
  }

  async uploadFile(
    file: Express.Multer.File,
    metadata: MultimediaUploadMetadata,
    userId: string,
  ): Promise<Multimedia> {
    // Directorio relativo bajo la carpeta de uploads (ej: PROPERTY_IMG)
    const relativeDir = this.getUploadPath(metadata.type as MultimediaType);

    // Generar nombre único
    const uniqueFilename = this.generateUniqueFilename(
      file.originalname,
      metadata.type as MultimediaType,
    );
    const relativePath = path.join(relativeDir, uniqueFilename);

    try {
      let fileBuffer: Buffer;

      // Obtener buffer del archivo
      if (file.buffer && file.buffer.length) {
        fileBuffer = file.buffer;
      } else if ((file as any).path) {
        // Si multer usó diskStorage, leer el archivo
        fileBuffer = await fs.readFile((file as any).path);
      } else {
        throw new Error('No file data available');
      }

      // Subir archivo usando el storage provider seleccionado
      const publicUrl = await this.storageProvider.uploadFile(
        fileBuffer,
        relativePath,
        file.mimetype,
      );

      // Guardar metadata en BD
      const multimedia = new Multimedia();
      multimedia.type = metadata.type as MultimediaType;
      multimedia.seoTitle = metadata.seoTitle;
      multimedia.description = metadata.description;
      multimedia.url = publicUrl;
      multimedia.userId = userId || undefined;
      multimedia.format = this.getFormatFromMimeType(file.mimetype);
      multimedia.filename = uniqueFilename;
      multimedia.fileSize = file.size;

      return await this.multimediaRepository.save(multimedia);
    } catch (error) {
      this.logger.error('❌ [MultimediaService.uploadFile] Error:', error);
      throw new HttpException(
        'Error uploading file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async serveFile(filepath: string): Promise<Buffer> {
    try {
      return await this.storageProvider.downloadFile(filepath);
    } catch (error) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }
  }

  async deleteFile(id: string): Promise<void> {
    const multimedia = await this.multimediaRepository.findOne({
      where: { id },
    });
    
    if (!multimedia) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }

    try {
      // Construir ruta relativa
      const relativePath = path.join(
        this.getUploadPath(multimedia.type),
        multimedia.filename,
      );

      // Eliminar archivo del storage
      await this.storageProvider.deleteFile(relativePath);

      // Eliminar registro de BD
      await this.multimediaRepository.remove(multimedia);

      this.logger.log(`✅ File deleted: ${multimedia.filename}`);
    } catch (error) {
      this.logger.error(`❌ Error deleting file: ${error.message}`);
      throw new HttpException(
        'Error deleting file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getFormatFromMimeType(mimeType: string): MultimediaFormat {
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

  /**
   * Uploads a file to a specific path without creating a Multimedia entity
   * Useful for logos, documents, etc. that don't need database records
   */
  async uploadFileToPath(file: Express.Multer.File, uploadPath: string): Promise<string> {
    const fullUploadPath = this.staticFilesService.getFullPath(uploadPath);

    // Ensure the directory exists
    await fs.mkdir(fullUploadPath, { recursive: true });

    // Generate unique filename
    const extension = path.extname(file.originalname);
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '_')
      .split('.')[0];
    const randomString = Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();
    const uniqueFilename = `${uploadPath.toLowerCase().replace('/', '_')}_${timestamp}_${randomString}${extension}`;

  const filePath = path.join(fullUploadPath, uniqueFilename);

    try {
      // Save the file to the upload directory
      await fs.writeFile(filePath, file.buffer);

      // Return the relative path for URL generation
      return path.join(uploadPath, uniqueFilename);
    } catch (error) {
      throw new HttpException(
        'Error uploading file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
