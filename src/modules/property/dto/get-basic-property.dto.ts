import { Expose, Type } from 'class-transformer';
import { PropertyStatus } from '../../../common/enums/property-status.enum';
import { PropertyOperationType } from '../../../common/enums/property-operation-type.enum';
import { CurrencyPriceEnum } from '../../../entities/property.entity';

// User info DTO
class CreatorUserDto {
  @Expose()
  id: string;

  @Expose()
  username?: string;

  @Expose()
  email?: string;

  @Expose()
  personalInfo?: any; // JSON object with name, phone, etc.
}

// Property type DTO
class PropertyTypeDto {
  @Expose()
  id: string;

  @Expose()
  name: string;
}

/**
 * Basic property information DTO
 * Retorna solo la información básica de la propiedad + usuario creador
 */
export class GetBasicPropertyDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  description?: string;

  @Expose()
  status: PropertyStatus;

  @Expose()
  operationType: PropertyOperationType;

  @Expose()
  price: number;

  @Expose()
  currencyPrice: CurrencyPriceEnum;

  @Expose()
  @Type(() => PropertyTypeDto)
  propertyType?: PropertyTypeDto;

  @Expose()
  @Type(() => CreatorUserDto)
  creatorUser?: CreatorUserDto;

  @Expose()
  publicationDate?: Date;

  @Expose()
  assignedAgentId?: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
