import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ValidationPipe,
  Res,
  UseInterceptors,
  UploadedFiles,
  Req,
  UseGuards,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Response, Request } from 'express';
import { plainToClass } from 'class-transformer';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { PropertyService } from './property.service';
import { JweService } from '../../auth/jwe/jwe.service';
import { Property } from '../../entities/property.entity';
import { CreatePropertyDto, UpdatePropertyDto, UpdatePropertyCharacteristicsDto } from './dto/property.dto';
import { UpdatePropertyLocationDto } from './dto/update-property-location.dto';
import { UpdatePropertyBasicDto } from './dto/update-property-basic.dto';
import { CreatePropertyDto as CreatePropertyPayloadDto } from './dto/create-property.dto';
import { UpdateMainImageDto } from './dto/create-property.dto';
import { UpdatePropertyPriceDto } from './dto/update-property-price.dto';
import { UpdatePropertySeoDto } from './dto/update-property-seo.dto';
import { GridSaleQueryDto } from './dto/grid-sale.dto';
import { GridRentQueryDto } from './dto/grid-rent.dto';
import { GetFullPropertyDto } from './dto/get-full-property.dto';
import { FilterRentPropertiesDto } from './dto/filter-rent-properties.dto';
import { FilterSalePropertiesDto } from './dto/filter-sale-properties.dto';
import { ListAvailableRentPropertiesDto } from './dto/list-available-rent-properties.dto';
import { Audit } from '../../common/interceptors/audit.interceptor';
import { AuditAction, AuditEntityType } from '../../common/enums/audit.enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PropertyOperationType } from '../../common/enums/property-operation-type.enum';
import { UploadPropertyMultimediaDto } from './dto/upload-property-multimedia.dto';
import { FileUploadService } from '../../common/services/file-upload.service';
import { diskStorage } from 'multer';
import { extname } from 'path';

// Configuración de storage para uploads de propiedades
const propertyUploadStorage = diskStorage({
  destination: (req, file, callback) => {
    // Separar imágenes y videos en diferentes carpetas
    const isVideo = file.mimetype.startsWith('video/');
    const subfolder = isVideo ? 'video' : 'img';
    callback(null, `./public/properties/${subfolder}`);
  },
  filename: (req, file, callback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = extname(file.originalname);
    callback(null, `${uniqueSuffix}${ext}`);
  },
});

@ApiTags('Properties')
@Controller('properties')
export class PropertyController {
  constructor(
    private readonly propertyService: PropertyService,
    private readonly fileUploadService: FileUploadService,
    private readonly jweService: JweService,
  ) {}

  @Get('grid-sale/excel')
  @ApiOperation({ summary: 'Export sale properties to Excel' })
  @ApiResponse({ status: 200, description: 'Excel file exported successfully' })
  @ApiQuery({ name: 'fields', required: false, type: String, description: 'Comma-separated fields to export' })
  @ApiQuery({ name: 'sort', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
  @ApiQuery({ name: 'sortField', required: false, type: String, description: 'Field to sort by' })
  @Audit(AuditAction.READ, AuditEntityType.PROPERTY, 'Sale properties Excel exported')
  async exportSaleGridExcel(
    @Query(ValidationPipe) query: GridSaleQueryDto,
    @Res() res: Response,
  ) {
    const buffer = await this.propertyService.exportSalePropertiesExcel(query);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="propiedades-en-venta.xlsx"',
    });
    res.send(buffer);
  }

  @Get('grid-rent/excel')
  @ApiOperation({ summary: 'Export rent properties to Excel' })
  @ApiResponse({ status: 200, description: 'Excel file exported successfully' })
  @ApiQuery({ name: 'fields', required: false, type: String, description: 'Comma-separated fields to export' })
  @ApiQuery({ name: 'sort', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
  @ApiQuery({ name: 'sortField', required: false, type: String, description: 'Field to sort by' })
  @Audit(AuditAction.READ, AuditEntityType.PROPERTY, 'Rent properties Excel exported')
  async exportRentGridExcel(
    @Query(ValidationPipe) query: GridRentQueryDto,
    @Res() res: Response,
  ) {
    const buffer = await this.propertyService.exportRentPropertiesExcel(query);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="propiedades-en-arriendo.xlsx"',
    });
    res.send(buffer);
  }

  /**
   * Public endpoint to publish property with multimedia (no authentication required)
   */
  @Post('public/publish')
  @ApiTags('Properties')
  @ApiOperation({ summary: 'Publish a property with multimedia (public - no auth required)' })
  @ApiResponse({ status: 201, description: 'Property created successfully', type: Property })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: CreatePropertyPayloadDto,
    description: 'Property data with multimedia files',
  })
  @UseInterceptors(FilesInterceptor('multimediaFiles', 10, {
    storage: diskStorage({
      destination: (req, file, callback) => {
        const isVideo = file.mimetype.startsWith('video/');
        const subfolder = isVideo ? 'video' : 'img';
        callback(null, `./public/properties/${subfolder}`);
      },
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        callback(null, `${uniqueSuffix}${ext}`);
      },
    }),
    limits: { 
      fileSize: 70 * 1024 * 1024,
      files: 10
    },
    fileFilter: (req, file, callback) => {
      const allowedMimes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'
      ];
      
      if (!allowedMimes.includes(file.mimetype)) {
        callback(new Error(`Tipo de archivo ${file.mimetype} no permitido`), false);
        return;
      }

      const isVideo = file.mimetype.startsWith('video/');
      const maxSizeInBytes = isVideo ? 70 * 1024 * 1024 : 10 * 1024 * 1024;
      const maxSizeLabel = isVideo ? '70MB' : '10MB';
      const fileType = isVideo ? 'videos' : 'imágenes';

      if (file.size > maxSizeInBytes) {
        callback(new Error(`Archivo demasiado grande. Máximo permitido: ${maxSizeLabel} para ${fileType}`), false);
        return;
      }

      callback(null, true);
    }
  }))
  async publishPublic(
    @Body() body: any,
    @Req() request: any,
    @UploadedFiles() files?: Express.Multer.File[]
  ) {
    console.log('🏠 [PropertyController] PUBLIC PUBLISH - STARTING PROPERTY CREATION');
    
    let createPropertyDto: CreatePropertyPayloadDto;
    try {
      if (body.data) {
        createPropertyDto = typeof body.data === 'string'
          ? JSON.parse(body.data)
          : body.data;
      } else {
        createPropertyDto = body;
      }
    } catch (error) {
      throw new BadRequestException(`Invalid JSON in data field: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Validate the DTO
    const validatedDto = await new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true }
    }).transform(createPropertyDto, { type: 'body', metatype: CreatePropertyPayloadDto });

    console.log('✅ [PropertyController] DTO validated successfully');

    // Call the service using createPropertyWithFiles
    // We check for an optional token to associate the property with a logged-in user
    let creatorId = 'anonymous';
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const payload = await this.jweService.decrypt(token);
        if (payload && payload.sub) {
          creatorId = payload.sub;
          console.log(`👤 [PropertyController] PUBLIC PUBLISH - Authenticated user detected: ${creatorId}`);
        }
      } catch (error) {
        console.warn('⚠️ [PropertyController] PUBLIC PUBLISH - Token provided but invalid/expired');
      }
    }

    return this.propertyService.createPropertyWithFiles(validatedDto, creatorId, files || []);
  }

  @Post()
  @ApiTags('Properties')
  @ApiOperation({ summary: 'Create a new property with multimedia' })
  @ApiResponse({ status: 201, description: 'Property created successfully', type: Property })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: CreatePropertyPayloadDto,
    description: 'Property data with multimedia files',
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('multimediaFiles', 10, {
    storage: diskStorage({
      destination: (req, file, callback) => {
        // Separar imágenes y videos en diferentes carpetas
        const isVideo = file.mimetype.startsWith('video/');
        const subfolder = isVideo ? 'video' : 'img';
        callback(null, `./public/properties/${subfolder}`);
      },
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        callback(null, `${uniqueSuffix}${ext}`);
      },
    }),
    limits: { 
      fileSize: 70 * 1024 * 1024, // Máximo global 70MB (para videos)
      files: 10 // Máximo 10 archivos
    },
    fileFilter: (req, file, callback) => {
      // Validar tipos de archivo permitidos
      const allowedMimes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'
      ];
      
      if (!allowedMimes.includes(file.mimetype)) {
        callback(new Error(`Tipo de archivo ${file.mimetype} no permitido`), false);
        return;
      }

      // Validar tamaño específico por tipo de archivo
      const isVideo = file.mimetype.startsWith('video/');
      const maxSizeInBytes = isVideo ? 70 * 1024 * 1024 : 10 * 1024 * 1024; // 70MB para videos, 10MB para imágenes
      const maxSizeLabel = isVideo ? '70MB' : '10MB';
      const fileType = isVideo ? 'videos' : 'imágenes';

      if (file.size > maxSizeInBytes) {
        callback(new Error(`Archivo demasiado grande. Máximo permitido: ${maxSizeLabel} para ${fileType}`), false);
        return;
      }

      callback(null, true);
    }
  }))
  @Audit(AuditAction.CREATE, AuditEntityType.PROPERTY, 'Property created')
  async create(
    @Body() body: any,
    @Req() request: any,
    @UploadedFiles() files?: Express.Multer.File[]
  ) {
    console.log('🏠 [PropertyController] ===== STARTING PROPERTY CREATION =====');
    console.log('📄 [PropertyController] Raw body received:', Object.keys(body));
    console.log('📄 [PropertyController] Raw body content:', body);
    console.log('📄 [PropertyController] Request headers:', {
      'content-type': request.headers['content-type'],
      'content-length': request.headers['content-length']
    });
    console.log('📸 [PropertyController] Files received count:', files?.length || 0);
    console.log('📋 [PropertyController] Files received details:', files?.map(f => ({
      fieldname: f.fieldname,
      originalName: f.originalname,
      filename: f.filename,
      size: f.size,
      mimetype: f.mimetype,
      buffer: f.buffer ? 'HAS_BUFFER' : 'NO_BUFFER',  // ← VERIFICA QUE TENGAN BUFFER
      path: f.path || 'NO_PATH'
    })) || []);

    // Log masked authentication info for diagnostics
    try {
      const authHeader = request.headers['authorization'] || request.headers['Authorization'];
      const cookieHeader = request.headers['cookie'];
      const mask = (s: string | undefined | null) => {
        if (!s) return 'none';
        const str = String(s);
        return str.length > 24 ? `${str.substring(0, 8)}...${str.slice(-8)}` : str;
      };
      console.log('🔐 [PropertyController] Auth header:', mask(authHeader));
      console.log('🍪 [PropertyController] Cookie header:', mask(cookieHeader));
    } catch (err) {
      console.warn('[PropertyController] Failed to log auth cookie/header', err);
    }

    // Parse the 'data' field from FormData which contains the JSON string
    let createPropertyDto: CreatePropertyPayloadDto;
    try {
      if (body.data) {
        // If data is sent as a field in the form
        createPropertyDto = typeof body.data === 'string'
          ? JSON.parse(body.data)
          : body.data;
      } else {
        // Fallback: assume the body is the DTO directly
        createPropertyDto = body;
      }

      console.log('📊 [PropertyController] Parsed property data:', {
        title: createPropertyDto.title,
        price: createPropertyDto.price,
        currencyPrice: createPropertyDto.currencyPrice,
        operationType: createPropertyDto.operationType,
        status: createPropertyDto.status
      });

      // Validate the DTO (sin agregar archivos que pueden ser filtrados)
      const validatedDto = await new ValidationPipe({
        transform: true,
        transformOptions: { enableImplicitConversion: true }
      }).transform(createPropertyDto, { type: 'body', metatype: CreatePropertyPayloadDto });

      console.log('✅ [PropertyController] DTO validated successfully');

      // Obtener el ID del usuario creador del request
      let creatorId = request.user?.id;

      // Fallback: if request.user is missing (guard didn't set it), try to decrypt the token directly
      if (!creatorId) {
        try {
          const authHeader = request.headers['authorization'] || request.headers['Authorization'];
          const token = authHeader ? String(authHeader).replace(/^Bearer\s+/i, '').trim() : null;
          if (token) {
            const payload = await this.jweService.decrypt(token);
            if (payload?.sub) {
              creatorId = payload.sub;
              console.log('👤 [PropertyController] Resolved creatorId from token fallback:', creatorId);
            }
          }
        } catch (err) {
          console.warn('[PropertyController] Token decrypt fallback failed:', err?.message ?? err);
        }
      }

      if (!creatorId) {
        console.error('❌ [PropertyController] No user ID found in request');
        throw new Error('User ID not found in request. Authentication required.');
      }

      console.log('👤 [PropertyController] Creator user ID:', creatorId);
      console.log('🚀 [PropertyController] About to call service with:', {
        filesCount: files?.length || 0,
        filesDetails: files?.map(f => ({
          originalname: f.originalname,
          filename: f.filename,
          size: f.size,
          path: f.path
        })) || []
      });

      // Pasar archivos como parámetro separado en lugar de dentro del DTO
      const result = await this.propertyService.createPropertyWithFiles(validatedDto, creatorId, files || []);

      console.log('🎉 [PropertyController] Property created successfully:', {
        id: result?.id,
        title: result?.title,
        multimediaCount: result?.multimedia?.length || 0
      });

      return result;
    } catch (error) {
      console.error('[PropertyController] Error creating property:', error);

      // Re-throw known Nest exceptions
      if (error instanceof BadRequestException) {
        throw error;
      }

      // If authentication-related, return 401
      const msg = error?.message || '';
      if (msg.includes('Authentication required') || msg.includes('User ID not found') || msg.toLowerCase().includes('token')) {
        // Use UnauthorizedException to return 401
        throw new UnauthorizedException(msg || 'Authentication failed');
      }

      if (msg.includes('validation')) {
        throw new BadRequestException(`Validation error: ${msg}`);
      }

      if (msg.includes('multimedia') || msg.includes('upload')) {
        throw new BadRequestException(`File upload error: ${msg}`);
      }

      throw new BadRequestException(`Failed to create property: ${msg}`);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all properties with filters' })
  @ApiResponse({ status: 200, description: 'List of properties', type: [Property] })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'operationType', required: false, type: String })
  @Audit(AuditAction.READ, AuditEntityType.PROPERTY, 'Properties listed')
  findAll(@Query() filters: any) {
    return this.propertyService.findAll(filters);
  }

  @Get('grid-sale')
  @ApiOperation({ summary: 'Get sale properties grid with pagination' })
  @ApiResponse({ status: 200, description: 'Grid of sale properties' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sort', required: false, enum: ['asc', 'desc'] })
  @Audit(AuditAction.READ, AuditEntityType.PROPERTY, 'Sale properties grid viewed')
  gridSale(@Query(ValidationPipe) query: GridSaleQueryDto) {
    return this.propertyService.gridSaleProperties(query);
  }

  @Get('grid-rent')
  @ApiOperation({ summary: 'Get rent properties grid with pagination' })
  @ApiResponse({ status: 200, description: 'Grid of rent properties' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sort', required: false, enum: ['asc', 'desc'] })
  @Audit(AuditAction.READ, AuditEntityType.PROPERTY, 'Rent properties grid viewed')
  gridRent(@Query(ValidationPipe) query: GridRentQueryDto) {
    return this.propertyService.gridRentProperties(query);
  }

  @Get('available-rent')
  @ApiOperation({ summary: 'List rent properties available for contract creation' })
  @ApiResponse({ status: 200, description: 'List of available rent properties' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Audit(AuditAction.READ, AuditEntityType.PROPERTY, 'Available rent properties listed for contracts')
  listAvailableRent(@Query(ValidationPipe) query: ListAvailableRentPropertiesDto) {
    return this.propertyService.listAvailableRentProperties(query);
  }

  /**
   * Endpoint público (sin token) para listar propiedades publicadas visibles en el portal.
   */
  @Get('public')
  @ApiOperation({ summary: 'Get published properties for portal (public)' })
  @ApiResponse({ status: 200, description: 'List of published properties' })
  @Audit(AuditAction.READ, AuditEntityType.PROPERTY, 'Public list of published properties')
  async listPublishedPublic() {
    return await this.propertyService.listPublishedPublic();
  }

  @Get('public/featured')
  @ApiOperation({ summary: 'Get featured properties (public)' })
  @ApiResponse({ status: 200, description: 'List of featured properties' })
  async getPublicFeatured() {
    const data = await this.propertyService.findPublishedFeaturedPublic();
    return { success: true, data };
  }

  @Get('public/featured/paginated')
  @ApiOperation({ summary: 'Get featured properties with pagination (public)' })
  @ApiResponse({ status: 200, description: 'Paginated list of featured properties' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPublicFeaturedPaginated(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.min(Math.max(1, parseInt(limit, 10)), 100) : 9;
    const data = await this.propertyService.findPublishedFeaturedPublicPaginated(pageNum, limitNum);
    return { success: true, ...data };
  }

  /**
   * Devuelve todos los detalles de la propiedad, incluyendo relaciones y datos agregados.
   */
  @Get(':id/full')
  @ApiOperation({ summary: 'Get full property details with all relations' })
  @ApiResponse({ status: 200, description: 'Complete property details', type: GetFullPropertyDto })
  @ApiParam({ name: 'id', type: String, description: 'Property ID' })
  @Audit(AuditAction.READ, AuditEntityType.PROPERTY, 'Full property details viewed')
  async getFullProperty(@Param('id') id: string): Promise<GetFullPropertyDto> {
    return await this.propertyService.getFullProperty(id);
  }

  /**
   * Actualiza solo la información básica de la propiedad
   */
  @Patch(':id/basic')
  @ApiOperation({ summary: 'Update basic property information' })
  @ApiResponse({ status: 200, description: 'Property updated', type: Property })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdatePropertyBasicDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Audit(AuditAction.UPDATE, AuditEntityType.PROPERTY, 'Property basic info updated')
  async updateBasic(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdatePropertyBasicDto,
    @Req() request: any,
  ): Promise<Property> {
    console.log('✅ PATCH :id/basic endpoint called with:', { id, dto });
    const user = request?.user;
    const userId = user?.id || user?.sub || (typeof user === 'string' ? user : undefined);
    return await this.propertyService.update(id, dto as UpdatePropertyDto, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update property information' })
  @ApiResponse({ status: 200, description: 'Property updated successfully', type: Property })
  @ApiResponse({ status: 404, description: 'Property not found' })
  @ApiParam({ name: 'id', type: String, description: 'Property ID' })
  @ApiBody({ type: UpdatePropertyDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Audit(AuditAction.UPDATE, AuditEntityType.PROPERTY, 'Property updated')
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updatePropertyDto: UpdatePropertyDto,
    @Req() request: any,
  ) {
    const user = request?.user;
    const userId = user?.id || user?.sub || (typeof user === 'string' ? user : undefined);
    return this.propertyService.update(id, updatePropertyDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete property' })
  @ApiResponse({ status: 200, description: 'Property deleted successfully' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  @ApiParam({ name: 'id', type: String })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Audit(AuditAction.DELETE, AuditEntityType.PROPERTY, 'Property deleted')
  remove(@Param('id') id: string, @Req() req: Request) {
    const userId = this.extractUserId(req);
    return this.propertyService.remove(id, userId);
  }

    /**
   * Total de propiedades en venta
   */
  @Get('count-sale')
  @ApiOperation({ summary: 'Get total count of sale properties' })
  @ApiResponse({ status: 200, description: 'Total count returned' })
  @Audit(AuditAction.READ, AuditEntityType.PROPERTY, 'Count sale properties')
  async countSaleProperties() {
    return { total: await this.propertyService.countSaleProperties() };
  }

  /**
   * Total de propiedades publicadas
   */
  @Get('count-published')
  @ApiOperation({ summary: 'Get total count of published properties' })
  @ApiResponse({ status: 200, description: 'Total count returned' })
  @Audit(AuditAction.READ, AuditEntityType.PROPERTY, 'Count published properties')
  async countPublishedProperties() {
    return { total: await this.propertyService.countPublishedProperties() };
  }

  /**
   * Total de propiedades destacadas
   */
  @Get('count-featured')
  @ApiOperation({ summary: 'Get total count of featured properties' })
  @ApiResponse({ status: 200, description: 'Total count returned' })
  @Audit(AuditAction.READ, AuditEntityType.PROPERTY, 'Count featured properties')
  async countFeaturedProperties() {
    return { total: await this.propertyService.countFeaturedProperties() };
  }

  @Patch(':id/main-image')
  @ApiOperation({ summary: 'Update property main image' })
  @ApiResponse({ status: 200, description: 'Main image updated', type: Property })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateMainImageDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Audit(AuditAction.UPDATE, AuditEntityType.PROPERTY, 'Main image updated')
  async updateMainImage(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true })) dto: UpdateMainImageDto,
    @Req() req: any,
  ): Promise<Property> {
    const userId = this.extractUserId(req);
    return this.propertyService.updateMainImage(id, dto.mainImageUrl, userId);
  }

  /**
   * Actualiza la información de precio y SEO de una propiedad
   */
  @Patch(':id/price')
  @ApiOperation({ summary: 'Update property price and SEO information' })
  @ApiResponse({ status: 200, description: 'Price updated', type: Property })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdatePropertyPriceDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Audit(AuditAction.UPDATE, AuditEntityType.PROPERTY, 'Property price and SEO updated')
  async updatePrice(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdatePropertyPriceDto,
    @Req() req: any,
  ): Promise<Property> {
    const userId = this.extractUserId(req);
    return this.propertyService.updatePrice(id, dto, userId);
  }

  /**
   * Actualiza las características de una propiedad
   */
  @Patch(':id/characteristics')
  @ApiOperation({ summary: 'Update property characteristics' })
  @ApiResponse({ status: 200, description: 'Characteristics updated', type: Property })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdatePropertyCharacteristicsDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Audit(AuditAction.UPDATE, AuditEntityType.PROPERTY, 'Property characteristics updated')
  async updateCharacteristics(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdatePropertyCharacteristicsDto,
    @Req() req: any,
  ): Promise<Property> {
    const userId = this.extractUserId(req);
    return this.propertyService.updateCharacteristics(id, dto, userId);
  }

  /**
   * Actualiza la ubicación de una propiedad
   */
  @Patch(':id/location')
  @ApiOperation({ summary: 'Update property location' })
  @ApiResponse({ status: 200, description: 'Location updated', type: Property })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdatePropertyLocationDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Audit(AuditAction.UPDATE, AuditEntityType.PROPERTY, 'Property location updated')
  async updateLocation(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdatePropertyLocationDto,
    @Req() req: any,
  ): Promise<Property> {
    const userId = this.extractUserId(req);
    return this.propertyService.updateLocation(id, dto, userId);
  }

  /**
   * Obtiene datos SEO de una propiedad
   */
  @Get(':id/seo')
  @ApiOperation({ summary: 'Get property SEO data' })
  @ApiResponse({ status: 200, description: 'SEO data retrieved' })
  @ApiParam({ name: 'id', type: String })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Audit(AuditAction.READ, AuditEntityType.PROPERTY, 'Property SEO data retrieved')
  async getSeoData(@Param('id') id: string) {
    return await this.propertyService.getSeoData(id);
  }

  /**
   * Actualiza datos SEO de una propiedad
   */
  @Patch(':id/seo')
  @ApiOperation({ summary: 'Update property SEO data' })
  @ApiResponse({ status: 200, description: 'SEO data updated' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdatePropertySeoDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Audit(AuditAction.UPDATE, AuditEntityType.PROPERTY, 'Property SEO data updated')
  async updateSeoData(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdatePropertySeoDto,
    @Req() req: any,
  ) {
    const userId = this.extractUserId(req);
    return await this.propertyService.updateSeoData(id, dto, userId);
  }

  /**
   * Verifica si una multimedia específica es la imagen principal de la propiedad
   */
  @Get(':propertyId/multimedia/:multimediaId/is-main')
  @ApiOperation({ summary: 'Check if multimedia is main image' })
  @ApiResponse({ status: 200, description: 'Boolean result' })
  @ApiParam({ name: 'propertyId', type: String })
  @ApiParam({ name: 'multimediaId', type: String })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Audit(AuditAction.READ, AuditEntityType.PROPERTY, 'Multimedia main status checked')
  async isMultimediaMain(
    @Param('propertyId') propertyId: string,
    @Param('multimediaId') multimediaId: string,
  ): Promise<{ isMain: boolean }> {
    const isMain = await this.propertyService.isMultimediaMain(propertyId, multimediaId);
    return { isMain };
  }

  /**
   * Get published properties with filters and pagination (9 per page)
   * Query params: currency, state, city, typeProperty, operation, page, bedrooms, bathrooms, parkingSpaces, bedroomsOperator, bathroomsOperator, parkingSpacesOperator, builtSquareMetersMin, landSquareMetersMin, constructionYearMin
   */
  @Get('published/filtered')
  @ApiOperation({ summary: 'Get published properties with filters' })
  @ApiResponse({ status: 200, description: 'Filtered properties list' })
  @ApiQuery({ name: 'currency', required: false })
  @ApiQuery({ name: 'state', required: false })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'typeProperty', required: false })
  @ApiQuery({ name: 'operation', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'bedrooms', required: false, type: Number })
  @ApiQuery({ name: 'bathrooms', required: false, type: Number })
  @ApiQuery({ name: 'parkingSpaces', required: false, type: Number })
  @ApiQuery({ name: 'bedroomsOperator', required: false, enum: ['lte', 'eq', 'gte'] })
  @ApiQuery({ name: 'bathroomsOperator', required: false, enum: ['lte', 'eq', 'gte'] })
  @ApiQuery({ name: 'parkingSpacesOperator', required: false, enum: ['lte', 'eq', 'gte'] })
  @ApiQuery({ name: 'builtSquareMetersMin', required: false, type: Number })
  @ApiQuery({ name: 'landSquareMetersMin', required: false, type: Number })
  @ApiQuery({ name: 'constructionYearMin', required: false, type: Number })
  async getPublishedPropertiesFiltered(
    @Query(new ValidationPipe({ transform: true })) filters: any,
  ) {
    return this.propertyService.getPublishedPropertiesFiltered(filters);
  }

  /**
   * Get published rent properties with filters and pagination
   * Automatically filters by operationType = 'RENT'
   */
  @Get('rent')
  @ApiOperation({ summary: 'Get published rent properties with filters' })
  @ApiResponse({ status: 200, description: 'Filtered rent properties list' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'priceMin', required: false, type: Number })
  @ApiQuery({ name: 'priceMax', required: false, type: Number })
  @ApiQuery({ name: 'bedrooms', required: false, type: Number })
  @ApiQuery({ name: 'bathrooms', required: false, type: Number })
  @ApiQuery({ name: 'typeProperty', required: false, type: String })
  @ApiQuery({ name: 'state', required: false, type: String })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'currency', required: false, type: String })
  @ApiQuery({ name: 'sort', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Audit(AuditAction.READ, AuditEntityType.PROPERTY, 'Rent properties filtered')
  async getPublishedRentPropertiesFiltered(
    @Query(new ValidationPipe({ transform: true })) dto: FilterRentPropertiesDto,
  ) {
    return this.propertyService.getPublishedRentPropertiesFiltered(dto);
  }

  /**
   * Get price range for published properties
   */
  @Get('price-range')
  @ApiOperation({ summary: 'Get min and max price for published properties' })
  @ApiResponse({ status: 200, description: 'Price range retrieved', schema: {
    type: 'object',
    properties: {
      minPrice: { type: 'number' },
      maxPrice: { type: 'number' }
    }
  }})
  @ApiQuery({ name: 'operationType', required: false, enum: ['SALE', 'RENT'], description: 'Filter by operation type' })
  async getPriceRange(
    @Query('operationType') operationType?: PropertyOperationType,
  ) {
    return this.propertyService.getPriceRange(operationType);
  }

  /**
   * Get related properties based on similarity algorithm
   */
  @Get('related/:id')
  @ApiOperation({ summary: 'Get related properties for a specific property' })
  @ApiResponse({ status: 200, description: 'Related properties retrieved', type: [Property] })
  @ApiParam({ name: 'id', description: 'Property ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum number of related properties (default: 5)' })
  async getRelatedProperties(
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ) {
    const maxLimit = limit ? Math.min(Math.max(parseInt(String(limit), 10), 3), 10) : 5;
    return this.propertyService.getRelatedProperties(id, maxLimit);
  }

  /**
   * Get published sale properties with filters and pagination
   * Automatically filters by operationType = 'SALE'
   */
  @Get('sale')
  @ApiOperation({ summary: 'Get published sale properties with filters' })
  @ApiResponse({ status: 200, description: 'Filtered sale properties list' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'priceMin', required: false, type: Number })
  @ApiQuery({ name: 'priceMax', required: false, type: Number })
  @ApiQuery({ name: 'bedrooms', required: false, type: Number })
  @ApiQuery({ name: 'bathrooms', required: false, type: Number })
  @ApiQuery({ name: 'typeProperty', required: false, type: String })
  @ApiQuery({ name: 'state', required: false, type: String })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'currency', required: false, type: String })
  @ApiQuery({ name: 'sort', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Audit(AuditAction.READ, AuditEntityType.PROPERTY, 'Sale properties filtered')
  async getPublishedSalePropertiesFiltered(
    @Query(new ValidationPipe({ transform: true })) dto: FilterSalePropertiesDto,
  ) {
    return this.propertyService.getPublishedSalePropertiesFiltered(dto);
  }

  /**
   * Crear una solicitud de publicación de propiedad desde el portal
   */
  @Post('request')
  @ApiOperation({ summary: 'Create property request from portal' })
  @ApiResponse({ status: 201, description: 'Property request created', type: Property })
  @ApiBody({ type: Object })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Audit(AuditAction.CREATE, AuditEntityType.PROPERTY, 'Property request created from portal')
  async createPropertyRequest(
    @Body(ValidationPipe) dto: any,
    @Req() req: any,
  ): Promise<Property> {
    const userId = this.extractUserId(req);
    return this.propertyService.createPropertyRequest(dto, userId);
  }

  /**
   * Get basic property information by ID (title, price, type, creator user)
   */
  @Get(':id/basic')
  @UseGuards(JwtAuthGuard)
  @Audit(AuditAction.READ, AuditEntityType.PROPERTY, 'Basic property info retrieved')
  async getBasicPropertyInfo(@Param('id') propertyId: string) {
    return this.propertyService.getBasicPropertyInfo(propertyId);
  }

  /**
   * Get property header information by ID (title, status)
   */
  @Get(':id/header')
  @UseGuards(JwtAuthGuard)
  @Audit(AuditAction.READ, AuditEntityType.PROPERTY, 'Property header info retrieved')
  async getPropertyHeaderInfo(@Param('id') propertyId: string) {
    return this.propertyService.getPropertyHeaderInfo(propertyId);
  }

  @Get(':id/characteristics')
  @UseGuards(JwtAuthGuard)
  @Audit(AuditAction.READ, AuditEntityType.PROPERTY, 'Property characteristics retrieved')
  async getPropertyCharacteristics(@Param('id') propertyId: string) {
    return this.propertyService.getPropertyCharacteristics(propertyId);
  }

  @Post(':id/multimedia')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 20, {
    storage: diskStorage({
      destination: (req, file, callback) => {
        // Separar imágenes y videos en diferentes carpetas
        const isVideo = file.mimetype.startsWith('video/');
        const subfolder = isVideo ? 'video' : 'img';
        callback(null, `./public/properties/${subfolder}`);
      },
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        const filename = `${uniqueSuffix}${ext}`;
        callback(null, filename);
      },
    }),
    limits: {
      fileSize: 70 * 1024 * 1024, // Máximo global 70MB (para videos)
      files: 20 // Máximo 20 archivos
    },
    fileFilter: (req, file, callback) => {
      // Validar tipos de archivo permitidos
      const allowedMimes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'
      ];

      if (!allowedMimes.includes(file.mimetype)) {
        callback(new Error('Tipo de archivo no permitido'), false);
        return;
      }

      // Validar tamaño específico por tipo de archivo
      const isVideo = file.mimetype.startsWith('video/');
      const maxSizeInBytes = isVideo ? 70 * 1024 * 1024 : 10 * 1024 * 1024; // 70MB para videos, 10MB para imágenes
      const maxSizeLabel = isVideo ? '70MB' : '10MB';
      const fileType = isVideo ? 'videos' : 'imágenes';

      if (file.size > maxSizeInBytes) {
        callback(new Error(`Archivo demasiado grande. Máximo permitido: ${maxSizeLabel} para ${fileType}`), false);
        return;
      }

      callback(null, true);
    },
  }))
  @Audit(AuditAction.CREATE, AuditEntityType.MULTIMEDIA, 'Multimedia uploaded to property')
  async uploadMultimedia(
    @Param('id') propertyId: string,
    @Body(new ValidationPipe({ transform: true })) dto: UploadPropertyMultimediaDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    console.log(`✅ Endpoint llamado: POST /properties/${propertyId}/multimedia`);
    console.log(`👤 Usuario: ${req.user?.id}`);
    console.log(`📁 Archivos recibidos: ${files?.length || 0}`);
    
    if (!files || files.length === 0) {
      console.error('❌ No se recibieron archivos');
      throw new BadRequestException('No se recibieron archivos');
    }

    const userId = this.extractUserId(req);
    const uploadedMultimedia = await this.propertyService.uploadMultimedia(propertyId, files, dto, userId);

    return {
      message: 'Multimedia uploaded successfully',
      data: uploadedMultimedia
    };
  }

  @Get(':id/location')
  @UseGuards(JwtAuthGuard)
  @Audit(AuditAction.READ, AuditEntityType.PROPERTY, 'Property location retrieved')
  async getPropertyLocation(@Param('id') propertyId: string) {
    return this.propertyService.getPropertyLocation(propertyId);
  }

  @Get(':id/multimedia')
  @UseGuards(JwtAuthGuard)
  @Audit(AuditAction.READ, AuditEntityType.PROPERTY, 'Property multimedia retrieved')
  async getPropertyMultimedia(@Param('id') propertyId: string) {
    return this.propertyService.getPropertyMultimedia(propertyId);
  }

  @Get(':id/history')
  @UseGuards(JwtAuthGuard)
  @Audit(AuditAction.READ, AuditEntityType.PROPERTY, 'Property history retrieved')
  async getPropertyHistory(@Param('id') propertyId: string) {
    const history = await this.propertyService.getPropertyHistory(propertyId);
    return { data: history };
  }

  @Patch(':id/toggle-favorite')
  @ApiOperation({ summary: 'Toggle property favorite for user' })
  @ApiResponse({ status: 200, description: 'Favorite toggled', schema: { example: { isFavorited: true } } })
  @ApiParam({ name: 'id', type: String, description: 'Property ID' })
  @ApiBody({ schema: { example: { userId: 'user-id-or-anonymous' } } })
  @Audit(AuditAction.UPDATE, AuditEntityType.PROPERTY, 'Property favorite toggled')
  async toggleFavorite(
    @Param('id') propertyId: string,
    @Body('userId') userId: string,
    @Req() req: any,
  ) {
    const result = await this.propertyService.toggleFavorite(propertyId, userId || 'anonymous');
    return {
      isFavorited: result.isFavorited,
    };
  }

  @Get(':id/favorite-status')
  @ApiOperation({ summary: 'Check if property is favorited by user' })
  @ApiResponse({ status: 200, description: 'Favorite status', schema: { example: { isFavorited: true } } })
  @ApiParam({ name: 'id', type: String, description: 'Property ID' })
  @Audit(AuditAction.READ, AuditEntityType.PROPERTY, 'Property favorite status checked')
  async getFavoriteStatus(
    @Param('id') propertyId: string,
    @Req() req: any,
  ) {
    const userId = this.extractUserId(req) || 'anonymous';
    const isFavorited = await this.propertyService.isFavorited(propertyId, userId);
    return {
      isFavorited,
    };
  }

  /**
   * Get property by ID - GENERIC ENDPOINT (MUST BE LAST to not interfere with specific routes)
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get property by ID' })
  @ApiResponse({ status: 200, description: 'Property details', type: Property })
  @ApiResponse({ status: 404, description: 'Property not found' })
  @ApiParam({ name: 'id', type: String, description: 'Property ID' })
  @Audit(AuditAction.READ, AuditEntityType.PROPERTY, 'Property viewed')
  findOne(@Param('id') id: string) {
    return this.propertyService.findOne(id);
  }

  @Get('user/:userId/grid')
  @ApiOperation({ summary: 'Get properties grid for a specific user' })
  @ApiResponse({ status: 200, description: 'Grid of user properties' })
  @ApiParam({ name: 'userId', type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sort', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'operationType', required: false, enum: PropertyOperationType })
  @Audit(AuditAction.READ, AuditEntityType.PROPERTY, 'User properties grid viewed')
  gridByUser(
    @Param('userId') userId: string,
    @Query(ValidationPipe) query: GridSaleQueryDto & { operationType?: PropertyOperationType },
  ) {
    return this.propertyService.gridByUser(userId, query);
  }

  private extractUserId(req: any): string {
    const user = req.user as any;
    if (user?.id) return user.id;
    if (user?.sub) return user.sub;
    if (typeof user === 'string') return user;
    return 'system';
  }
}
