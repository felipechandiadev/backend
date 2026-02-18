import { Injectable } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Injectable()
export class FileUploadService {
  getStorageConfig(basePath: string = './public') {
    return diskStorage({
      destination: (req, file, callback) => {
        const folder = this.getDestinationFolder(file, basePath);
        callback(null, folder);
      },
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        callback(null, `${uniqueSuffix}${ext}`);
      },
    });
  }

  getDestinationFolder(file: Express.Multer.File, basePath: string): string {
    const mimetype = file.mimetype;
    const fieldname = file.fieldname?.toLowerCase() || '';

    if (mimetype.startsWith('image/')) {
      // Para propiedades, usar subcarpeta img
      if (fieldname.includes('property') || fieldname === 'files') {
        return `${basePath}/properties/img`;
      }
      // Para web/logos, partnerships
      if (fieldname.includes('logo')) {
        return `${basePath}/web/logos`;
      }
      if (fieldname.includes('partnership')) {
        return `${basePath}/web/partnerships`;
      }
      // Default para imágenes de usuarios
      return `${basePath}/users`;
    }

    if (mimetype.startsWith('video/')) {
      // Videos solo para propiedades
      return `${basePath}/properties/video`;
    }

    // Documentos (PDF, DOC, etc.)
    return `${basePath}/docs`;
  }

  getFileUrl(file: Express.Multer.File, basePath: string = '/public'): string {
    const folder = this.getDestinationFolder(file, './public').replace('./public', '');
    return `${basePath}${folder}/${file.filename}`;
  }
}