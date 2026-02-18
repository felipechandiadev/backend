import { Expose, Type, Transform } from 'class-transformer';
import { IsOptional, IsArray } from 'class-validator';
import { PropertyStatus } from '../../../common/enums/property-status.enum';
import { PropertyOperationType } from '../../../common/enums/property-operation-type.enum';
import { CurrencyPriceEnum } from '../../../entities/property.entity';
import { RegionEnum } from '../../../common/regions/regions.enum';
import { ComunaEnum } from '../../../common/regions/comunas.enum';
import {
  PostRequest,
  ChangeHistoryEntry,
  ViewEntry,
  LeadEntry,
} from '../../../common/interfaces/property.interfaces';

// DTOs anidados
class UserDto {
  @Expose()
  id: string;

  @Expose()
  username?: string;

  @Expose()
  email?: string;

  @Expose()
  personalInfo?: any; // JSON object
}

class PropertyTypeDto {
  @Expose()
  id: string;

  @Expose()
  name: string;
}

class MultimediaDto {
  @Expose()
  id: string;

  @Expose()
  url: string;

  @Expose()
  type: 'image' | 'video' | 'document';
}

export class GetFullPropertyDto {
  @Expose()
  id: string;

  // Basic Information
  @Expose()
  title: string;

  @Expose()
  description?: string;

  @Expose()
  status: PropertyStatus;

  @Expose()
  operationType: PropertyOperationType;

  // Users Relations
  @Expose()
  @Type(() => UserDto)
  creatorUser?: UserDto;

  @Expose()
  @Type(() => UserDto)
  assignedAgent?: UserDto;

  // Pricing Information
  @Expose()
  price: number;

  @Expose()
  currencyPrice: CurrencyPriceEnum;

  // SEO Information (excluyendo seoKeywords)
  @Expose()
  seoTitle?: string;

  @Expose()
  seoDescription?: string;

  // Publication Information
  @Expose()
  publicationDate?: Date;

  @Expose()
  isFeatured?: boolean;

  // Physical Characteristics
  @Expose()
  @Type(() => PropertyTypeDto)
  propertyType?: PropertyTypeDto;

  @Expose()
  builtSquareMeters?: number;

  @Expose()
  landSquareMeters?: number;

  @Expose()
  bedrooms?: number;

  @Expose()
  bathrooms?: number;

  @Expose()
  parkingSpaces?: number;

  @Expose()
  floors?: number;

  @Expose()
  constructionYear?: number;

  // Location Information
  @Expose()
  state?: RegionEnum;

  @Expose()
  city?: ComunaEnum;

  @Expose()
  address?: string;

  @Expose()
  latitude?: number;

  @Expose()
  longitude?: number;

  // Multimedia
  @Expose()
  @Type(() => MultimediaDto)
  multimedia?: MultimediaDto[];

  @Expose()
  mainImageUrl?: string;

  // Business Logic Fields
  @Expose()
  postRequest?: PostRequest;

  @Expose()
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => Array.isArray(value) ? value : [])
  changeHistory?: ChangeHistoryEntry[];

  @Expose()
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => Array.isArray(value) ? value : [])
  views?: ViewEntry[];

  @Expose()
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => Array.isArray(value) ? value : [])
  leads?: LeadEntry[];

  @Expose()
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => Array.isArray(value) ? value : [])
  favorites?: Array<{ userId: string; addedAt: Date }>;

  // Internal Notes
  @Expose()
  internalNotes?: string;

  // Timestamps
  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  deletedAt?: Date;

  @Expose()
  publishedAt?: Date;

  // Información accesoria agregada
  @Expose()
  favoritesCount?: number;

  @Expose()
  leadsCount?: number;

  @Expose()
  viewsCount?: number;
}