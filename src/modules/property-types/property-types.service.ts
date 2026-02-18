import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { PropertyType } from '../../entities/property-type.entity';
import {
  CreatePropertyTypeDto,
  UpdatePropertyTypeDto,
  UpdatePropertyTypeFeaturesDto,
} from './dto/property-type.dto';

@Injectable()
export class PropertyTypesService {
  constructor(
    @InjectRepository(PropertyType)
    private readonly propertyTypeRepository: Repository<PropertyType>,
  ) {}

  async create(
    createPropertyTypeDto: CreatePropertyTypeDto,
  ): Promise<PropertyType> {
    // Check if name already exists
    const existingPropertyType = await this.propertyTypeRepository.findOne({
      where: { name: createPropertyTypeDto.name, deletedAt: IsNull() },
    });
    if (existingPropertyType) {
      throw new ConflictException('El nombre del tipo de propiedad ya existe');
    }

    const propertyType = this.propertyTypeRepository.create(
      createPropertyTypeDto,
    );
    return await this.propertyTypeRepository.save(propertyType);
  }

  async findAll(): Promise<PropertyType[]> {
    return await this.propertyTypeRepository.find({
      where: { deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async findAllMinimal(): Promise<{ id: string; name: string }[]> {
    const propertyTypes = await this.propertyTypeRepository.find({
      select: ['id', 'name'],
      where: { deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    return propertyTypes;
  }

  async findAllWithFeatures(): Promise<{ id: string; name: string; hasBedrooms: boolean; hasBathrooms: boolean; hasParkingSpaces: boolean }[]> {
    const propertyTypes = await this.propertyTypeRepository.find({
      select: ['id', 'name', 'hasBedrooms', 'hasBathrooms', 'hasParkingSpaces'],
      where: { deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    return propertyTypes;
  }

  async findOne(id: string): Promise<PropertyType> {
    const propertyType = await this.propertyTypeRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!propertyType) {
      throw new NotFoundException('Tipo de propiedad no encontrado');
    }

    return propertyType;
  }

  async update(
    id: string,
    updatePropertyTypeDto: UpdatePropertyTypeDto,
  ): Promise<PropertyType> {
    const propertyType = await this.findOne(id);

    // Check if name already exists (if being updated)
    if (
      updatePropertyTypeDto.name &&
      updatePropertyTypeDto.name !== propertyType.name
    ) {
      const existingPropertyType = await this.propertyTypeRepository.findOne({
        where: { name: updatePropertyTypeDto.name, deletedAt: IsNull() },
      });
      if (existingPropertyType) {
        throw new ConflictException(
          'El nombre del tipo de propiedad ya existe',
        );
      }
    }

    Object.assign(propertyType, updatePropertyTypeDto);
    return await this.propertyTypeRepository.save(propertyType);
  }

  async softDelete(id: string): Promise<void> {
    const propertyType = await this.findOne(id);
    await this.propertyTypeRepository.softDelete(id);
  }

  async updateFeatures(
    id: string,
    updateFeaturesDto: UpdatePropertyTypeFeaturesDto,
  ): Promise<PropertyType> {
    const propertyType = await this.findOne(id);

    // Update only the feature fields
    if (updateFeaturesDto.hasBedrooms !== undefined) {
      propertyType.hasBedrooms = updateFeaturesDto.hasBedrooms;
    }
    if (updateFeaturesDto.hasBathrooms !== undefined) {
      propertyType.hasBathrooms = updateFeaturesDto.hasBathrooms;
    }
    if (updateFeaturesDto.hasBuiltSquareMeters !== undefined) {
      propertyType.hasBuiltSquareMeters = updateFeaturesDto.hasBuiltSquareMeters;
    }
    if (updateFeaturesDto.hasLandSquareMeters !== undefined) {
      propertyType.hasLandSquareMeters = updateFeaturesDto.hasLandSquareMeters;
    }
    if (updateFeaturesDto.hasParkingSpaces !== undefined) {
      propertyType.hasParkingSpaces = updateFeaturesDto.hasParkingSpaces;
    }
    if (updateFeaturesDto.hasFloors !== undefined) {
      propertyType.hasFloors = updateFeaturesDto.hasFloors;
    }
    if (updateFeaturesDto.hasConstructionYear !== undefined) {
      propertyType.hasConstructionYear = updateFeaturesDto.hasConstructionYear;
    }

    return await this.propertyTypeRepository.save(propertyType);
  }
}
