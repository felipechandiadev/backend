import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { DocumentStatus } from '../../../entities/document.entity';
import { MultimediaType } from '../../../entities/multimedia.entity';

export class CreateDocumentDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsUUID()
  documentTypeId: string;

  @IsOptional()
  @IsUUID()
  multimediaId?: string;

  @IsNotEmpty()
  @IsUUID()
  uploadedById: string;

  @IsOptional()
  @IsUUID()
  personId?: string;

  @IsOptional()
  @IsUUID()
  paymentId?: string;

  @IsOptional()
  @IsUUID()
  contractId?: string;

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1') {
        return true;
      }
      if (normalized === 'false' || normalized === '0') {
        return false;
      }
    }
    if (typeof value === 'number') {
      return value === 1;
    }
    return value;
  })
  @IsBoolean()
  required?: boolean;
}

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsUUID()
  documentTypeId?: string;

  @IsOptional()
  @IsUUID()
  multimediaId?: string;

  @IsOptional()
  @IsUUID()
  uploadedById?: string;

  @IsOptional()
  @IsUUID()
  personId?: string;

  @IsOptional()
  @IsUUID()
  paymentId?: string;

  @IsOptional()
  @IsUUID()
  contractId?: string;

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1') {
        return true;
      }
      if (normalized === 'false' || normalized === '0') {
        return false;
      }
    }
    if (typeof value === 'number') {
      return value === 1;
    }
    return value;
  })
  @IsBoolean()
  required?: boolean;
}

export class UploadDocumentDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsUUID()
  documentTypeId: string;

  @IsOptional()
  @IsUUID()
  uploadedById?: string;

  @IsOptional()
  @IsUUID()
  personId?: string;

  @IsOptional()
  @IsUUID()
  paymentId?: string;

  @IsOptional()
  @IsUUID()
  contractId?: string;

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1') {
        return true;
      }
      if (normalized === 'false' || normalized === '0') {
        return false;
      }
    }
    if (typeof value === 'number') {
      return value === 1;
    }
    return value;
  })
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsString()
  seoTitle?: string;
}

export class UploadDNIDto {
  @IsOptional()
  @IsUUID()
  uploadedById?: string;

  @IsNotEmpty()
  @IsUUID()
  personId: string;

  @IsNotEmpty()
  @IsIn(['FRONT', 'REAR'])
  dniSide: 'FRONT' | 'REAR';

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;
}
