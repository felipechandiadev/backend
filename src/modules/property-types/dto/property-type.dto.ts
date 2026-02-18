import { IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreatePropertyTypeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  hasBedrooms?: boolean;

  @IsBoolean()
  @IsOptional()
  hasBathrooms?: boolean;

  @IsBoolean()
  @IsOptional()
  hasBuiltSquareMeters?: boolean;

  @IsBoolean()
  @IsOptional()
  hasLandSquareMeters?: boolean;

  @IsBoolean()
  @IsOptional()
  hasParkingSpaces?: boolean;

  @IsBoolean()
  @IsOptional()
  hasFloors?: boolean;

  @IsBoolean()
  @IsOptional()
  hasConstructionYear?: boolean;
}

export class UpdatePropertyTypeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  hasBedrooms?: boolean;

  @IsBoolean()
  @IsOptional()
  hasBathrooms?: boolean;

  @IsBoolean()
  @IsOptional()
  hasBuiltSquareMeters?: boolean;

  @IsBoolean()
  @IsOptional()
  hasLandSquareMeters?: boolean;

  @IsBoolean()
  @IsOptional()
  hasParkingSpaces?: boolean;

  @IsBoolean()
  @IsOptional()
  hasFloors?: boolean;

  @IsBoolean()
  @IsOptional()
  hasConstructionYear?: boolean;
}

export class UpdatePropertyTypeFeaturesDto {
  @IsBoolean()
  @IsOptional()
  hasBedrooms?: boolean;

  @IsBoolean()
  @IsOptional()
  hasBathrooms?: boolean;

  @IsBoolean()
  @IsOptional()
  hasBuiltSquareMeters?: boolean;

  @IsBoolean()
  @IsOptional()
  hasLandSquareMeters?: boolean;

  @IsBoolean()
  @IsOptional()
  hasParkingSpaces?: boolean;

  @IsBoolean()
  @IsOptional()
  hasFloors?: boolean;

  @IsBoolean()
  @IsOptional()
  hasConstructionYear?: boolean;
}
