import { IsString, IsOptional, IsNumber, IsObject, IsArray, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { Multer } from 'multer';

export class CreatePropertyLocationDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional()
  @IsString()
  address?: string;
}

export class CreatePropertyMultimediaDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  url: string;

  @IsString()
  filename: string;

  @IsString()
  type: 'image' | 'video';

  @IsOptional()
  @IsNumber()
  order?: number;
}

export class CreatePropertyDto {
  // Datos generales
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Transform(({ value }) => {
    // Convert frontend number to backend enum string, or pass through string if valid
    if (typeof value === 'string') {
      // If already a string, validate it's a valid status
      const validStatuses = ['REQUEST', 'PRE-APPROVED', 'PUBLISHED', 'INACTIVE', 'SOLD', 'RENTED'];
      return validStatuses.includes(value) ? value : 'REQUEST';
    }
    
    // Convert frontend number to backend enum string
    const statusMap: Record<number, string> = {
      1: 'REQUEST',
      2: 'PRE-APPROVED', 
      3: 'PUBLISHED',
      4: 'INACTIVE',
      5: 'SOLD',
      6: 'RENTED'
    };
    return statusMap[value] || 'REQUEST';
  })
  @IsString()
  status: string; // ✅ FIXED: Correct type after transform

  @Transform(({ value }) => {
    // If already a valid string, return it
    if (typeof value === 'string') {
      const validOperations = ['SALE', 'RENT'];
      return validOperations.includes(value) ? value : 'SALE';
    }
    // Convert frontend number to backend enum string
    const operationMap: Record<number, string> = {
      1: 'SALE',
      2: 'RENT'
    };
    return operationMap[value] || 'SALE';
  })
  @IsString()
  operationType: string; // ✅ FIXED: Correct type after transform

  @IsOptional()
  @IsString()
  propertyTypeId?: string;

  // Ubicación
  @Transform(({ value }) => {
    if (typeof value === 'object' && value?.id) return value.id;
    if (typeof value === 'string') return value;
    return value;
  })
  @IsString()
  state: any; // ✅ Accept object, extract ID to string

  @Transform(({ value }) => {
    if (typeof value === 'object' && value?.id) return value.id;
    if (typeof value === 'string') return value;
    return value;
  })
  @IsString()
  city: any; // ✅ Accept object, extract ID to string

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreatePropertyLocationDto)
  location?: CreatePropertyLocationDto;

  // Características (todas opcionales ahora)
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value === '' || value === undefined ? undefined : (typeof value === 'string' ? parseFloat(value) : value))
  bedrooms?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value === '' || value === undefined ? undefined : (typeof value === 'string' ? parseFloat(value) : value))
  bathrooms?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value === '' || value === undefined ? undefined : (typeof value === 'string' ? parseFloat(value) : value))
  parkingSpaces?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value === '' || value === undefined ? undefined : (typeof value === 'string' ? parseFloat(value) : value))
  floors?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value === '' || value === undefined ? undefined : (typeof value === 'string' ? parseFloat(value) : value))
  builtSquareMeters?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value === '' || value === undefined ? undefined : (typeof value === 'string' ? parseFloat(value) : value))
  landSquareMeters?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value === '' || value === undefined ? undefined : (typeof value === 'string' ? parseFloat(value) : value))
  constructionYear?: number;

  // Precio (opcional, soporta CLP y UF correctamente)
  @IsOptional()
  @IsNumber()
  @Transform(({ value, obj }) => {
    if (value === '' || value === undefined || value === null) return undefined;
    // Si la moneda es UF, permite decimales
    if (obj.currencyPrice === 'UF') {
      return typeof value === 'string' ? parseFloat(value.replace(',', '.')) : Number(value);
    }
    // Si la moneda es CLP, fuerza entero
    if (obj.currencyPrice === 'CLP') {
      return typeof value === 'string' ? parseInt(value.replace(/\D/g, ''), 10) : Number(value);
    }
    // Default: intenta convertir a número
    return typeof value === 'string' ? Number(value) : value;
  })
  price?: number;

  @IsOptional()
  @Transform(({ value }) => {
    // If already a valid string, return it
    if (typeof value === 'string') {
      const validCurrencies = ['CLP', 'UF'];
      return validCurrencies.includes(value) ? value : 'CLP';
    }
    // Convert frontend number to backend enum string
    const currencyMap: Record<number, string> = {
      1: 'CLP',
      2: 'UF'
    };
    return currencyMap[value] || 'CLP';
  })
  @IsString()
  currencyPrice?: string; // ✅ FIXED: Accept number or string, transform to string

  // SEO
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  // Multimedia
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePropertyMultimediaDto)
  multimedia?: CreatePropertyMultimediaDto[];

  // Archivos multimedia para upload (nuevo - para un solo paso)
  @IsOptional()
  multimediaFiles?: Express.Multer.File[];

  // Imagen principal
  @IsOptional()
  @IsString()
  mainImageUrl?: string;

  // Internos
  @IsOptional()
  @IsString()
  internalNotes?: string;
}

export class UpdateMainImageDto {
  @IsString()
  @IsNotEmpty()
  mainImageUrl: string;
}