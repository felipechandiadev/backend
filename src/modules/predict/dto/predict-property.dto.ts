import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';

export enum OperationType {
  SALE = 'SALE',
  RENTAL = 'RENTAL',
}

export class PredictPropertyDto {
  @ApiProperty({ 
    description: 'Tipo de operación', 
    enum: OperationType,
    example: 'SALE' 
  })
  @IsEnum(OperationType)
  operacion: OperationType;

  @ApiProperty({ 
    description: 'Región de Chile',
    example: 'Metropolitana' 
  })
  @IsString()
  region: string;

  @ApiProperty({ 
    description: 'Comuna',
    example: 'Santiago' 
  })
  @IsString()
  comuna: string;

  @ApiProperty({ 
    description: 'Tipo de propiedad',
    example: 'Departamento' 
  })
  @IsString()
  tipo_propiedad: string;

  @ApiProperty({ 
    description: 'Número de habitaciones',
    example: 3,
    minimum: 0 
  })
  @IsNumber()
  @Min(0)
  habitaciones: number;

  @ApiProperty({ 
    description: 'Número de baños',
    example: 2,
    minimum: 0 
  })
  @IsNumber()
  @Min(0)
  banos: number;

  @ApiProperty({ 
    description: 'Metros cuadrados construidos',
    example: 85,
    minimum: 1 
  })
  @IsNumber()
  @Min(1)
  m2_construidos: number;

  @ApiProperty({ 
    description: 'Metros cuadrados de terreno',
    example: 85,
    minimum: 1 
  })
  @IsNumber()
  @Min(1)
  m2_terreno: number;

  @ApiPropertyOptional({ 
    description: 'Latitud',
    example: -33.45 
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitud?: number;

  @ApiPropertyOptional({ 
    description: 'Longitud',
    example: -70.65 
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitud?: number;
}

export class PredictPropertyResponseDto {
  @ApiProperty({ description: 'Valor estimado en CLP', example: 150000000 })
  valor_estimado: number;

  @ApiProperty({ description: 'Valor mínimo del rango', example: 135000000 })
  valor_minimo: number;

  @ApiProperty({ description: 'Valor máximo del rango', example: 165000000 })
  valor_maximo: number;

  @ApiProperty({ description: 'Tipo de operación', example: 'SALE' })
  operacion: string;

  @ApiProperty({ description: 'Confianza del modelo (0-1)', example: 0.85 })
  confianza: number;

  @ApiProperty({ description: 'Valor formateado', example: '$150.000.000 CLP' })
  valor_formateado: string;

  @ApiProperty({ description: 'Rango formateado', example: '$135.000.000 - $165.000.000 CLP' })
  rango_formateado: string;
}
