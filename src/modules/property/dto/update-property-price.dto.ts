import { IsOptional, IsString, IsEnum, IsNumber, Min } from 'class-validator';
import { CurrencyPriceEnum } from '../../../entities/property.entity';

/**
 * DTO para actualizar la información de precio y SEO de una propiedad.
 * Campos permitidos:
 * - price
 * - currencyPrice
 * - seoTitle
 * - seoDescription
 */
export class UpdatePropertyPriceDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsEnum(CurrencyPriceEnum)
  currencyPrice?: CurrencyPriceEnum;

  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;
}