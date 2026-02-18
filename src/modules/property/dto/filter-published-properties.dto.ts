import { IsOptional, IsString, IsNumberString, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterPublishedPropertiesDto {
  @IsOptional()
  @IsIn(['CLP', 'UF', 'all'])
  currency?: string = 'all';

  @IsOptional()
  @IsNumberString()
  state?: string;

  @IsOptional()
  @IsNumberString()
  city?: string;

  @IsOptional()
  @IsString()
  @IsIn(['Casa', 'Departamento', 'Terreno', 'Local Comercial', 'Oficina'])
  typeProperty?: string;

  @IsOptional()
  @IsIn(['Arriendo', 'Venta'])
  operation?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  static readonly LIMIT = 9;
}
