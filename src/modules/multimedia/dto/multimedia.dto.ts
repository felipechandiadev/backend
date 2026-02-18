import {
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsNumber,
  IsPositive,
} from 'class-validator';
import {
  MultimediaFormat,
  MultimediaType,
} from '../../../entities/multimedia.entity';

export class CreateMultimediaDto {
  @IsEnum(MultimediaFormat)
  @IsNotEmpty()
  format: MultimediaFormat;

  @IsEnum(MultimediaType)
  @IsNotEmpty()
  type: MultimediaType;

  @IsUrl()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsOptional()
  seoTitle?: string;

  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  fileSize: number;
}

export class UpdateMultimediaDto {
  @IsEnum(MultimediaFormat)
  @IsOptional()
  format?: MultimediaFormat;

  @IsEnum(MultimediaType)
  @IsOptional()
  type?: MultimediaType;

  @IsUrl()
  @IsOptional()
  url?: string;

  @IsString()
  @IsOptional()
  seoTitle?: string;

  @IsString()
  @IsOptional()
  filename?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  fileSize?: number;
}
