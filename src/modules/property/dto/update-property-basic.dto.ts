import { IsOptional, IsString, IsEnum, IsUUID, IsBoolean, IsNumber } from 'class-validator';
import { PropertyStatus } from '../../../common/enums/property-status.enum';
import { PropertyOperationType } from '../../../common/enums/property-operation-type.enum';

/**
 * DTO para actualizar solo la información básica de una propiedad.
 * Campos permitidos:
 * - title
 * - description
 * - status
 * - operationType
 * - propertyTypeId
 * - assignedAgentId
 * - isFeatured
 * - price
 * - currencyPrice
 */
export class UpdatePropertyBasicDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @IsOptional()
  @IsEnum(PropertyOperationType)
  operationType?: PropertyOperationType;

  @IsOptional()
  @IsUUID()
  propertyTypeId?: string;

  @IsOptional()
  @IsUUID()
  assignedAgentId?: string;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  @IsEnum(['CLP', 'UF'])
  currencyPrice?: string;
}
