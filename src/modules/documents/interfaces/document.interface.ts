import { MultimediaType } from '../../../entities/multimedia.entity';

export interface DocumentUploadDto {
  file: Express.Multer.File;
  documentTypeId: string;
  description?: string;
  metadata?: {
    seoTitle?: string;
    altText?: string;
    tags?: string[];
  };
}

export interface DocumentResponse {
  id: string;
  documentTypeId: string;
  documentType: string;
  url: string;
  filename: string;
  fileSize: number;
  description?: string;
  metadata?: {
    seoTitle?: string;
    altText?: string;
    tags?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}
