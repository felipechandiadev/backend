import { IsString, IsOptional, IsNumber, Min, Max, IsNotEmpty } from 'class-validator';

export class UpdatePropertyLocationDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'La dirección no puede estar vacía' })
  address?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'La región no puede estar vacía' })
  state?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'La comuna no puede estar vacía' })
  city?: string;

  @IsOptional()
  @IsNumber({}, { message: 'La latitud debe ser un número válido' })
  @Min(-90, { message: 'La latitud debe ser mayor o igual a -90' })
  @Max(90, { message: 'La latitud debe ser menor o igual a 90' })
  latitude?: number;

  @IsOptional()
  @IsNumber({}, { message: 'La longitud debe ser un número válido' })
  @Min(-180, { message: 'La longitud debe ser mayor o igual a -180' })
  @Max(180, { message: 'La longitud debe ser menor o igual a 180' })
  longitude?: number;
}