/**
 * DTO para la respuesta GET de datos SEO de una propiedad.
 * Incluye información de SEO y métricas de publicación.
 */
export class PropertySeoResponseDto {
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  isFeatured?: boolean;
  publicationDate?: Date;
  viewsCount?: number;
  favoritesCount?: number;
}
