import { IsString, IsOptional, IsUrl, IsBoolean, IsNumber, Min, Max, IsDateString, Length } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class UpdateSlideWithMultimediaDto {
  @IsOptional()
  @IsString({ message: 'El título debe ser texto' })
  @Length(3, 255, { message: 'El título debe tener entre 3 y 255 caracteres' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  description?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true }, { 
    message: 'Debe ser una URL válida con protocolo (http:// o https://)' 
  })
  @Transform(({ value }) => value?.trim() === '' ? null : value?.trim())
  linkUrl?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @Type(() => Number)
  @IsNumber({}, { message: 'La duración debe ser un número' })
  @Min(1, { message: 'La duración mínima es 1 segundo' })
  @Max(60, { message: 'La duración máxima es 60 segundos' })
  duration?: number;

  @IsOptional()
  @IsDateString({}, { message: 'Fecha de inicio debe ser válida' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Fecha de fin debe ser válida' })
  endDate?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'isActive debe ser true o false' })
  isActive?: boolean;
}