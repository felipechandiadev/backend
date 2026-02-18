import {
  MultimediaFormat,
  MultimediaType,
} from '../../../entities/multimedia.entity';

export interface MultimediaUploadMetadata {
  type: string;
  seoTitle?: string;
  description?: string;
}

export interface MultimediaResponse {
  id: string;
  format: MultimediaFormat;
  type: MultimediaType;
  url: string;
  filename: string;
  fileSize: number;
  seoTitle?: string;
  createdAt: Date;
  updatedAt: Date;
}
