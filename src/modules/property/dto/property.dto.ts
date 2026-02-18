import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsUUID,
  ValidateNested,
  IsArray,
  IsBoolean,
  IsDate,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PropertyStatus } from '../../../common/enums/property-status.enum';
import { PropertyOperationType } from '../../../common/enums/property-operation-type.enum';
import {
  PostRequest,
  ChangeHistoryEntry,
  ViewEntry,
  LeadEntry,
} from '../../../common/interfaces/property.interfaces';
import { RegionEnum } from '../../../common/regions/regions.enum';
import { ComunaEnum } from '../../../common/regions/comunas.enum';
import { CurrencyPriceEnum } from '../../../entities/property.entity';

export class CreatePropertyDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus = PropertyStatus.REQUEST;

  @IsNotEmpty()
  @IsEnum(PropertyOperationType)
  operationType: PropertyOperationType;

  @IsOptional()
  @IsUUID()
  creatorUserId?: string;

  @IsOptional()
  @IsUUID()
  assignedAgentId?: string;

  // Pricing Information
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number = 0;

  @IsOptional()
  @IsEnum(CurrencyPriceEnum)
  currencyPrice?: CurrencyPriceEnum = CurrencyPriceEnum.CLP;

  // SEO Information
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsString()
  seoKeywords?: string;

  // Publication Information
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  publicationDate?: Date;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean = false;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  priority?: number = 0;

  // Physical Characteristics
  @IsOptional()
  @IsUUID()
  propertyTypeId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  builtSquareMeters?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  landSquareMeters?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bedrooms?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bathrooms?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  parkingSpaces?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  floors?: number;

  @IsOptional()
  @IsNumber()
  @Min(1800)
  @Max(new Date().getFullYear())
  constructionYear?: number;

  @IsOptional()
  @IsString()
  amenities?: string;

  @IsOptional()
  @IsString()
  nearbyServices?: string;

  // Location Information
  @IsOptional()
  @IsEnum(RegionEnum)
  state?: RegionEnum;

  @IsOptional()
  @IsEnum(ComunaEnum)
  city?: ComunaEnum;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  zipCode?: string;

  // Complex Fields
  @IsOptional()
  @IsArray()
  multimedia?: any[];

  @IsOptional()
  postRequest?: PostRequest;

  @IsOptional()
  @IsArray()
  changeHistory?: ChangeHistoryEntry[];

  @IsOptional()
  @IsArray()
  views?: ViewEntry[];

  @IsOptional()
  @IsArray()
  leads?: LeadEntry[];

  // Statistics
  @IsOptional()
  @IsNumber()
  @Min(0)
  viewCount?: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(0)
  favoriteCount?: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(0)
  contactCount?: number = 0;

  // Internal Fields
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class UpdatePropertyCharacteristicsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  builtSquareMeters?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  landSquareMeters?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bedrooms?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bathrooms?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  parkingSpaces?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  floors?: number;

  @IsOptional()
  @IsNumber()
  @Min(1800)
  @Max(new Date().getFullYear())
  constructionYear?: number;
}

export class UpdatePropertyDto {

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @IsOptional()
  @IsEnum(PropertyOperationType)
  operationType?: PropertyOperationType;

  @IsOptional()
  @IsUUID()
  assignedAgentId?: string;

  // Pricing Information
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsEnum(CurrencyPriceEnum)
  currencyPrice?: CurrencyPriceEnum;

  // SEO Information
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsString()
  seoKeywords?: string;

  // Publication Information
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  publicationDate?: Date;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  priority?: number;

  // Physical Characteristics
  @IsOptional()
  @IsUUID()
  propertyTypeId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  builtSquareMeters?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  landSquareMeters?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bedrooms?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bathrooms?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  parkingSpaces?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  floors?: number;

  @IsOptional()
  @IsNumber()
  @Min(1800)
  @Max(new Date().getFullYear())
  constructionYear?: number;

  @IsOptional()
  @IsString()
  amenities?: string;

  @IsOptional()
  @IsString()
  nearbyServices?: string;

  // Location Information
  @IsOptional()
  @IsEnum(RegionEnum)
  state?: RegionEnum;

  @IsOptional()
  @IsEnum(ComunaEnum)
  city?: ComunaEnum;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  zipCode?: string;

  // Complex Fields
  @IsOptional()
  @IsArray()
  multimedia?: any[];

  @IsOptional()
  postRequest?: PostRequest;

  // Internal Fields
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
