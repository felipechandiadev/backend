import { IsString, IsOptional, IsUrl } from 'class-validator';

export class UpdateMainMultimediaDto {
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'La URL debe ser válida' })
  mainImageUrl?: string;
}