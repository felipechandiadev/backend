import { Transform } from 'class-transformer';
import { IsBooleanString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GridSaleQueryDto {
  @IsOptional()
  @IsString()
  fields?: string; // comma-separated

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sort?: 'asc' | 'desc';

  @IsOptional()
  @IsString()
  sortField?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBooleanString()
  filtration?: string; // 'true' | 'false'

  @IsOptional()
  @IsString()
  filters?: string; // e.g. "city-Las Condes,typeName-Departamento"

  @IsOptional()
  @IsBooleanString()
  pagination?: string; // 'true' | 'false'

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : undefined))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : undefined))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
