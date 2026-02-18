import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { PropertyTypesService } from './property-types.service';
import {
  CreatePropertyTypeDto,
  UpdatePropertyTypeDto,
  UpdatePropertyTypeFeaturesDto,
} from './dto/property-type.dto';

@Controller('property-types')
@ApiTags('Property Types')
export class PropertyTypesController {
  constructor(private readonly propertyTypesService: PropertyTypesService) {}

  /**
   * Create a new property type
   */
  @Post()
  @ApiOperation({ summary: 'Create new property type' })
  @ApiResponse({
    status: 201,
    description: 'Property type created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiBody({ type: CreatePropertyTypeDto })
  create(@Body(ValidationPipe) createPropertyTypeDto: CreatePropertyTypeDto) {
    return this.propertyTypesService.create(createPropertyTypeDto);
  }

  /**
   * Get all property types
   */
  @Get()
  @ApiOperation({ summary: 'Get all property types' })
  @ApiResponse({
    status: 200,
    description: 'List of all property types',
  })
  findAll() {
    return this.propertyTypesService.findAll();
  }

  /**
   * Get all property types (public endpoint - no authentication required)
   */
  @Get('public/list')
  @ApiOperation({ summary: 'Get property types (public - no auth required)' })
  @ApiResponse({
    status: 200,
    description: 'List of property types',
  })
  findAllPublic() {
    return this.propertyTypesService.findAll();
  }

  /**
   * Get property type by ID (public endpoint - no authentication required)
   */
  @Get('public/:id')
  @ApiOperation({ summary: 'Get property type by ID (public - no auth required)' })
  @ApiResponse({
    status: 200,
    description: 'Property type details with features',
  })
  @ApiResponse({
    status: 404,
    description: 'Property type not found',
  })
  @ApiParam({ name: 'id', type: String })
  findOnePublic(@Param('id') id: string) {
    return this.propertyTypesService.findOne(id);
  }

  /**
   * Get all property types (minimal data)
   */
  @Get('minimal')
  @ApiOperation({ summary: 'Get property types (minimal info)' })
  @ApiResponse({
    status: 200,
    description: 'List of property types with minimal data',
  })
  findAllMinimal() {
    return this.propertyTypesService.findAllMinimal();
  }

  /**
   * Get all property types with features
   */
  @Get('features')
  @ApiOperation({ summary: 'Get property types with features' })
  @ApiResponse({
    status: 200,
    description: 'List of property types with features (hasBedrooms, hasBathrooms, hasParkingSpaces)',
  })
  findAllWithFeatures() {
    return this.propertyTypesService.findAllWithFeatures();
  }

  /**
   * Get property type by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get property type by ID' })
  @ApiResponse({
    status: 200,
    description: 'Property type details',
  })
  @ApiResponse({
    status: 404,
    description: 'Property type not found',
  })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id') id: string) {
    return this.propertyTypesService.findOne(id);
  }

  /**
   * Update property type information
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update property type' })
  @ApiResponse({
    status: 200,
    description: 'Property type updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Property type not found',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdatePropertyTypeDto })
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updatePropertyTypeDto: UpdatePropertyTypeDto,
  ) {
    return this.propertyTypesService.update(id, updatePropertyTypeDto);
  }

  /**
   * Update property type features
   */
  @Patch(':id/features')
  @ApiOperation({ summary: 'Update property type features' })
  @ApiResponse({
    status: 200,
    description: 'Features updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Property type not found',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdatePropertyTypeFeaturesDto })
  updateFeatures(
    @Param('id') id: string,
    @Body(ValidationPipe) updateFeaturesDto: UpdatePropertyTypeFeaturesDto,
  ) {
    return this.propertyTypesService.updateFeatures(id, updateFeaturesDto);
  }

  /**
   * Delete property type (soft delete)
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete property type' })
  @ApiResponse({
    status: 200,
    description: 'Property type deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Property type not found',
  })
  @ApiParam({ name: 'id', type: String })
  softDelete(@Param('id') id: string) {
    return this.propertyTypesService.softDelete(id);
  }
}
