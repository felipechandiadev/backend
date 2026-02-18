import { 
  IsString, 
  IsOptional, 
  IsBoolean, 
  IsInt, 
  MaxLength, 
  IsDateString, 
  IsUrl,
  Min 
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateSlideDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  multimediaUrl?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true }, { 
    message: 'Debe ser una URL válida con protocolo (http:// o https://)' 
  })
  @MaxLength(500)
  @Transform(({ value }) => value?.trim() === '' ? null : value?.trim())
  linkUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  duration?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value))
  order?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;
}