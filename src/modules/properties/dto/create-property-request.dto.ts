import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsNumber,
  IsEmail,
  IsOptional,
  IsEnum,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePropertyRequestDto {
  @ApiProperty({ example: 'Hermoso departamento en Las Condes' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Departamento con vista al parque', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  propertyTypeId: string;

  @ApiProperty({ example: 'SALE', enum: ['SALE', 'RENT'] })
  @IsEnum(['SALE', 'RENT'])
  @IsNotEmpty()
  operationType: string;

  // Características opcionales
  @ApiProperty({ example: 150, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  builtSquareMeters?: number;

  @ApiProperty({ example: 200, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  landSquareMeters?: number;

  @ApiProperty({ example: 3, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bedrooms?: number;

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bathrooms?: number;

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  parkingSpaces?: number;

  @ApiProperty({ example: 5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  floors?: number;

  @ApiProperty({ example: 2015, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1900)
  @Max(2100)
  constructionYear?: number;

  // Precio
  @ApiProperty({ example: '1500000' })
  @IsString()
  @IsNotEmpty()
  price: string;

  @ApiProperty({ example: 'CLP', enum: ['CLP', 'UF'] })
  @IsEnum(['CLP', 'UF'])
  @IsNotEmpty()
  currencyPrice: string;

  // Ubicación
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsUUID()
  @IsNotEmpty()
  region: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002' })
  @IsUUID()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Avenida Providencia 1234, Depto 502' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: { latitude: -33.4489, longitude: -70.6693 }, required: false })
  @IsOptional()
  coordinates?: {
    latitude: number;
    longitude: number;
  };

  // Contacto
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty()
  contactName: string;

  @ApiProperty({ example: '+56912345678' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?56\s?9\s?\d{4}\s?\d{4}$/, {
    message: 'El teléfono debe ser válido (formato: +56912345678 o similar)',
  })
  contactPhone: string;

  @ApiProperty({ example: 'juan@email.com' })
  @IsEmail()
  @IsNotEmpty()
  contactEmail: string;

  // Multimedia IDs (se cargan antes)
  @ApiProperty({ example: ['550e8400-e29b-41d4-a716-446655440003'], required: false })
  @IsOptional()
  multimediaIds?: string[];
}
