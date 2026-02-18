import { IsOptional, IsString, IsBoolean, MaxLength } from 'class-validator';

/**
 * DTO para actualizar la información SEO y marketing de una propiedad.
 *
 * Campos actualizables:
 * - seoTitle: Título para motores de búsqueda (máximo 60 caracteres)
 * - seoDescription: Descripción para motores de búsqueda (máximo 160 caracteres)
 * - seoKeywords: Palabras clave separadas por comas
 * - isFeatured: Boolean para marcar como propiedad destacada
 */
export class UpdatePropertySeoDto {
  @IsOptional()
  @IsString()
  @MaxLength(60, { message: 'El título SEO no debe exceder 60 caracteres' })
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160, { message: 'La descripción SEO no debe exceder 160 caracteres' })
  seoDescription?: string;

  @IsOptional()
  @IsString()
  seoKeywords?: string;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
