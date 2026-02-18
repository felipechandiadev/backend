import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Property } from '../../entities/property.entity';
import { User } from '../../entities/user.entity';
import { CreatePropertyDto, UpdatePropertyDto, UpdatePropertyCharacteristicsDto } from './dto/property.dto';
import { UpdatePropertyLocationDto } from './dto/update-property-location.dto';
import { CreatePropertyDto as NewCreatePropertyDto } from './dto/create-property.dto';
import { UpdateMainImageDto } from './dto/create-property.dto';
import { UpdatePropertyPriceDto } from './dto/update-property-price.dto';
import { FilterRentPropertiesDto } from './dto/filter-rent-properties.dto';
import { FilterSalePropertiesDto } from './dto/filter-sale-properties.dto';
import { ListAvailableRentPropertiesDto } from './dto/list-available-rent-properties.dto';
import { PropertyStatus } from '../../common/enums/property-status.enum';
import { PostRequestStatus } from '../../common/enums/post-request-status.enum';
import { PropertyOperationType } from '../../common/enums/property-operation-type.enum';
import { ChangeHistoryEntry, ViewEntry, LeadEntry } from '../../common/interfaces/property.interfaces';
import { GridSaleQueryDto } from './dto/grid-sale.dto';
import { GridRentQueryDto } from './dto/grid-rent.dto';
import { GetFullPropertyDto } from './dto/get-full-property.dto';
import { plainToClass } from 'class-transformer';
import * as ExcelJS from 'exceljs';
import { NotificationsService } from '../notifications/notifications.service';
import { PropertyType } from '../../entities/property-type.entity';
import { Multimedia, MultimediaType, MultimediaFormat } from '../../entities/multimedia.entity';
import { RegionEnum } from '../../common/regions/regions.enum';
import { ComunaEnum } from '../../common/regions/comunas.enum';
import { CurrencyPriceEnum } from '../../entities/property.entity';
import { MultimediaService as UploadMultimediaService } from '../multimedia/services/multimedia.service';
import { MultimediaUploadMetadata } from '../multimedia/interfaces/multimedia.interface';
import { ConfigService } from '@nestjs/config';
import { UploadPropertyMultimediaDto } from './dto/upload-property-multimedia.dto';
import { FileUploadService } from '../../common/services/file-upload.service';

@Injectable()
export class PropertyService {
  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Multimedia)
    private readonly multimediaRepository: Repository<Multimedia>,
    private readonly notificationsService: NotificationsService,
    private readonly multimediaService: UploadMultimediaService,
      private readonly config: ConfigService,
    private readonly fileUploadService: FileUploadService,
    ) {
      this.publicBaseUrl = (
        this.config.get<string>('BACKEND_PUBLIC_URL') ||
        process.env.BACKEND_PUBLIC_URL ||
        ''
      ).replace(/\/$/, '');
    }

    private readonly publicBaseUrl: string;

  /**
   * Genera un código único para la propiedad basado en el tipo de operación y año
   * Formato: PV-25-0000001 (Propiedad Venta) o PA-25-0000001 (Propiedad Arriendo)
   */
  private async generatePropertyCode(
    operationType: PropertyOperationType,
  ): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2); // Últimos 2 dígitos del año
    const prefix =
      operationType === PropertyOperationType.SALE ? 'PV' : 'PA';

    // Buscar el último código generado para este tipo y año
    const lastProperty = await this.propertyRepository
      .createQueryBuilder('property')
      .where('property.code LIKE :pattern', { pattern: `${prefix}-${year}-%` })
      .orderBy('property.code', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastProperty && lastProperty.code) {
      // Extraer el número de secuencia del último código
      const parts = lastProperty.code.split('-');
      if (parts.length === 3) {
        sequence = parseInt(parts[2], 10) + 1;
      }
    }

    // Formatear el número de secuencia con ceros a la izquierda (7 dígitos)
    const sequenceStr = sequence.toString().padStart(7, '0');

    return `${prefix}-${year}-${sequenceStr}`;
  }

  /**
   * Devuelve el total de propiedades en venta
   */
  async countSaleProperties(): Promise<number> {
    return await this.propertyRepository.count({
      where: { operationType: PropertyOperationType.SALE, deletedAt: IsNull() },
    });
  }

  /**
   * Devuelve el total de propiedades publicadas
   */
  async countPublishedProperties(): Promise<number> {
    return await this.propertyRepository.count({
      where: { status: PropertyStatus.PUBLISHED, deletedAt: IsNull() },
    });
  }

  /**
   * Devuelve el total de propiedades destacadas
   */
  async countFeaturedProperties(): Promise<number> {
    return await this.propertyRepository.count({
      where: { isFeatured: true, deletedAt: IsNull() },
    });
  }

  /**
   * Lista de propiedades publicadas para el portal (público, sin token)
   * Devuelve campos esenciales y relaciones mínimas.
   * Si no hay mainImageUrl, devuelve multimedia array para que el frontend busque la primera imagen.
   */
  async listPublishedPublic(): Promise<any[]> {
    const qb = this.propertyRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.propertyType', 'pt')
      .where('p.deletedAt IS NULL')
      .andWhere('p.status = :status', { status: PropertyStatus.PUBLISHED })
      .orderBy('p.publishedAt', 'DESC')
      .addOrderBy('p.createdAt', 'DESC');

    // Selección de campos compatibles con el PortalProperty
    qb.select([
      'p.id',
      'p.title',
      'p.description',
      'p.status',
      'p.operationType',
      'p.price',
      'p.currencyPrice',
      'p.city',
      'p.state',
      'p.mainImageUrl',
      'p.publishedAt',
      'p.bedrooms',
      'p.bathrooms',
      'p.builtSquareMeters',
      'p.landSquareMeters',
      'p.parkingSpaces',
      'p.isFeatured',
      'p.favorites',
      'pt.id',
      'pt.name',
      'pt.hasBedrooms',
      'pt.hasBathrooms',
      'pt.hasBuiltSquareMeters',
      'pt.hasLandSquareMeters',
      'pt.hasParkingSpaces',
      'pt.hasFloors',
      'pt.hasConstructionYear',
    ]);

    const items = await qb.getMany();

    // Propiedades que necesitan multimedia fallback
    const idsNeedingFallback = items
      .filter(p => !p.mainImageUrl || p.mainImageUrl.trim() === '')
      .map(p => p.id);

    // Buscar ALL multimedia para propiedades sin mainImageUrl (para que el frontend elija la primera)
    let multimediaMap: Record<string, any[]> = {};
    if (idsNeedingFallback.length > 0) {
      const multimedia = await this.multimediaRepository
        .createQueryBuilder('m')
        .where('m.propertyId IN (:...ids)', { ids: idsNeedingFallback })
        .andWhere('m.type IN (:...types)', { 
          types: [
            MultimediaType.PROPERTY_IMG, 
            MultimediaType.PROPERTY_VIDEO
          ] 
        })
        .orderBy('m.createdAt', 'ASC')
        .getMany();

      // Agrupar por propertyId
      for (const m of multimedia) {
        if (m.propertyId) {
          if (!multimediaMap[m.propertyId]) {
            multimediaMap[m.propertyId] = [];
          }
          multimediaMap[m.propertyId].push({
            id: m.id,
            url: m.url,
            type: m.type,
            format: m.format,
          });
        }
      }
    }

    const normalize = (u?: string | null) => (u && u.trim() !== '' ? u.replace('/../', '/') : null);
    const toAbsoluteMediaUrl = (u?: string | null): string | null => {
      if (!u) return null;
      const cleaned = u.replace('/../', '/');
      // Si ya es absoluta, retornar tal cual
      try {
        new URL(cleaned);
        return cleaned;
      } catch {
        // Si es relativa bajo /public, prefijar BACKEND_PUBLIC_URL si está configurada
        if (cleaned.startsWith('/public/')) {
          if (this.publicBaseUrl) return `${this.publicBaseUrl}${cleaned}`;
          return cleaned;
        }
        // Si es relativa bajo /uploads, prefijar BACKEND_PUBLIC_URL
        if (cleaned.startsWith('/uploads/')) {
          if (this.publicBaseUrl) return `${this.publicBaseUrl}/public${cleaned}`;
          return cleaned;
        }
        return cleaned;
      }
    };

    // Mapear a la forma esperada por el portal (PortalProperty)
    return items.map((p) => {
      const hasMainImage = p.mainImageUrl && p.mainImageUrl.trim() !== '';
      const result: any = {
        id: p.id,
        title: p.title,
        description: p.description ?? null,
        status: p.status,
        operationType: p.operationType,
        price: p.price,
        currencyPrice: p.currencyPrice,
        state: p.state ?? null,
        city: p.city ?? null,
        propertyType: p.propertyType ? { 
          id: p.propertyType.id, 
          name: p.propertyType.name,
          hasBedrooms: p.propertyType.hasBedrooms,
          hasBathrooms: p.propertyType.hasBathrooms,
          hasBuiltSquareMeters: p.propertyType.hasBuiltSquareMeters,
          hasLandSquareMeters: p.propertyType.hasLandSquareMeters,
          hasParkingSpaces: p.propertyType.hasParkingSpaces,
          hasFloors: p.propertyType.hasFloors,
          hasConstructionYear: p.propertyType.hasConstructionYear
        } : null,
        mainImageUrl: hasMainImage ? toAbsoluteMediaUrl(normalize(p.mainImageUrl)) : null,
        bedrooms: p.bedrooms ?? null,
        bathrooms: p.bathrooms ?? null,
        builtSquareMeters: p.builtSquareMeters ?? null,
        landSquareMeters: p.landSquareMeters ?? null,
        parkingSpaces: p.parkingSpaces ?? null,
        isFeatured: !!p.isFeatured,
      };

      // Si no tiene mainImageUrl pero tiene multimedia, incluir el array
      if (!hasMainImage && multimediaMap[p.id]) {
        result.multimedia = multimediaMap[p.id].map(m => ({
          ...m,
          url: toAbsoluteMediaUrl(m.url),
        }));
      }

      return result;
    });
  }

  /**
   * Devuelve toda la información relevante de una propiedad, incluyendo relaciones y datos agregados.
   */
  async getFullProperty(id: string): Promise<GetFullPropertyDto> {
    const property = await this.propertyRepository.findOne({
      where: { id },
      relations: [
        'creatorUser',      // Usuario creador
        'assignedAgent',    // Agente asignado
        'propertyType',     // Tipo de propiedad
        'multimedia',       // Imágenes, videos, documentos
      ],
      select: [
        'id', 'title', 'description', 'status', 'operationType',
        'creatorUserId', 'assignedAgentId', 'propertyTypeId',
        'price', 'currencyPrice', 'seoTitle', 'seoDescription',
        'publicationDate', 'isFeatured', 'builtSquareMeters', 'landSquareMeters',
        'bedrooms', 'bathrooms', 'parkingSpaces', 'floors', 'constructionYear',
        'state', 'city', 'address', 'latitude', 'longitude',
        'internalNotes', 'createdAt', 'updatedAt', 'deletedAt', 'publishedAt',
        'changeHistory', 'views', 'leads', 'favorites' // Incluir campos JSON
      ]
    });

    if (!property) throw new NotFoundException('Property not found');

    // Datos agregados
    const favoritesCount = await this.getFavoritesCount(id);
    const leadsCount = await this.getLeadsCount(id);
    const viewsCount = await this.getViewsCount(id);

    // Crear objeto con datos agregados
    const fullProperty = {
      ...property,
      favoritesCount,
      leadsCount,
      viewsCount,
    };

    // Transformar a DTO
    return plainToClass(GetFullPropertyDto, fullProperty, { excludeExtraneousValues: true });
  }

  /**
   * Devuelve propiedades públicas que estén publicadas y marcadas como destacadas (featured).
   * Retorna un conjunto ligero de campos aptos para consumo público.
   */
  async findPublishedFeaturedPublic(): Promise<Partial<Property>[]> {
    // Return published and featured properties using the existing PropertyStatus enum.
    const qb = this.propertyRepository.createQueryBuilder('p')
      .leftJoinAndSelect('p.propertyType', 'pt')
      .select([
        'p.id',
        'p.title',
        'p.price',
        'p.currencyPrice',
        'p.city',
        'p.state',
        'p.mainImageUrl',
        'p.isFeatured',
        'p.publishedAt',
        'p.bedrooms',
        'p.bathrooms',
        'p.builtSquareMeters',
        'p.landSquareMeters',
        'p.parkingSpaces',
        'p.operationType',
        'p.favorites',
        'pt.id',
        'pt.name',
        'pt.hasBedrooms',
        'pt.hasBathrooms',
        'pt.hasBuiltSquareMeters',
        'pt.hasLandSquareMeters',
        'pt.hasParkingSpaces',
        'pt.hasFloors',
        'pt.hasConstructionYear'
      ])
      // Use the PropertyStatus enum value for published
      .where('p.status = :status', { status: PropertyStatus.PUBLISHED })
      .andWhere('p.isFeatured = :isFeatured', { isFeatured: true });

    const rows = await qb.getMany();
    return rows as Partial<Property>[];
  }

  /**
   * Get featured public properties with pagination
   */
  async findPublishedFeaturedPublicPaginated(
    page: number = 1,
    limit: number = 9,
  ): Promise<{
    data: Partial<Property>[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const qb = this.propertyRepository.createQueryBuilder('p')
      .leftJoinAndSelect('p.propertyType', 'pt')
      .leftJoinAndSelect('p.multimedia', 'multimedia')
      .select([
        'p.id',
        'p.title',
        'p.price',
        'p.currencyPrice',
        'p.city',
        'p.state',
        'p.mainImageUrl',
        'p.isFeatured',
        'p.publishedAt',
        'p.bedrooms',
        'p.bathrooms',
        'p.builtSquareMeters',
        'p.landSquareMeters',
        'p.parkingSpaces',
        'p.operationType',
        'p.favorites',
        'pt.id',
        'pt.name',
        'pt.hasBedrooms',
        'pt.hasBathrooms',
        'pt.hasBuiltSquareMeters',
        'pt.hasLandSquareMeters',
        'pt.hasParkingSpaces',
        'pt.hasFloors',
        'pt.hasConstructionYear'
      ])
      .where('p.status = :status', { status: PropertyStatus.PUBLISHED })
      .andWhere('p.isFeatured = :isFeatured', { isFeatured: true })
      .orderBy('p.publishedAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data: rows as Partial<Property>[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Devuelve cuántas veces la propiedad ha sido marcada como favorita.
   * Cuenta los elementos en el array favorites de la propiedad
   */
  async getFavoritesCount(propertyId: string): Promise<number> {
    const property = await this.propertyRepository.findOne({
      where: { id: propertyId },
    });
    
    if (!property || !property.favorites) {
      return 0;
    }
    
    return Array.isArray(property.favorites) ? property.favorites.length : 0;
  }

  /**
   * Devuelve cuántos leads/interesados tiene la propiedad.
   */
  async getLeadsCount(propertyId: string): Promise<number> {
    const property = await this.propertyRepository.findOne({ where: { id: propertyId } });
    if (!property || !property.leads) return 0;
    return Array.isArray(property.leads) ? property.leads.length : 0;
  }

  /**
   * Devuelve cuántas veces ha sido vista la propiedad.
   */
  async getViewsCount(propertyId: string): Promise<number> {
    const property = await this.propertyRepository.findOne({ where: { id: propertyId } });
    if (!property || !property.views) return 0;
    return Array.isArray(property.views) ? property.views.length : 0;
  }

  // Exporta Excel para el grid de propiedades en venta
  async exportSalePropertiesExcel(query: GridSaleQueryDto): Promise<Buffer> {
    // Columnas del DataGrid de sale (deben coincidir con el frontend)
    const columns = [
      { key: 'id', header: 'ID' },
      { key: 'title', header: 'Título' },
      { key: 'status', header: 'Estado' },
      { key: 'isFeatured', header: 'Destacada' },
      { key: 'operationType', header: 'Operación' },
      { key: 'typeName', header: 'Tipo' },
      { key: 'assignedAgentName', header: 'Agente' },
      { key: 'city', header: 'Ciudad' },
      { key: 'state', header: 'Región' },
      { key: 'price', header: 'Precio' },
      { key: 'createdAt', header: 'Creado' },
    ];

    // Forzar siempre el parámetro fields para que gridSaleProperties devuelva todos los datos necesarios
    const fields = columns.map(c => c.key).join(',');
    const gridResult = await this.gridSaleProperties({ ...query, fields, pagination: 'false' });
    const rows = Array.isArray(gridResult) ? gridResult : gridResult.data;

    // Crear workbook y hoja
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Propiedades en Venta');

    // Definir columnas
    sheet.columns = columns.map(col => ({ key: col.key, header: col.header, width: 22 }));

    // Agregar filas
    rows.forEach(row => {
      const excelRow: Record<string, any> = {};
      columns.forEach(col => {
        excelRow[col.key] = row[col.key] ?? '';
      });
      sheet.addRow(excelRow);
    });

    // Estilo: bordes en todas las celdas
    sheet.eachRow({ includeEmpty: true }, (row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportRentPropertiesExcel(query: GridRentQueryDto): Promise<Buffer> {
    // Columnas del DataGrid de rent (deben coincidir con el frontend)
    const columns = [
      { key: 'id', header: 'ID' },
      { key: 'title', header: 'Título' },
      { key: 'status', header: 'Estado' },
      { key: 'isFeatured', header: 'Destacada' },
      { key: 'operationType', header: 'Operación' },
      { key: 'typeName', header: 'Tipo' },
      { key: 'assignedAgentName', header: 'Agente' },
      { key: 'city', header: 'Ciudad' },
      { key: 'state', header: 'Región' },
      { key: 'price', header: 'Precio' },
      { key: 'createdAt', header: 'Creado' },
    ];

    // Forzar siempre el parámetro fields para que gridRentProperties devuelva todos los datos necesarios
    const fields = columns.map(c => c.key).join(',');
    const gridResult = await this.gridRentProperties({ ...query, fields, pagination: 'false' });
    const rows = Array.isArray(gridResult) ? gridResult : gridResult.data;

    // Crear workbook y hoja
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Propiedades en Arriendo');

    // Definir columnas
    sheet.columns = columns.map(col => ({ key: col.key, header: col.header, width: 22 }));

    // Agregar filas
    rows.forEach(row => {
      const excelRow: Record<string, any> = {};
      columns.forEach(col => {
        excelRow[col.key] = row[col.key] ?? '';
      });
      sheet.addRow(excelRow);
    });

    // Estilo: bordes en todas las celdas
    sheet.eachRow({ includeEmpty: true }, (row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async create(
    createPropertyDto: CreatePropertyDto,
    creatorId?: string,
  ): Promise<Property> {
    // Validate business rules
    this.validatePropertyData(createPropertyDto);

    // Generate unique property code
    const code = await this.generatePropertyCode(
      createPropertyDto.operationType,
    );

    // Create property with proper relationships
    const property = this.propertyRepository.create({
      ...createPropertyDto,
      code,
      description: createPropertyDto.description ?? undefined,
      address: createPropertyDto.address ?? undefined,
      latitude: createPropertyDto.latitude ?? (createPropertyDto as any).location?.lat ?? undefined,
      longitude: createPropertyDto.longitude ?? (createPropertyDto as any).location?.lng ?? undefined,
      // Do not persist the sentinel value 'anonymous' into the FK column — keep undefined instead
      creatorUserId: (creatorId && creatorId !== 'anonymous') ? creatorId : createPropertyDto.creatorUserId,
      propertyTypeId:
        (createPropertyDto as any).propertyTypeId ||
        (createPropertyDto as any).propertyType ||
        undefined,
      status: createPropertyDto.status || PropertyStatus.REQUEST,
      createdAt: new Date(),
      lastModifiedAt: new Date(),
    });

    // Add creation history entry
    if (property.changeHistory) {
      property.changeHistory = [];
    }

    const historyEntry: ChangeHistoryEntry = {
      timestamp: new Date(),
      changedBy: creatorId || 'system',
      field: 'creation',
      previousValue: null,
      newValue: 'Created',
    };

    property.changeHistory = [historyEntry];

    return await this.propertyRepository.save(property);
  }

  async findAll(filters: any = {}): Promise<Property[]> {
    const query = this.propertyRepository
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.creatorUser', 'creatorUser')
      .leftJoinAndSelect('property.assignedAgent', 'assignedAgent')
      .where({ deletedAt: IsNull() });

    // Apply filters
    if (filters.operationType) {
      query.andWhere('property.operationType = :operationType', {
        operationType: filters.operationType,
      });
    }

    if (filters.status) {
      query.andWhere('property.status = :status', { status: filters.status });
    }

    if (filters.propertyTypeId || filters.propertyType) {
      const pTypeId = filters.propertyTypeId || filters.propertyType;
      query.andWhere('property.propertyTypeId = :propertyTypeId', {
        propertyTypeId: pTypeId,
      });
    }

    if (filters.state) {
      query.andWhere('property.state = :state', {
        state: filters.state,
      });
    }

    if (filters.city) {
      query.andWhere('property.city = :city', {
        city: filters.city,
      });
    }

    if (filters.minPrice) {
      query.andWhere('property.price >= :minPrice', {
        minPrice: filters.minPrice,
      });
    }

    if (filters.maxPrice) {
      query.andWhere('property.price <= :maxPrice', {
        maxPrice: filters.maxPrice,
      });
    }

    if (filters.bedrooms) {
      query.andWhere('property.bedrooms >= :bedrooms', {
        bedrooms: filters.bedrooms,
      });
    }

    if (filters.bathrooms) {
      query.andWhere('property.bathrooms >= :bathrooms', {
        bathrooms: filters.bathrooms,
      });
    }

    if (filters.isFeatured !== undefined) {
      query.andWhere('property.isFeatured = :isFeatured', {
        isFeatured: filters.isFeatured,
      });
    }

    // Sorting
    if (filters.sortBy) {
      const direction = filters.sortDirection || 'ASC';
      query.orderBy(`property.${filters.sortBy}`, direction);
    } else {
      // priority removed from model; order by featured and creation date
      query
        .orderBy('property.isFeatured', 'DESC')
        .addOrderBy('property.publishedAt', 'DESC')
        .addOrderBy('property.createdAt', 'DESC');
    }

    // Pagination
    if (filters.limit) {
      query.limit(filters.limit);
    }

    if (filters.offset) {
      query.offset(filters.offset);
    }

    return await query.getMany();
  }

  async findOne(
    id: string,
    trackView: boolean = true,
    viewData?: any,
  ): Promise<Property> {
    const property = await this.propertyRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: [
        'creatorUser',
        'assignedAgent', 
        'propertyType',
        'multimedia'
      ],
    });

    if (!property) {
      console.log('❌ [PropertyService.findOne] Propiedad no encontrada con ID:', id);
      throw new NotFoundException('Propiedad no encontrada.');
    }

    console.log('✅ [PropertyService.findOne] Propiedad encontrada:', {
      id: property.id,
      title: property.title,
      hasMultimedia: property.multimedia ? property.multimedia.length : 0,
      hasPropertyType: !!property.propertyType,
      propertyTypeId: property.propertyType?.id,
      propertyTypeName: property.propertyType?.name,
      multimediaItems: property.multimedia?.map(m => ({ id: m.id, type: m.type, filename: m.filename })) || []
    });

    // Track view if requested
    if (trackView) {
      await this.addView(id, viewData);
    }

    return property;
  }

  async update(
    id: string,
    updatePropertyDto: UpdatePropertyDto,
    updatedBy?: string,
  ): Promise<Property> {
    const property = await this.findOne(id, false);
    const oldAssignedAgentId = property.assignedAgentId;
    const oldStatus = property.status;

    // Filter out empty strings and null values, keep only actual updates
    const cleanDto = Object.fromEntries(
      Object.entries(updatePropertyDto).filter(([, value]) => {
        return value !== '' && value !== null && value !== undefined;
      })
    ) as UpdatePropertyDto;

    // Validate update data
    this.validatePropertyUpdate(cleanDto);

    // Track changes for history with improved comparison logic
    const changes: ChangeHistoryEntry[] = [];

    for (const [key, newValue] of Object.entries(cleanDto)) {
      // Skip undefined values (fields not being updated)
      if (newValue === undefined) continue;

      const currentValue = property[key];

      // Improved comparison that handles different data types
      let hasChanged = false;

      if (currentValue !== newValue) {
        // Handle null/undefined comparisons
        if ((currentValue == null && newValue != null) ||
            (currentValue != null && newValue == null)) {
          hasChanged = true;
        }
        // Handle string/number comparisons
        else if (typeof currentValue !== typeof newValue) {
          hasChanged = true;
        }
        // Handle boolean comparisons
        else if (typeof newValue === 'boolean') {
          hasChanged = Boolean(currentValue) !== Boolean(newValue);
        }
        // Handle string comparisons (case sensitive)
        else if (typeof newValue === 'string') {
          hasChanged = String(currentValue || '').trim() !== String(newValue).trim();
        }
        // Handle number comparisons
        else if (typeof newValue === 'number') {
          hasChanged = Number(currentValue || 0) !== Number(newValue);
        }
        // Default comparison for other types
        else {
          hasChanged = currentValue !== newValue;
        }
      }

      if (hasChanged) {
        changes.push({
          timestamp: new Date(),
          changedBy: updatedBy || 'system',
          field: key,
          previousValue: currentValue,
          newValue: newValue,
        });
      }
    }

    // If propertyTypeId is being updated, load the PropertyType relation
    // We do this BEFORE Object.assign or unconditionally if present in DTO, 
    // because Object.assign will update the propertyTypeId column value, 
    // making a comparison against property.propertyTypeId useless if done after.
    if (cleanDto.propertyTypeId) {
      const propertyType = await this.propertyRepository.manager.findOne(PropertyType, {
        where: { id: cleanDto.propertyTypeId, deletedAt: IsNull() },
      });
      if (propertyType) {
        property.propertyType = propertyType;
      }
    }

    // Update property
    Object.assign(property, cleanDto);

    // Set publication date if publishing
    if (cleanDto.status === PropertyStatus.PUBLISHED && !property.publishedAt) {
      property.publishedAt = new Date();
    }
    
    property.lastModifiedAt = new Date();

    // Add change history only if there are actual changes
    if (changes.length > 0) {
      property.changeHistory = [...(property.changeHistory || []), ...changes];
    }

    const savedProperty = await this.propertyRepository.save(property);

    // ALWAYS reload relations after update to ensure fresh data is returned
    const reloadedProperty = await this.propertyRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.propertyType', 'pt')
      .leftJoinAndSelect('p.creatorUser', 'cu')
      .leftJoinAndSelect('p.assignedAgent', 'aa')
      .where('p.id = :id', { id: savedProperty.id })
      .andWhere('p.deletedAt IS NULL')
      .getOne();

    if (!reloadedProperty) {
      console.error('ERROR: Could not reload property after update');
      return savedProperty;
    }

    // Send notification for agent assignment
    if (cleanDto.assignedAgentId && oldAssignedAgentId !== cleanDto.assignedAgentId) {
      try {
        // Load the assigned agent
        const agent = await this.propertyRepository.manager.findOne(User, {
          where: { id: cleanDto.assignedAgentId },
        });
        if (agent) {
          await this.notificationsService.notifyAgentAssigned(reloadedProperty, agent);
        }
      } catch (error) {
        // Log error but don't fail the operation
        console.error('Failed to send agent assignment notification:', error);
      }
    }

    // Send notification for status change
    if (cleanDto.status && oldStatus !== cleanDto.status) {
      try {
        await this.notificationsService.notifyPropertyStatusChange(reloadedProperty, oldStatus, cleanDto.status as any);
      } catch (error) {
        // Log error but don't fail the operation
        console.error('Failed to send status change notification in general update:', error);
      }
    }

    return reloadedProperty;
  }

  async updateStatus(
    id: string,
    status: PropertyStatus,
    updatedBy?: string,
  ): Promise<Property> {
    const property = await this.findOne(id, false);
    const oldStatus = property.status;

    const historyEntry: ChangeHistoryEntry = {
      timestamp: new Date(),
      changedBy: updatedBy || 'system',
      field: 'status',
      previousValue: property.status,
      newValue: status,
    };

    property.status = status;
    property.lastModifiedAt = new Date();
    property.changeHistory = [...(property.changeHistory || []), historyEntry];

    // Set publication date if publishing
    if (status === PropertyStatus.PUBLISHED && !property.publishedAt) {
      property.publishedAt = new Date();
    }

    const savedProperty = await this.propertyRepository.save(property);

    // Send notification for status change
    if (oldStatus !== status) {
      try {
        await this.notificationsService.notifyPropertyStatusChange(savedProperty, oldStatus, status);
      } catch (error) {
        // Log error but don't fail the operation
        console.error('Failed to send property status change notification:', error);
      }
    }

    return savedProperty;
  }

  async createPropertyWithFiles(
    createDto: CreatePropertyDto,
    creatorId: string,
    files: Express.Multer.File[],
  ): Promise<Property> {
    const property = await this.create(createDto, creatorId);

    if (files && files.length > 0) {
      await this.uploadMultimedia(property.id, files, {}, creatorId);
    }

    return this.findOne(property.id);
  }

  async uploadMultimedia(
    propertyId: string,
    files: Express.Multer.File[],
    dto: any,
    userId: string,
  ): Promise<Multimedia[]> {
    const property = await this.findOne(propertyId);
    const results: Multimedia[] = [];

    for (const file of files) {
      const multimedia = await this.multimediaService.uploadFile(
        file,
        { type: MultimediaType.PROPERTY_IMG },
        userId,
      );
      
      // Asociar con la propiedad
      multimedia.propertyId = propertyId;
      await this.multimediaRepository.save(multimedia);
      
      results.push(multimedia);
    }

    // Set first image as main if the property doesn't have one
    if (results.length > 0 && (!property.mainImageUrl || property.mainImageUrl.trim() === '')) {
      const firstImage = results.find(m => m.format === MultimediaFormat.IMG);
      if (firstImage) {
        await this.propertyRepository.update(propertyId, {
          mainImageUrl: firstImage.url
        });
      }
    }

    return results;
  }

  async isMultimediaMain(propertyId: string, multimediaId: string): Promise<boolean> {
    const property = await this.findOne(propertyId);
    const multimedia = await this.multimediaRepository.findOne({
      where: { id: multimediaId, propertyId: propertyId }
    });

    if (!multimedia) {
      return false;
    }

    return property.mainImageUrl === multimedia.url;
  }

  async updateMainImage(id: string, mainImageUrl: string, userId: string): Promise<Property> {
    const property = await this.findOne(id, false);
    const oldUrl = property.mainImageUrl;
    property.mainImageUrl = mainImageUrl;
    property.lastModifiedAt = new Date();
    
    property.changeHistory = [
      ...(property.changeHistory || []),
      {
        timestamp: new Date(),
        changedBy: userId,
        field: 'mainImageUrl',
        previousValue: oldUrl,
        newValue: mainImageUrl,
      },
    ];

    return await this.propertyRepository.save(property);
  }

  async updatePrice(id: string, dto: UpdatePropertyPriceDto, userId: string): Promise<Property> {
    const property = await this.findOne(id, false);
    const oldPrice = property.price;
    const oldCurrency = property.currencyPrice;

    if (dto.price !== undefined) property.price = dto.price;
    if (dto.currencyPrice !== undefined) property.currencyPrice = dto.currencyPrice;
    
    property.lastModifiedAt = new Date();

    const changes: ChangeHistoryEntry[] = [];
    if (dto.price !== undefined && oldPrice !== dto.price) {
      changes.push({
        timestamp: new Date(),
        changedBy: userId,
        field: 'price',
        previousValue: oldPrice,
        newValue: dto.price,
      });
    }
    if (dto.currencyPrice !== undefined && oldCurrency !== dto.currencyPrice) {
      changes.push({
        timestamp: new Date(),
        changedBy: userId,
        field: 'currencyPrice',
        previousValue: oldCurrency,
        newValue: dto.currencyPrice,
      });
    }

    property.changeHistory = [...(property.changeHistory || []), ...changes];
    return await this.propertyRepository.save(property);
  }

  async updateCharacteristics(id: string, dto: UpdatePropertyCharacteristicsDto, userId: string): Promise<Property> {
    const property = await this.findOne(id, false);
    
    const changes: ChangeHistoryEntry[] = [];
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined && property[key] !== value) {
        changes.push({
          timestamp: new Date(),
          changedBy: userId,
          field: key,
          previousValue: property[key],
          newValue: value,
        });
        property[key] = value;
      }
    }

    property.lastModifiedAt = new Date();
    property.changeHistory = [...(property.changeHistory || []), ...changes];
    
    return await this.propertyRepository.save(property);
  }

  async updateLocation(id: string, dto: UpdatePropertyLocationDto, userId: string): Promise<Property> {
    const property = await this.findOne(id, false);
    
    const changes: ChangeHistoryEntry[] = [];
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined && property[key] !== value) {
        changes.push({
          timestamp: new Date(),
          changedBy: userId,
          field: key,
          previousValue: property[key],
          newValue: value,
        });
        property[key] = value;
      }
    }

    property.lastModifiedAt = new Date();
    property.changeHistory = [...(property.changeHistory || []), ...changes];
    
    return await this.propertyRepository.save(property);
  }

  async addView(id: string, viewData: any = {}): Promise<void> {
    const property = await this.findOne(id, false);

    const viewEntry: ViewEntry = {
      timestamp: new Date(),
      userId: viewData.userId,
    };

    property.views = [...(property.views || []), viewEntry];

    await this.propertyRepository.save(property);
  }

  async addLead(id: string, leadData: LeadEntry): Promise<void> {
    const property = await this.findOne(id, false);

    leadData.timestamp = new Date();
    leadData.status = leadData.status || 'new';

    property.leads = [...(property.leads || []), leadData];

    await this.propertyRepository.save(property);
  }

  async remove(id: string, deletedBy?: string): Promise<void> {
    const property = await this.findOne(id, false);

    // Add deletion to history
    const historyEntry: ChangeHistoryEntry = {
      timestamp: new Date(),
      changedBy: deletedBy || 'system',
      field: 'deletion',
      previousValue: 'active',
      newValue: 'deleted',
    };

    property.changeHistory = [...(property.changeHistory || []), historyEntry];
    await this.propertyRepository.save(property);

    await this.propertyRepository.softDelete(id);
  }

  private validatePropertyData(dto: CreatePropertyDto): void {
    // Validate operation type and pricing
    // Require a price for sale or rent operations
    if (
      (dto.operationType === PropertyOperationType.SALE ||
        dto.operationType === PropertyOperationType.RENT) &&
      (dto.price === undefined || dto.price === null)
    ) {
      throw new BadRequestException(
        'Properties must include a price for the selected operation',
      );
    }

    // Validate required fields based on status
    if (dto.status === PropertyStatus.PUBLISHED) {
      if (!dto.title || !dto.description) {
        throw new BadRequestException(
          'Published properties must have title and description',
        );
      }
    }
  }

  private validatePropertyUpdate(dto: UpdatePropertyDto): void {
    // Similar validation logic for updates
    if (dto.operationType) {
      // Add validation logic for operation type updates
    }
  }

  // Grid for SALE properties compatible with DataGrid
  async gridSaleProperties(query: GridSaleQueryDto) {
    console.log('gridSaleProperties called with query:', query);
    // Allowed fields and mappings
    const availableFields = [
      'id',
      'code',
      'isFeatured',
      'title',
      'status',
      'operationType',
      'typeName',
      'characteristics',
      'assignedAgentName',
      'creatorName',
      'city',
      'state',
      'priceDisplay',
      'price',
      'currencyPrice',
      'createdAt',
      'updatedAt',
      'mainImageUrl',
    ];

    const fieldMappings: Record<string, string> = {
      id: 'p.id',
      code: 'p.code',
      isFeatured: 'p.isFeatured',
      title: 'p.title',
      status: 'p.status',
      operationType: 'p.operationType',
      typeName: 'pt.name AS typeName',
      city: 'p.city',
      state: 'p.state',
      price: 'p.price',
      currencyPrice: 'p.currencyPrice',
      createdAt: 'p.createdAt',
      updatedAt: 'p.updatedAt',
      mainImageUrl: 'p.mainImageUrl',
      // assignedAgentName should sort by agent username
      assignedAgentName: 'a.username',
      creatorName: 'cu.username',
      // characteristics and priceDisplay are derived post-query
    };

    const textSearchFields = [
      'LOWER(p.title)',
      'LOWER(p.code)',
      'LOWER(pt.name)',
      'LOWER(a.username)',
      'LOWER(cu.username)',
      'LOWER(p.city)',
      'LOWER(p.state)',
    ];

    // Parse fields
    const requested = (query.fields || '')
      .split(',')
      .map((f) => f.trim())
      .filter((f) => f);
    const fields = requested.length
      ? requested.filter((f) => availableFields.includes(f))
      : availableFields;

    if (fields.length === 0) {
      if (query.pagination === 'true') {
        return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
      }
      return [];
    }

    // Build select (raw) for non-derived fields, usando alias exactos para cada campo
    const rawSelects = fields
      .filter((f) => !['characteristics', 'priceDisplay', 'assignedAgentName', 'creatorName'].includes(f))
      .map((f) => {
        // Si el mapping ya tiene un alias (AS ...), úsalo tal cual
        if (fieldMappings[f] && fieldMappings[f].includes(' AS ')) return fieldMappings[f];
        // Si es un campo directo, forzar alias igual al nombre esperado
        if (fieldMappings[f]) return `${fieldMappings[f]} AS ${f}`;
        return `p.${f} AS ${f}`;
      });

    // Always include needed base fields for derivations if requested
    const needCharacteristics = fields.includes('characteristics');
    const needPriceDisplay = fields.includes('priceDisplay');
    if (needCharacteristics) {
      rawSelects.push(
        'p.bedrooms',
        'p.bathrooms',
        'p.landSquareMeters',
        'p.builtSquareMeters',
        'p.parkingSpaces',
        'p.floors',
      );
    }
    if (needPriceDisplay) {
      rawSelects.push('p.price', 'p.currencyPrice');
    }

    // assignedAgentName derivation needs agent personalInfo and username
    const needAgentName = fields.includes('assignedAgentName');
    if (needAgentName) {
      rawSelects.push('a.personalInfo AS assignedPersonalInfo');
      rawSelects.push('a.username AS assignedUsername');
    }

    // creatorName derivation needs creator personalInfo and username
    const needCreatorName = fields.includes('creatorName');
    if (needCreatorName) {
      rawSelects.push('cu.personalInfo AS creatorPersonalInfo');
      rawSelects.push('cu.username AS creatorUsername');
    }

    // Fallback: ensure id exists in selection for identity mapping
    if (!rawSelects.find((s) => s.startsWith('p.id'))) rawSelects.unshift('p.id');

    const qb = this.propertyRepository
      .createQueryBuilder('p')
      .leftJoin('p.propertyType', 'pt')
      .leftJoin('p.assignedAgent', 'a')
      .leftJoin('p.creatorUser', 'cu')
      .where('p.deletedAt IS NULL')
      .andWhere('p.operationType = :op', { op: PropertyOperationType.SALE });

        // Column filters
    const filtration = query.filtration === 'true';
    console.log('[DEBUG] gridSaleProperties - filtration enabled:', filtration);
    if (filtration && query.filters) {
      const items = query.filters
        .split(',')
        .map((f) => f.trim())
        .filter((f) => f.includes('-'))
        .map((f) => {
          const dash = f.indexOf('-');
          return {
            column: f.substring(0, dash).trim(),
            value: decodeURIComponent(f.substring(dash + 1).trim()),
          };
        })
        .filter((f) => f.column && f.value && availableFields.includes(f.column));

      console.log('[DEBUG] gridSaleProperties - Parsed filter items:', items);

      for (const f of items) {
        if (f.column === 'assignedAgentName') {
          // Filtrar por username o por nombre en personalInfo (JSON)
          const param = `%${f.value.toLowerCase()}%`;
          // Busca en username y en personalInfo (firstName, lastName)
          qb.andWhere(
            `(
              LOWER(a.username) LIKE :f_assignedAgentName
              OR LOWER(JSON_UNQUOTE(JSON_EXTRACT(a.personalInfo, '$.firstName'))) LIKE :f_assignedAgentName
              OR LOWER(JSON_UNQUOTE(JSON_EXTRACT(a.personalInfo, '$.lastName'))) LIKE :f_assignedAgentName
            )`,
            { f_assignedAgentName: param }
          );
          console.log('[DEBUG] gridSaleProperties - Applying filter: assignedAgentName LIKE', param);
        } else {
          const mapping = fieldMappings[f.column] || `p.${f.column}`;
          const dbField = mapping.split(' AS ')[0];
          console.log(`[DEBUG] gridSaleProperties - Applying filter: ${f.column} LIKE '%${f.value}%' on field ${dbField}`);
          const param = `%${f.value.toLowerCase()}%`;
          qb.andWhere(`LOWER(${dbField}) LIKE :f_${f.column}`, {
            [`f_${f.column}`]: param,
          });
        }
      }
    }

    // Global search
    if (query.search && query.search.trim() !== '') {
      const needle = query.search.trim().toLowerCase();
      const orExpr = textSearchFields
        .map((f, idx) => `${f} LIKE :s${idx}`)
        .join(' OR ');
      const params = Object.fromEntries(
        textSearchFields.map((_, idx) => [`s${idx}`, `%${needle}%`]),
      );
      qb.andWhere(`(${orExpr})`, params);
    }

    // Sorting
    const sortDir = query.sort === 'desc' ? 'DESC' : 'ASC';
    const sortField = query.sortField && availableFields.includes(query.sortField)
      ? query.sortField
      : undefined;
    if (sortField) {
      const mapping = fieldMappings[sortField] || `p.${sortField}`;
      const dbField = mapping.split(' AS ')[0];
      qb.orderBy(dbField, sortDir as 'ASC' | 'DESC');
    } else {
      qb.orderBy('p.publishedAt', 'DESC').addOrderBy('p.createdAt', 'DESC');
    }

    // Selects
    qb.select(rawSelects);

    // Pagination
    const doPaginate = query.pagination === 'true';
    let total = 0;
    let page = Math.max(1, query.page || 1);
    let limit = Math.min(Math.max(1, query.limit || 10), 100);

    try {
      if (doPaginate) {
        total = await qb.getCount();
        console.log('Total properties with operationType SALE:', total);
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        qb.limit(limit).offset(offset);
        const rows = await qb.getRawMany();
        console.log('Raw rows from query:', rows.length);
        const data = rows.map((r: any) => this.mapGridRow(r, fields));
        console.log('Mapped data:', data.length);
        if (data.length > 0) console.log('[DEBUG] gridSaleProperties - sample row keys:', Object.keys(data[0]));
        return { data, total, page, limit, totalPages };
      }

      const rows = await qb.getRawMany();
      console.log('Raw rows from non-paginated query:', rows.length);
      return rows.map((r: any) => this.mapGridRow(r, fields));
    } catch (error) {
      console.error('Error in gridSaleProperties:', error);
      throw error;
    }
  }

  private mapGridRow(raw: any, fields: string[]) {
    // Normalize aliases from getRawMany: use column names from mappings or fall back
    const row: any = { ...raw };

    if (!raw) {
      console.error('[ERROR] mapGridRow called with null/undefined raw data');
      return {};
    }

    // Derived: status translation
    if (fields.includes('status')) {
      const statusValue = row.status || row.p_status;
      if (statusValue) {
        const statusMapping: Record<string, string> = {
          [PropertyStatus.REQUEST]: 'Solicitud',
          [PropertyStatus.PRE_APPROVED]: 'Pre-aprobada',
          [PropertyStatus.PUBLISHED]: 'Publicada',
          [PropertyStatus.INACTIVE]: 'Inactiva',
          [PropertyStatus.SOLD]: 'Vendida',
          [PropertyStatus.RENTED]: 'Arrendada',
          [PropertyStatus.CONTRACT_IN_PROGRESS]: 'Contrato en curso',
        };
        // No sobrescribir 'status' para que el frontend pueda usar el enum original
        row.statusLabel = statusMapping[statusValue] || statusValue;
        // Si row.status estaba vacío pero row.p_status tenía el valor, normalizarlo
        if (!row.status) row.status = statusValue;
      }
    }

    // Derived: assignedAgentName from personalInfo or username
    if (fields.includes('assignedAgentName')) {
      let name = '';
      const rawPI = row.assignedPersonalInfo;
      try {
        const pi = typeof rawPI === 'string' ? JSON.parse(rawPI) : rawPI;
        const fn = (pi?.firstName || '').toString().trim();
        const ln = (pi?.lastName || '').toString().trim();
        name = `${fn} ${ln}`.trim();
      } catch (_) {
        // ignore JSON parse errors
      }
      if (!name) name = (row.assignedUsername || '').toString();
      row.assignedAgentName = name.trim();
    }

    // Derived: creatorName from personalInfo or username
    if (fields.includes('creatorName')) {
      let name = '';
      const rawPI = row.creatorPersonalInfo;
      try {
        const pi = typeof rawPI === 'string' ? JSON.parse(rawPI) : rawPI;
        const fn = (pi?.firstName || '').toString().trim();
        const ln = (pi?.lastName || '').toString().trim();
        name = `${fn} ${ln}`.trim();
      } catch (_) {
        // ignore JSON parse errors
      }
      if (!name) name = (row.creatorUsername || '').toString();
      row.creatorName = name.trim();
    }

    // Derived: characteristics
    if (fields.includes('characteristics')) {
      const parts: string[] = [];
      const bedrooms = toInt(row.bedrooms);
      const bathrooms = toInt(row.bathrooms);
      const land = toNumber(row.landSquareMeters);
      const built = toNumber(row.builtSquareMeters);
      const parking = toInt(row.parkingSpaces);
      const floors = toInt(row.floors);

      if (bedrooms > 0) parts.push(`${bedrooms}D`);
      if (bathrooms > 0) parts.push(`${bathrooms}B`);
      if (isFiniteNumber(land) && land > 0) parts.push(`${Math.round(land)}m²T`);
      if (isFiniteNumber(built) && built > 0) parts.push(`${Math.round(built)}m²C`);
      if (parking > 0) parts.push(`${parking}E`);
      if (floors > 0) parts.push(`${floors}P`);
      row.characteristics = parts.join('/');
    }

    // Derived: priceDisplay
    if (fields.includes('priceDisplay')) {
      const price = toNumber(row.price);
      const currency = row.currencyPrice;
      row.priceDisplay = formatPrice(price, currency);
    }

    if (fields.includes('mainImageUrl') && row.mainImageUrl) {
      row.mainImageUrl = this.normalizeUrl(row.mainImageUrl);
    }

    // Remove base fields used only for derivations if they were not explicitly requested
    const baseFieldsForChar = ['bedrooms', 'bathrooms', 'landSquareMeters', 'builtSquareMeters', 'parkingSpaces', 'floors'];
    for (const bf of baseFieldsForChar) {
      if (!fields.includes(bf) && bf in row) delete row[bf];
    }
  if (!fields.includes('price') && 'price' in row) delete row.price;
  if (!fields.includes('currencyPrice') && 'currencyPrice' in row) delete row.currencyPrice;
  if (!fields.includes('assignedPersonalInfo') && 'assignedPersonalInfo' in row) delete row.assignedPersonalInfo;
  if (!fields.includes('assignedUsername') && 'assignedUsername' in row) delete row.assignedUsername;
  if (!fields.includes('creatorPersonalInfo') && 'creatorPersonalInfo' in row) delete row.creatorPersonalInfo;
  if (!fields.includes('creatorUsername') && 'creatorUsername' in row) delete row.creatorUsername;

    return row;
  }

  async listAvailableRentProperties(query: ListAvailableRentPropertiesDto) {
    const limit = Math.min(Math.max(query.limit ?? 100, 1), 500);

    const qb = this.propertyRepository
      .createQueryBuilder('p')
      .leftJoin('p.propertyType', 'pt')
      .where('p.deletedAt IS NULL')
      .andWhere('p.operationType = :operation', { operation: PropertyOperationType.RENT })
      .andWhere('p.price IS NOT NULL')
      .andWhere('p.price > 0');

    const allowedStatuses = [
      PropertyStatus.PUBLISHED,
      PropertyStatus.PRE_APPROVED,
      PropertyStatus.CONTRACT_IN_PROGRESS,
      PropertyStatus.REQUEST,
    ];

    qb.andWhere('p.status IN (:...statuses)', { statuses: allowedStatuses });

    if (query.search && query.search.trim() !== '') {
      const needle = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        `(
          LOWER(p.title) LIKE :needle OR
          LOWER(p.code) LIKE :needle OR
          LOWER(p.city) LIKE :needle OR
          LOWER(p.state) LIKE :needle
        )`,
        { needle },
      );
    }

    qb.select([
      'p.id AS id',
      'p.code AS code',
      'p.title AS title',
      'p.status AS status',
      'p.city AS city',
      'p.state AS state',
      'p.price AS price',
      'p.currencyPrice AS currencyPrice',
      'p.mainImageUrl AS mainImageUrl',
      'pt.id AS propertyTypeId',
      'pt.name AS propertyTypeName',
    ]);

    qb.orderBy('p.updatedAt', 'DESC').addOrderBy('p.createdAt', 'DESC');
    qb.limit(limit);

    const rows = await qb.getRawMany();

    return rows.map((row: Record<string, any>) => ({
      id: row.id,
      code: row.code,
      title: row.title,
      status: row.status,
      city: row.city,
      state: row.state,
      price:
        typeof row.price === 'number'
          ? row.price
          : row.price !== null && row.price !== undefined
            ? Number(row.price)
            : null,
      currencyPrice: row.currencyPrice,
      propertyTypeId: row.propertyTypeId,
      propertyTypeName: row.propertyTypeName,
      mainImageUrl: row.mainImageUrl,
    }));
  }

  async gridRentProperties(query: GridRentQueryDto) {
    console.log('gridRentProperties called with query:', query);
    // Allowed fields and mappings
    const availableFields = [
      'id',
      'code',
      'isFeatured',
      'title',
      'status',
      'operationType',
      'typeName',
      'characteristics',
      'assignedAgentName',
      'creatorName',
      'city',
      'state',
      'priceDisplay',
      'price',
      'currencyPrice',
      'createdAt',
      'updatedAt',
      'mainImageUrl',
    ];

    const fieldMappings: Record<string, string> = {
      id: 'p.id',
      code: 'p.code',
      isFeatured: 'p.isFeatured',
      title: 'p.title',
      status: 'p.status',
      operationType: 'p.operationType',
      typeName: 'pt.name AS typeName',
      city: 'p.city',
      state: 'p.state',
      price: 'p.price',
      currencyPrice: 'p.currencyPrice',
      createdAt: 'p.createdAt',
      updatedAt: 'p.updatedAt',
      mainImageUrl: 'p.mainImageUrl',
      // assignedAgentName should sort by agent username
      assignedAgentName: 'a.username',
      creatorName: 'cu.username',
      // characteristics and priceDisplay are derived post-query
    };

    const textSearchFields = [
      'LOWER(p.title)',
      'LOWER(p.code)',
      'LOWER(pt.name)',
      'LOWER(a.username)',
      'LOWER(cu.username)',
      'LOWER(p.city)',
      'LOWER(p.state)',
    ];

    // Parse fields
    const requested = (query.fields || '')
      .split(',')
      .map((f) => f.trim())
      .filter((f) => f);
    const fields = requested.length
      ? requested.filter((f) => availableFields.includes(f))
      : availableFields;

    if (fields.length === 0) {
      if (query.pagination === 'true') {
        return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
      }
      return [];
    }

    // Build select (raw) for non-derived fields, usando alias exactos para cada campo
    const rawSelects = fields
      .filter((f) => !['characteristics', 'priceDisplay', 'assignedAgentName', 'creatorName'].includes(f))
      .map((f) => {
        // Si el mapping ya tiene un alias (AS ...), úsalo tal cual
        if (fieldMappings[f] && fieldMappings[f].includes(' AS ')) return fieldMappings[f];
        // Si es un campo directo, forzar alias igual al nombre esperado
        if (fieldMappings[f]) return `${fieldMappings[f]} AS ${f}`;
        return `p.${f} AS ${f}`;
      });

    // Always include needed base fields for derivations if requested
    const needCharacteristics = fields.includes('characteristics');
    const needPriceDisplay = fields.includes('priceDisplay');
    if (needCharacteristics) {
      rawSelects.push(
        'p.bedrooms',
        'p.bathrooms',
        'p.landSquareMeters',
        'p.builtSquareMeters',
        'p.parkingSpaces',
        'p.floors',
      );
    }
    if (needPriceDisplay) {
      rawSelects.push('p.price', 'p.currencyPrice');
    }

    // assignedAgentName derivation needs agent personalInfo and username
    const needAgentName = fields.includes('assignedAgentName');
    if (needAgentName) {
      rawSelects.push('a.personalInfo AS assignedPersonalInfo');
      rawSelects.push('a.username AS assignedUsername');
    }

    // creatorName derivation needs creator personalInfo and username
    const needCreatorName = fields.includes('creatorName');
    if (needCreatorName) {
      rawSelects.push('cu.personalInfo AS creatorPersonalInfo');
      rawSelects.push('cu.username AS creatorUsername');
    }

    // Fallback: ensure id exists in selection for identity mapping
    if (!rawSelects.find((s) => s.startsWith('p.id'))) rawSelects.unshift('p.id');

    const qb = this.propertyRepository
      .createQueryBuilder('p')
      .leftJoin('p.propertyType', 'pt')
      .leftJoin('p.assignedAgent', 'a')
      .leftJoin('p.creatorUser', 'cu')
      .where('p.deletedAt IS NULL')
      .andWhere('p.operationType = :op', { op: PropertyOperationType.RENT });

        // Column filters
    const filtration = query.filtration === 'true';
    console.log('[DEBUG] gridRentProperties - filtration enabled:', filtration);
    if (filtration && query.filters) {
      const items = query.filters
        .split(',')
        .map((f) => f.trim())
        .filter((f) => f.includes('-'))
        .map((f) => {
          const dash = f.indexOf('-');
          return {
            column: f.substring(0, dash).trim(),
            value: decodeURIComponent(f.substring(dash + 1).trim()),
          };
        })
        .filter((f) => f.column && f.value && availableFields.includes(f.column));

      console.log('[DEBUG] gridRentProperties - Parsed filter items:', items);

      for (const f of items) {
        if (f.column === 'assignedAgentName') {
          // Filtrar por username o por nombre en personalInfo (JSON)
          const param = `%${f.value.toLowerCase()}%`;
          // Busca en username y en personalInfo (firstName, lastName)
          qb.andWhere(
            `(
              LOWER(a.username) LIKE :f_assignedAgentName
              OR LOWER(JSON_UNQUOTE(JSON_EXTRACT(a.personalInfo, '$.firstName'))) LIKE :f_assignedAgentName
              OR LOWER(JSON_UNQUOTE(JSON_EXTRACT(a.personalInfo, '$.lastName'))) LIKE :f_assignedAgentName
            )`,
            { f_assignedAgentName: param }
          );
          console.log('[DEBUG] gridRentProperties - Applying filter: assignedAgentName LIKE', param);
        } else {
          const mapping = fieldMappings[f.column] || `p.${f.column}`;
          const dbField = mapping.split(' AS ')[0];
          console.log(`[DEBUG] gridRentProperties - Applying filter: ${f.column} LIKE '%${f.value}%' on field ${dbField}`);
          const param = `%${f.value.toLowerCase()}%`;
          qb.andWhere(`LOWER(${dbField}) LIKE :f_${f.column}`, {
            [`f_${f.column}`]: param,
          });
        }
      }
    }

    // Global search
    if (query.search && query.search.trim() !== '') {
      const needle = query.search.trim().toLowerCase();
      const orExpr = textSearchFields
        .map((f, idx) => `${f} LIKE :s${idx}`)
        .join(' OR ');
      const params = Object.fromEntries(
        textSearchFields.map((_, idx) => [`s${idx}`, `%${needle}%`]),
      );
      qb.andWhere(`(${orExpr})`, params);
    }

    // Sorting
    const sortDir = query.sort === 'desc' ? 'DESC' : 'ASC';
    const sortField = query.sortField && availableFields.includes(query.sortField)
      ? query.sortField
      : undefined;
    if (sortField) {
      const mapping = fieldMappings[sortField] || `p.${sortField}`;
      const dbField = mapping.split(' AS ')[0];
      qb.orderBy(dbField, sortDir as 'ASC' | 'DESC');
    } else {
      qb.orderBy('p.publishedAt', 'DESC').addOrderBy('p.createdAt', 'DESC');
    }

    // Selects
    qb.select(rawSelects);

    // Pagination
    const doPaginate = query.pagination === 'true';
    let total = 0;
    let page = Math.max(1, query.page || 1);
    let limit = Math.min(Math.max(1, query.limit || 10), 100);

    try {
      if (doPaginate) {
        total = await qb.getCount();
        console.log('Total properties with operationType RENT:', total);
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        qb.limit(limit).offset(offset);
        const rows = await qb.getRawMany();
        console.log('Raw rows from query:', rows.length);
        const data = rows.map((r: any) => this.mapGridRow(r, fields));
        console.log('Mapped data:', data.length);
        if (data.length > 0) console.log('[DEBUG] gridRentProperties - sample row keys:', Object.keys(data[0]));
        return { data, total, page, limit, totalPages };
      }

      const rows = await qb.getRawMany();
      console.log('Raw rows from non-paginated query:', rows.length);
      return rows.map((r: any) => this.mapGridRow(r, fields));
    } catch (error) {
      console.error('Error in gridRentProperties:', error);
      throw error;
    }
  }

  async gridByUser(userId: string, query: GridSaleQueryDto & { operationType?: PropertyOperationType }) {
    console.log('gridByUser called for user:', userId, 'with query:', query);
    
    // Al reutilizar gridSaleProperties, necesitamos pasar un query compatible.
    // Usamos el query base pero agregamos el filtro de userId y operationType.
    
    // Primero definimos los campos disponibles
    const availableFields = [
      'id', 'code', 'isFeatured', 'title', 'status', 'operationType', 'typeName',
      'characteristics', 'assignedAgentName', 'creatorName', 'city', 'state',
      'priceDisplay', 'price', 'currencyPrice', 'createdAt', 'updatedAt', 'mainImageUrl',
    ];

    const fieldMappings: Record<string, string> = {
      id: 'p.id',
      code: 'p.code',
      isFeatured: 'p.isFeatured',
      title: 'p.title',
      status: 'p.status',
      operationType: 'p.operationType',
      typeName: 'pt.name AS typeName',
      city: 'p.city',
      state: 'p.state',
      price: 'p.price',
      currencyPrice: 'p.currencyPrice',
      createdAt: 'p.createdAt',
      updatedAt: 'p.updatedAt',
      mainImageUrl: 'p.mainImageUrl',
      assignedAgentName: 'a.username',
      creatorName: 'cu.username',
    };

    // Selección de campos
    const requested = (query.fields || '').split(',').map(f => f.trim()).filter(f => f);
    const fields = requested.length ? requested.filter(f => availableFields.includes(f)) : availableFields;

    const rawSelects = fields
      .filter(f => !['characteristics', 'priceDisplay', 'assignedAgentName', 'creatorName'].includes(f))
      .map(f => {
        if (fieldMappings[f] && fieldMappings[f].includes(' AS ')) return fieldMappings[f];
        if (fieldMappings[f]) return `${fieldMappings[f]} AS ${f}`;
        return `p.${f} AS ${f}`;
      });

    // Añadir campos base necesarios para cálculos
    if (fields.includes('characteristics')) {
      rawSelects.push('p.bedrooms AS bedrooms', 'p.bathrooms AS bathrooms', 'p.landSquareMeters AS landSquareMeters', 'p.builtSquareMeters AS builtSquareMeters', 'p.parkingSpaces AS parkingSpaces', 'p.floors AS floors');
    }
    if (fields.includes('priceDisplay')) {
      rawSelects.push('p.price AS price', 'p.currencyPrice AS currencyPrice');
    }
    if (fields.includes('assignedAgentName')) {
      rawSelects.push('a.personalInfo AS assignedPersonalInfo', 'a.username AS assignedUsername');
    }
    if (fields.includes('creatorName')) {
      rawSelects.push('cu.personalInfo AS creatorPersonalInfo', 'cu.username AS creatorUsername');
    }

    if (!rawSelects.find(s => s.startsWith('p.id'))) rawSelects.unshift('p.id AS id');

    const qb = this.propertyRepository
      .createQueryBuilder('p')
      .leftJoin('p.propertyType', 'pt')
      .leftJoin('p.assignedAgent', 'a')
      .leftJoin('p.creatorUser', 'cu')
      .where('p.deletedAt IS NULL')
      .andWhere('(p.creatorUserId = :userId OR p.assignedAgentId = :userId)', { userId });

    if (query.operationType) {
      qb.andWhere('p.operationType = :opType', { opType: query.operationType });
    }

    // Sort y filtros
    if (query.sortField && query.sort) {
      const dbField = fieldMappings[query.sortField] ? fieldMappings[query.sortField].split(' AS ')[0] : `p.${query.sortField}`;
      qb.orderBy(dbField, query.sort.toUpperCase() as 'ASC' | 'DESC');
    } else {
      qb.orderBy('p.createdAt', 'DESC');
    }

    const { page = 1, limit = 10, pagination = 'true' } = query;
    if (pagination === 'true') {
      const skip = (page - 1) * limit;
      qb.skip(skip).take(limit);
    }

    const [rawItems, total] = await Promise.all([
      qb.select(rawSelects).getRawMany(),
      qb.getCount(),
    ]);

    // Procesar resultados usando mapGridRow para consistencia total en el sistema
    const items = rawItems.map(item => this.mapGridRow(item, fields));

    if (pagination === 'true') {
      return { data: items, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) };
    }

    return items;
  }

  /**
   * Get published properties with filters and pagination
   * Limit is fixed at 9 per page
   */
  async getPublishedPropertiesFiltered(filters: any) {
    try {
      console.log('🔍 [PropertyService.getPublishedPropertiesFiltered] Starting with filters:', filters);
      
      const limit = 9;
      const page = Math.max(1, parseInt(filters?.page) || 1);
      const skip = (page - 1) * limit;

      let query = this.propertyRepository
        .createQueryBuilder('property')
        .leftJoinAndSelect('property.propertyType', 'pt')
        .where('property.status = :status', { status: PropertyStatus.PUBLISHED })
        .andWhere('property.deletedAt IS NULL');

      console.log('📋 [PropertyService] Base query created');

      // Filter by operation
      if (filters?.operation && filters.operation !== '' && filters.operation !== null) {
        console.log('🔎 Filtering by operation:', filters.operation);
        query = query.andWhere('property.operationType = :operation', {
          operation: filters.operation,
        });
      }

      // Filter by property type (without join first, just check if needed)
      if (filters?.typeProperty && filters.typeProperty !== '' && filters.typeProperty !== null) {
        console.log('🔎 Filtering by typeProperty:', filters.typeProperty);
        query = query
          .andWhere('pt.name = :typeProperty', { typeProperty: filters.typeProperty });
      }

      // Filter by state (region)
      if (filters?.state && filters.state !== '' && filters.state !== null) {
        console.log('🔎 Filtering by state:', filters.state);
        query = query.andWhere('property.state = :state', { state: filters.state });
      }

      // Filter by city (commune)
      if (filters?.city && filters.city !== '' && filters.city !== null) {
        console.log('🔎 Filtering by city:', filters.city);
        query = query.andWhere('property.city = :city', { city: filters.city });
      }

      // Filter by currency
      if (filters?.currency && filters.currency !== '' && filters.currency !== 'all' && filters.currency !== null) {
        console.log('🔎 Filtering by currency:', filters.currency);
        query = query.andWhere('property.currencyPrice = :currency', {
          currency: filters.currency,
        });
      }

      // Filter by bedrooms with dynamic operator
      if (filters?.bedrooms && parseInt(filters.bedrooms) > 0) {
        const operator = filters.bedroomsOperator || 'gte';
        const operatorMap = { lte: '<=', eq: '=', gte: '>=' };
        const sqlOperator = operatorMap[operator] || '>=';
        console.log(`🔎 Filtering by bedrooms: ${sqlOperator} ${filters.bedrooms}`);
        query = query.andWhere(`property.bedrooms ${sqlOperator} :bedrooms`, {
          bedrooms: parseInt(filters.bedrooms),
        });
      }

      // Filter by bathrooms with dynamic operator
      if (filters?.bathrooms && parseInt(filters.bathrooms) > 0) {
        const operator = filters.bathroomsOperator || 'gte';
        const operatorMap = { lte: '<=', eq: '=', gte: '>=' };
        const sqlOperator = operatorMap[operator] || '>=';
        console.log(`🔎 Filtering by bathrooms: ${sqlOperator} ${filters.bathrooms}`);
        query = query.andWhere(`property.bathrooms ${sqlOperator} :bathrooms`, {
          bathrooms: parseInt(filters.bathrooms),
        });
      }

      // Filter by parking spaces with dynamic operator
      if (filters?.parkingSpaces && parseInt(filters.parkingSpaces) > 0) {
        const operator = filters.parkingSpacesOperator || 'gte';
        const operatorMap = { lte: '<=', eq: '=', gte: '>=' };
        const sqlOperator = operatorMap[operator] || '>=';
        console.log(`🔎 Filtering by parkingSpaces: ${sqlOperator} ${filters.parkingSpaces}`);
        query = query.andWhere(`property.parkingSpaces ${sqlOperator} :parkingSpaces`, {
          parkingSpaces: parseInt(filters.parkingSpaces),
        });
      }

      // Filter by built square meters (minimum)
      if (filters?.builtSquareMetersMin && parseInt(filters.builtSquareMetersMin) > 0) {
        console.log('🔎 Filtering by builtSquareMetersMin:', filters.builtSquareMetersMin);
        query = query.andWhere('property.builtSquareMeters >= :builtSquareMetersMin', {
          builtSquareMetersMin: parseInt(filters.builtSquareMetersMin),
        });
      }

      // Filter by land square meters (minimum)
      if (filters?.landSquareMetersMin && parseInt(filters.landSquareMetersMin) > 0) {
        console.log('🔎 Filtering by landSquareMetersMin:', filters.landSquareMetersMin);
        query = query.andWhere('property.landSquareMeters >= :landSquareMetersMin', {
          landSquareMetersMin: parseInt(filters.landSquareMetersMin),
        });
      }

      // Filter by construction year (minimum)
      if (filters?.constructionYearMin && parseInt(filters.constructionYearMin) > 0) {
        console.log('🔎 Filtering by constructionYearMin:', filters.constructionYearMin);
        query = query.andWhere('property.constructionYear >= :constructionYearMin', {
          constructionYearMin: parseInt(filters.constructionYearMin),
        });
      }

      console.log('⏳ [PropertyService] Getting count...');
      const total = await query.getCount();
      console.log('✅ [PropertyService] Total count:', total);

      console.log('⏳ [PropertyService] Fetching data with multimedia relations...');
      const data = await query
        .leftJoinAndSelect('property.multimedia', 'multimedia')
        .orderBy('property.createdAt', 'DESC')
        .skip(skip)
        .take(limit)
        .getMany();

      console.log('✅ [PropertyService] Data fetched:', data.length, 'properties');

      // Cargar multimedia para propiedades sin mainImageUrl
      const idsNeedingFallback = data
        .filter(p => !p.mainImageUrl || p.mainImageUrl.trim() === '')
        .map(p => p.id);

      console.log('🔍 [getPublishedPropertiesFiltered] Properties with mainImageUrl:', data.filter(p => p.mainImageUrl).length);
      console.log('🔍 [getPublishedPropertiesFiltered] Properties WITHOUT mainImageUrl:', idsNeedingFallback.length);
      console.log('🔍 [getPublishedPropertiesFiltered] IDs needing fallback:', idsNeedingFallback);

      // Usar multimedia array cargado para asignar mainImageUrl
      if (idsNeedingFallback.length > 0) {
        console.log('📸 Processing fallback for', idsNeedingFallback.length, 'properties without mainImageUrl');
        
        for (const property of data) {
          // Si mainImageUrl ya existe pero es un video, reemplazarlo con una imagen
          const isVideoUrl = (url: string) => {
            const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
            return videoExtensions.some(ext => url.toLowerCase().includes(ext));
                                     };
          
          const needsImageFallback = !property.mainImageUrl || 
                                    property.mainImageUrl.trim() === '' || 
                                    isVideoUrl(property.mainImageUrl);
          
          if (needsImageFallback) {
            // Buscar la primera imagen en multimedia
            const imageMultimedia = property.multimedia?.find(m => 
              m.format === MultimediaFormat.IMG && m.type === MultimediaType.PROPERTY_IMG
            );
            
            if (imageMultimedia) {
              property.mainImageUrl = imageMultimedia.url;
              console.log(`✅ Set mainImageUrl for property ${property.id} from multimedia: ${imageMultimedia.url}`);
            } else {
              console.log(`⚠️ Property ${property.id} has no image multimedia (checked ${property.multimedia?.length || 0} items)`);
              if (property.multimedia && property.multimedia.length > 0) {
                               console.log(`   Multimedia types in property: ${property.multimedia.map(m => `${m.type}:${m.format}`).join(', ')}`);
              }
            }
          }
        }
      } else {
        console.log('⚠️ No properties need multimedia fallback (all have mainImageUrl)');
      }

      // Helper: Normalizar URLs antiguas (retrocompatibilidad)
      const normalizeUrl = (url: string): string => {
       
        if (!url) return url;
        
        // Si ya tiene /img/ o /video/ no hacer nada
        if (url.includes('/properties/img/') || url.includes('/properties/video/')) {
          return url;
        }
        
        // Si está en /public/properties/ y no tiene subcarpeta, agregar /img/ por defecto
        if (url.includes('/public/properties/') && !url.includes('/properties/img/') && !url.includes('/properties/video/')) {
          return url.replace('/public/properties/', '/public/properties/img/');
        }
        
        return url;
      };

      // Normalizar mainImageUrl para todas las propiedades
      for (const property of data) {
        if (property.mainImageUrl) {
          property.mainImageUrl = normalizeUrl(property.mainImageUrl);
          console.log(`📸 [getPublishedPropertiesFiltered] Property ${property.id} mainImageUrl:`, property.mainImageUrl);
        } else {
          console.log(`⚠️ [getPublishedPropertiesFiltered] Property ${property.id} has NO mainImageUrl`);
        }
      }

      const totalPages = Math.ceil(total / limit);

      return {
        data,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      console.error('❌ Error in getPublishedPropertiesFiltered:', error);
      throw error;
    }
  }

  /**
   * Crea una nueva propiedad en estado REQUEST desde el portal
   * Se registra en postRequest para revisión de admins
   */
  async createPropertyRequest(
    createPropertyRequestDto: any,
    userId: string,
  ): Promise<Property> {
    const {
      title,
      description,
      propertyTypeId,
      operationType,
      builtSquareMeters,
      landSquareMeters,
      bedrooms,
      bathrooms,
      parkingSpaces,
      floors,
      constructionYear,
      price,
      currencyPrice,
      region,
      city,
      address,
      contactName,
      contactPhone,
      contactEmail,
      multimediaIds,
      coordinates,
    } = createPropertyRequestDto;

    console.log('📝 [createPropertyRequest] Iniciando creación de solicitud de propiedad');

    const opType = operationType === 'SALE' ? PropertyOperationType.SALE : PropertyOperationType.RENT;

    // Generate unique property code
    const code = await this.generatePropertyCode(opType);

    // Sanitize price (remove any formatting characters except dot/comma for decimal)
    let parsedPrice = 0;
    if (price !== undefined && price !== null) {
      if (typeof price === 'string') {
        // If it's a string, remove thousand separators (dots handled as thousand separators for CLP)
        // This is a bit tricky since UF uses dots for decimals.
        // For now, let's assume if it contains more than one dot it's thousand separators, 
        // or just remove all dots if currency is CLP.
        let cleanPrice = price.toString().replace(/\s/g, '');
        if (currencyPrice === 'CLP') {
          cleanPrice = cleanPrice.replace(/\./g, '');
        }
        // Replace comma with dot for decimal if any
        cleanPrice = cleanPrice.replace(/,/g, '.');
        parsedPrice = parseFloat(cleanPrice);
      } else {
        parsedPrice = Number(price);
      }
    }

    // Crear la propiedad en estado REQUEST
    const property = this.propertyRepository.create({
      title,
      description,
      code,
      propertyTypeId,
      operationType: opType,
      status: PropertyStatus.REQUEST, // Estado inicial: solicitud
      price: isNaN(parsedPrice) ? 0 : parsedPrice,
      currencyPrice: currencyPrice as CurrencyPriceEnum,
      builtSquareMeters: builtSquareMeters || null,
      landSquareMeters: landSquareMeters || null,
      bedrooms: bedrooms || null,
      bathrooms: bathrooms || null,
      parkingSpaces: parkingSpaces || null,
      floors: floors || null,
      constructionYear: constructionYear || null,
      state: region, // región
      city, // comuna
      address,
      latitude: coordinates?.latitude || coordinates?.lat || null,
      longitude: coordinates?.longitude || coordinates?.lng || null,
      creatorUserId: userId,
      changeHistory: [
        {
          timestamp: new Date(),
          changedBy: userId,
          field: 'status',
          previousValue: null,
          newValue: PropertyStatus.REQUEST,
        },
      ],
      postRequest: {
        requestedAt: new Date(),
        requestedBy: userId,
        contactName,
        contactEmail,
        contactPhone,
        status: PostRequestStatus.PENDING,
      },
      views: [],
      leads: [],
    });

    const savedProperty = await this.propertyRepository.save(property);
    console.log('✅ [createPropertyRequest] Propiedad creada:', savedProperty.id);

    // Asociar multimedia si se proporcionó
    if (multimediaIds && multimediaIds.length > 0) {
      console.log('📸 [createPropertyRequest] Asociando', multimediaIds.length, 'archivos multimedia');
      await this.multimediaRepository
        .createQueryBuilder()
        .update(Multimedia)
        .set({ propertyId: savedProperty.id })
        .where('id IN (:...ids)', { ids: multimediaIds })
        .execute();
      
      // Si hay al menos una imagen, establecer la primera como mainImageUrl
      const firstMultimedia = await this.multimediaRepository.findOne({
        where: { id: multimediaIds[0] }
      });
      if (firstMultimedia && firstMultimedia.url) {
        await this.propertyRepository.update(savedProperty.id, {
          mainImageUrl: firstMultimedia.url
        });
      }
    }

    // TODO: Enviar notificación a admins para revisar la solicitud
    console.log('📧 [createPropertyRequest] Enviando notificación a admins');
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user) {
        await this.notificationsService.notifyPropertyPublicationRequestToAdmins(
          user.name || user.email,
          user.email,
          savedProperty.title,
          'Propiedad', // Simplificado o cargar PropertyType si es necesario
          savedProperty.operationType === PropertyOperationType.SALE ? 'Venta' : 'Arriendo',
          contactPhone
        );
        console.log('✅ Notificación enviada correctamente');
      }
    } catch (error) {
      console.error('❌ Error enviando notificación de publicación:', error);
    }

    return property;
  }

  /**
   * Obtiene la información básica de una propiedad por ID
   * Incluye: título, descripción, precio, tipo, estado, operación, usuario creador
   */
  async getBasicPropertyInfo(propertyId: string): Promise<any> {
    const property = await this.propertyRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.propertyType', 'pt')
      .leftJoinAndSelect('p.creatorUser', 'cu')
      .where('p.id = :id', { id: propertyId })
      .andWhere('p.deletedAt IS NULL')
      .select([
        'p.id',
        'p.title',
        'p.description',
        'p.status',
        'p.operationType',
        'p.price',
        'p.currencyPrice',
        'p.publicationDate',
        'p.assignedAgentId',
        'p.propertyTypeId',
        'p.createdAt',
        'p.updatedAt',
        'pt.id',
        'pt.name',
        'pt.description',
        'pt.hasBedrooms',
        'pt.hasBathrooms',
        'pt.hasBuiltSquareMeters',
        'pt.hasLandSquareMeters',
        'pt.hasParkingSpaces',
        'pt.hasFloors',
        'pt.hasConstructionYear',
        'cu.id',
        'cu.username',
        'cu.email',
        'cu.personalInfo',
      ])
      .getOne();

    if (!property) {
      throw new NotFoundException(`Property with ID ${propertyId} not found`);
    }

    return property;
  }

  /**
   * Obtiene la información del header de una propiedad (título, estado)
   */
  async getPropertyHeaderInfo(propertyId: string): Promise<any> {
    const property = await this.propertyRepository
      .createQueryBuilder('p')
      .where('p.id = :id', { id: propertyId })
      .andWhere('p.deletedAt IS NULL')
      .select([
        'p.id',
        'p.title',
        'p.code',
        'p.status',
        'p.isFeatured',
      ])
      .getOne();

    if (!property) {
      throw new NotFoundException(`Property with ID ${propertyId} not found`);
    }

    return property;
  }

  /**
   * Obtiene las características disponibles de una propiedad según su tipo
   */
  async getPropertyCharacteristics(propertyId: string): Promise<any> {
    const property = await this.propertyRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.propertyType', 'pt')
      .where('p.id = :id', { id: propertyId })
      .andWhere('p.deletedAt IS NULL')
      .select([
        'p.id',
        'p.builtSquareMeters',
        'p.landSquareMeters',
        'p.bedrooms',
        'p.bathrooms',
        'p.parkingSpaces',
        'p.floors',
        'p.constructionYear',
        'pt.id',
        'pt.name',
        'pt.hasBedrooms',
        'pt.hasBathrooms',
        'pt.hasBuiltSquareMeters',
        'pt.hasLandSquareMeters',
        'pt.hasParkingSpaces',
        'pt.hasFloors',
        'pt.hasConstructionYear',
      ])
      .getOne();

    if (!property) {
      throw new NotFoundException(`Property with ID ${propertyId} not found`);
    }

    // Mapear características con su estado de habilitación
    const characteristicsMap = [
      { 
        name: 'Metros cuadrados construidos', 
        value: property.builtSquareMeters || 0,
        enabled: property.propertyType?.hasBuiltSquareMeters || false
      },
      { 
        name: 'Metros cuadrados terreno', 
        value: property.landSquareMeters || 0,
        enabled: property.propertyType?.hasLandSquareMeters || false
      },
      { 
        name: 'Dormitorios', 
        value: property.bedrooms || 0,
        enabled: property.propertyType?.hasBedrooms || false
      },
      { 
        name: 'Baños', 
        value: property.bathrooms || 0,
        enabled: property.propertyType?.hasBathrooms || false
      },
      { 
        name: 'Espacios de estacionamiento', 
        value: property.parkingSpaces || 0,
        enabled: property.propertyType?.hasParkingSpaces || false
      },
      { 
        name: 'Pisos', 
        value: property.floors || 0,
        enabled: property.propertyType?.hasFloors || false
      },
      { 
        name: 'Año de construcción', 
        value: property.constructionYear || 0,
        enabled: property.propertyType?.hasConstructionYear || false
      },
    ];

    return {
      propertyId: property.id,
      propertyType: property.propertyType?.name,
      characteristics: characteristicsMap,
    };
  }

  /**
   * Obtiene la información de ubicación de una propiedad
   */
  async getPropertyLocation(propertyId: string): Promise<any> {
    const property = await this.propertyRepository
      .createQueryBuilder('p')
      .where('p.id = :id', { id: propertyId })
      .andWhere('p.deletedAt IS NULL')
      .select([
        'p.id',
        'p.state',
        'p.city',
        'p.address',
        'p.latitude',
        'p.longitude',
      ])
      .getOne();

    if (!property) {
      throw new NotFoundException(`Property with ID ${propertyId} not found`);
    }

    return {
      state: property.state || null,
      city: property.city || null,
      address: property.address || null,
      latitude: property.latitude ? Number(property.latitude) : null,
      longitude: property.longitude ? Number(property.longitude) : null,
    };
  }

  /**
   * Obtiene todas las multimedias de una propiedad
   */
  async getPropertyMultimedia(propertyId: string): Promise<any[]> {
    const property = await this.propertyRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.multimedia', 'm')
      .where('p.id = :id', { id: propertyId })
      .andWhere('p.deletedAt IS NULL')
      .andWhere('m.deletedAt IS NULL')
      .getOne();

    if (!property) {
      throw new NotFoundException(`Property with ID ${propertyId} not found`);
    }

    // Helper: Normalizar URLs antiguas a nuevas rutas (retrocompatibilidad)
    const normalizeUrl = (url: string, type: 'IMG' | 'VIDEO'): string => {
      if (!url) return url;
      
      // Si ya tiene /img/ o /video/ no hacer nada
      if (url.includes('/properties/img/') || url.includes('/properties/video/')) {
        return url;
      }
      
      // Si está en /public/properties/ y no tiene subcarpeta, agregar
      if (url.includes('/public/properties/') && !url.includes('/properties/img/') && !url.includes('/properties/video/')) {
        const subfolder = type === 'IMG' ? 'img' : 'video';
        return url.replace('/public/properties/', `/public/properties/${subfolder}/`);
      }
      
      return url;
    };

    // Retornar multimedias con mainImageUrl incluido en cada item
    return (property.multimedia || []).map((m: any) => ({
      id: m.id,
      url: normalizeUrl(m.url, m.format),
      type: m.format === 'IMG' ? 'image' : 'video',
      size: m.size,
      uploadedAt: m.uploadedAt,
      mainImageUrl: property.mainImageUrl,
    }));
  }

  /**
   * Obtiene el historial de cambios de una propiedad con nombres de usuarios
   */
  async getPropertyHistory(propertyId: string): Promise<any[]> {
    const property = await this.propertyRepository.findOne({
      where: { id: propertyId, deletedAt: IsNull() },
    });

    if (!property) {
      throw new NotFoundException(`Property with ID ${propertyId} not found`);
    }

    const changeHistory = property.changeHistory || [];

    // Resolver nombres de usuario para cada cambio
    const enrichedHistory = await Promise.all(
      changeHistory.map(async (entry: any) => {
        let userName = entry.changedBy;

        // Intentar obtener el nombre del usuario por ID
        if (entry.changedBy) {
          try {
            const user = await this.userRepository.findOne({
              where: { id: entry.changedBy },
            });

            if (user) {
              // Usar personalInfo si existe, si no usar email o username
              if (user.personalInfo?.firstName || user.personalInfo?.lastName) {
                userName = `${user.personalInfo?.firstName || ''} ${user.personalInfo?.lastName || ''}`.trim();
              } else if (user.email) {
                userName = user.email;
              } else {
                userName = user.username;
              }
            }
          } catch (error) {
            // Si hay error, usar el ID original
            console.warn(`Could not resolve user ${entry.changedBy}:`, error);
          }
        }

        return {
          ...entry,
          changedBy: userName,
        };
      })
    );

    return enrichedHistory;
  }

  /**
   * Obtiene datos SEO de una propiedad
   */
  async getSeoData(propertyId: string) {
    const property = await this.propertyRepository.findOne({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const favoritesCount = await this.getFavoritesCount(propertyId);
    const viewsCount = (property.views || []).length;

    return {
      seoTitle: property.seoTitle,
      seoDescription: property.seoDescription,
      seoKeywords: property.seoKeywords,
      isFeatured: property.isFeatured,
      publicationDate: property.publicationDate,
      viewsCount,
      favoritesCount,
    };
  }

  /**
   * Actualiza datos SEO de una propiedad
   */
  async updateSeoData(propertyId: string, dto: any, userId: string) {
    const property = await this.propertyRepository.findOne({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // Guardar valores anteriores para auditoría
    const previousSeoTitle = property.seoTitle;
    const previousSeoDescription = property.seoDescription;
    const previousSeoKeywords = property.seoKeywords;
    const previousIsFeatured = property.isFeatured;

    // Actualizar campos SEO si se proporcionan
    if (dto.seoTitle !== undefined) {
      property.seoTitle = dto.seoTitle;
    }
    if (dto.seoDescription !== undefined) {
      property.seoDescription = dto.seoDescription;
    }
    if (dto.seoKeywords !== undefined) {
      property.seoKeywords = dto.seoKeywords;
    }
    if (dto.isFeatured !== undefined) {
      property.isFeatured = dto.isFeatured;
    }

    // Registrar cambios en el historial
    const changes: ChangeHistoryEntry[] = [];

    if (previousSeoTitle !== property.seoTitle) {
      changes.push({
        field: 'seoTitle',
        previousValue: previousSeoTitle || null,
        newValue: property.seoTitle || null,
        changedBy: userId,
        timestamp: new Date(),
      });
    }

    if (previousSeoDescription !== property.seoDescription) {
      changes.push({
        field: 'seoDescription',
        previousValue: previousSeoDescription || null,
        newValue: property.seoDescription || null,
        changedBy: userId,
        timestamp: new Date(),
      });
    }

    if (previousSeoKeywords !== property.seoKeywords) {
      changes.push({
        field: 'seoKeywords',
        previousValue: previousSeoKeywords || null,
        newValue: property.seoKeywords || null,
        changedBy: userId,
        timestamp: new Date(),
      });
    }

    if (previousIsFeatured !== property.isFeatured) {
      changes.push({
        field: 'isFeatured',
        previousValue: previousIsFeatured ? 'true' : 'false',
        newValue: property.isFeatured ? 'true' : 'false',
        changedBy: userId,
        timestamp: new Date(),
      });
    }

    // Agregar cambios al historial
    if (changes.length > 0) {
      property.changeHistory = [...(property.changeHistory || []), ...changes];
    }

    await this.propertyRepository.save(property);

    return {
      seoTitle: property.seoTitle,
      seoDescription: property.seoDescription,
      seoKeywords: property.seoKeywords,
      isFeatured: property.isFeatured,
      publicationDate: property.publicationDate,
      viewsCount: (property.views || []).length,
      favoritesCount: 0,
    };
  }

  /**
   * Get published rent properties with filters and pagination
   * Automatically filters by operationType = 'RENT'
   */
  async getPublishedRentPropertiesFiltered(dto: FilterRentPropertiesDto): Promise<{
    data: Property[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      console.log('🔍 [PropertyService.getPublishedRentPropertiesFiltered] Starting with filters:', dto);

      const limit = dto.limit || 9;
      const page = Math.max(1, dto.page || 1);
      const skip = (page - 1) * limit;

      let query = this.propertyRepository
        .createQueryBuilder('property')
        .leftJoinAndSelect('property.propertyType', 'pt')
        .where('property.status = :status', { status: PropertyStatus.PUBLISHED })
        .andWhere('property.operationType = :operationType', { operationType: PropertyOperationType.RENT })
        .andWhere('property.deletedAt IS NULL');

      console.log('📋 [PropertyService] Base query created for rent properties');

      // Apply search filter
      if (dto.search && dto.search.trim() !== '') {
        const searchTerm = `%${dto.search.trim()}%`;
        query.andWhere(
          '(LOWER(property.title) LIKE LOWER(:search) OR LOWER(property.description) LIKE LOWER(:search))',
          { search: searchTerm }
        );
        console.log('🔎 Applied search filter:', dto.search);
      }

      // Apply additional filters (direct properties, not nested)
      if (dto.priceMin !== undefined) {
        query.andWhere('property.price >= :priceMin', { priceMin: dto.priceMin });
        console.log('🔎 Applied priceMin filter:', dto.priceMin);
      }

      if (dto.priceMax !== undefined) {
        query.andWhere('property.price <= :priceMax', { priceMax: dto.priceMax });
        console.log('🔎 Applied priceMax filter:', dto.priceMax);
      }

      if (dto.bedrooms !== undefined) {
        query.andWhere('property.bedrooms >= :bedrooms', { bedrooms: dto.bedrooms });
        console.log('🔎 Applied bedrooms filter:', dto.bedrooms);
      }

      if (dto.bathrooms !== undefined) {
        query.andWhere('property.bathrooms >= :bathrooms', { bathrooms: dto.bathrooms });
        console.log('🔎 Applied bathrooms filter:', dto.bathrooms);
      }

      if (dto.typeProperty) {
        query.andWhere('pt.name = :typeProperty', { typeProperty: dto.typeProperty });
        console.log('🔎 Applied typeProperty filter:', dto.typeProperty);
      }

      if (dto.state) {
        query.andWhere('property.state = :state', { state: dto.state });
        console.log('🔎 Applied state filter:', dto.state);
      }

      if (dto.city) {
        query.andWhere('property.city = :city', { city: dto.city });
        console.log('🔎 Applied city filter:', dto.city);
      }

      if (dto.currency && dto.currency !== 'all') {
        query.andWhere('property.currencyPrice = :currency', { currency: dto.currency });
        console.log('🔎 Applied currency filter:', dto.currency);
      }

      // Apply sorting
      if (dto.sort) {
        const [field, order] = dto.sort.split('_');
        const sortOrder = order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        switch (field) {
          case 'price':
            query.orderBy('property.price', sortOrder);
            break;
          case 'created':
            query.orderBy('property.createdAt', sortOrder);
            break;
          case 'title':
            query.orderBy('property.title', sortOrder);
            break;
          default:
            query.orderBy('property.createdAt', 'DESC');
        }
        console.log('🔄 Applied sorting:', { field, order: sortOrder });
      } else {
        query.orderBy('property.createdAt', 'DESC');
      }

      console.log('⏳ [PropertyService] Getting count...');
      const sql = query.getSql();
      console.log('🔍 [PropertyService] Generated SQL:', sql);
      const total = await query.getCount();
      console.log('✅ [PropertyService] Total count:', total);

      console.log('⏳ [PropertyService] Fetching data with multimedia relations...');
      const data = await query
        .leftJoinAndSelect('property.multimedia', 'multimedia')
        .skip(skip)
        .take(limit)
        .getMany();

      console.log('✅ [PropertyService] Data fetched:', data.length, 'rent properties');

      // Process multimedia fallback (same logic as getPublishedPropertiesFiltered)
      const idsNeedingFallback = data
        .filter(p => !p.mainImageUrl || p.mainImageUrl.trim() === '')
        .map(p => p.id);

      if (idsNeedingFallback.length > 0) {
        for (const property of data) {
          const needsImageFallback = !property.mainImageUrl ||
                                    property.mainImageUrl.trim() === '' ||
                                    this.isVideoUrl(property.mainImageUrl);

          if (needsImageFallback) {
            const imageMultimedia = property.multimedia?.find(m =>
              m.format === MultimediaFormat.IMG && m.type === MultimediaType.PROPERTY_IMG
            );

            if (imageMultimedia) {
              property.mainImageUrl = imageMultimedia.url;
              console.log(`✅ Set mainImageUrl for rent property ${property.id} from multimedia`);
            }
          }
        }
      }

      // Normalize URLs
      for (const property of data) {
        if (property.mainImageUrl) {
          property.mainImageUrl = this.normalizeUrl(property.mainImageUrl);
        }
      }

      const totalPages = Math.ceil(total / limit);

      return {
        data,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      console.error('❌ Error in getPublishedRentPropertiesFiltered:', error);
      throw error;
    }
  }

  /**
   * Get published sale properties with filters and pagination
   * Automatically filters by operationType = 'SALE'
   */
  async getPublishedSalePropertiesFiltered(dto: FilterSalePropertiesDto): Promise<{
    data: Property[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      console.log('🔍 [PropertyService.getPublishedSalePropertiesFiltered] Starting with filters:', dto);

      const limit = dto.limit || 9;
      const page = Math.max(1, dto.page || 1);
      const skip = (page - 1) * limit;

      let query = this.propertyRepository
        .createQueryBuilder('property')
        .leftJoinAndSelect('property.propertyType', 'pt')
        .where('property.status = :status', { status: PropertyStatus.PUBLISHED })
        .andWhere('property.operationType = :operationType', { operationType: PropertyOperationType.SALE })
        .andWhere('property.deletedAt IS NULL');

      console.log('📋 [PropertyService] Base query created for sale properties');

      // Apply search filter
      if (dto.search && dto.search.trim() !== '') {
        const searchTerm = `%${dto.search.trim()}%`;
        query.andWhere(
          '(LOWER(property.title) LIKE LOWER(:search) OR LOWER(property.description) LIKE LOWER(:search))',
          { search: searchTerm }
        );
        console.log('🔎 Applied search filter:', dto.search);
      }

      // Apply additional filters (direct properties, not nested)
      if (dto.priceMin !== undefined) {
        query.andWhere('property.price >= :priceMin', { priceMin: dto.priceMin });
        console.log('🔎 Applied priceMin filter:', dto.priceMin);
      }

      if (dto.priceMax !== undefined) {
        query.andWhere('property.price <= :priceMax', { priceMax: dto.priceMax });
        console.log('🔎 Applied priceMax filter:', dto.priceMax);
      }

      if (dto.bedrooms !== undefined) {
        query.andWhere('property.bedrooms >= :bedrooms', { bedrooms: dto.bedrooms });
        console.log('🔎 Applied bedrooms filter:', dto.bedrooms);
      }

      if (dto.bathrooms !== undefined) {
        query.andWhere('property.bathrooms >= :bathrooms', { bathrooms: dto.bathrooms });
        console.log('🔎 Applied bathrooms filter:', dto.bathrooms);
      }

      if (dto.typeProperty) {
        query.andWhere('pt.name = :typeProperty', { typeProperty: dto.typeProperty });
        console.log('🔎 Applied typeProperty filter:', dto.typeProperty);
      }

      if (dto.state) {
        query.andWhere('property.state = :state', { state: dto.state });
        console.log('🔎 Applied state filter:', dto.state);
      }

      if (dto.city) {
        query.andWhere('property.city = :city', { city: dto.city });
        console.log('🔎 Applied city filter:', dto.city);
      }

      if (dto.currency && dto.currency !== 'all') {
        query.andWhere('property.currencyPrice = :currency', { currency: dto.currency });
        console.log('🔎 Applied currency filter:', dto.currency);
      }

      // Apply sorting
      if (dto.sort) {
        const [field, order] = dto.sort.split('_');
        const sortOrder = order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        switch (field) {
          case 'price':
            query.orderBy('property.price', sortOrder);
            break;
          case 'created':
            query.orderBy('property.createdAt', sortOrder);
            break;
          case 'title':
            query.orderBy('property.title', sortOrder);
            break;
          default:
            query.orderBy('property.createdAt', 'DESC');
        }
        console.log('🔄 Applied sorting:', { field, order: sortOrder });
      } else {
        query.orderBy('property.createdAt', 'DESC');
      }

      console.log('⏳ [PropertyService] Getting count...');
      const sql = query.getSql();
      console.log('🔍 [PropertyService] Generated SQL:', sql);
      const total = await query.getCount();
      console.log('✅ [PropertyService] Total count:', total);

      console.log('⏳ [PropertyService] Fetching data with multimedia relations...');
      const data = await query
        .leftJoinAndSelect('property.multimedia', 'multimedia')
        .skip(skip)
        .take(limit)
        .getMany();

      console.log('✅ [PropertyService] Data fetched:', data.length, 'sale properties');

      // Process multimedia fallback (same logic as getPublishedPropertiesFiltered)
      const idsNeedingFallback = data
        .filter(p => !p.mainImageUrl || p.mainImageUrl.trim() === '')
        .map(p => p.id);

      if (idsNeedingFallback.length > 0) {
        for (const property of data) {
          const needsImageFallback = !property.mainImageUrl ||
                                    property.mainImageUrl.trim() === '' ||
                                    this.isVideoUrl(property.mainImageUrl);

          if (needsImageFallback) {
            const imageMultimedia = property.multimedia?.find(m =>
              m.format === MultimediaFormat.IMG && m.type === MultimediaType.PROPERTY_IMG
            );

            if (imageMultimedia) {
              property.mainImageUrl = imageMultimedia.url;
              console.log(`✅ Set mainImageUrl for sale property ${property.id} from multimedia`);
            }
          }
        }
      }

      // Normalize URLs
      for (const property of data) {
        if (property.mainImageUrl) {
          property.mainImageUrl = this.normalizeUrl(property.mainImageUrl);
        }
      }

      const totalPages = Math.ceil(total / limit);

      return {
        data,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      console.error('❌ Error in getPublishedSalePropertiesFiltered:', error);
      throw error;
    }
  }

  // Helper methods for URL processing
  private isVideoUrl(url: string): boolean {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  }

  private normalizeUrl(url?: string): string | undefined {
    if (!url) return url;

    let res = url;

    // Si ya tiene /img/ o /video/ no hacer nada
    if (!url.includes('/properties/img/') && !url.includes('/properties/video/')) {
      // Si está en /public/properties/ y no tiene subcarpeta, agregar /img/ por defecto
      if (url.includes('/public/properties/')) {
        res = url.replace('/public/properties/', '/public/properties/img/');
      }
    }

    // Asegurar que sea una URL completa si tenemos publicBaseUrl y es una ruta relativa
    if (res.startsWith('/') && this.publicBaseUrl) {
      return `${this.publicBaseUrl}${res}`;
    }

    return res;
  }

  /**
   * Toggle favorite for a property by user
   * Saves userId or 'anonymous' in the favorites array
   */
  async toggleFavorite(propertyId: string, userId: string): Promise<{ isFavorited: boolean }> {
    const property = await this.propertyRepository.findOne({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // Initialize favorites array if not exists and decide action
    const currentFavorites = property.favorites || [];
    const favoriteIndex = currentFavorites.findIndex(fav => fav.userId === userId);
    const isAdding = favoriteIndex < 0;

    if (isAdding) {
      // Add to favorites - Using new array reference for JSON persistence
      property.favorites = [
        ...currentFavorites,
        {
          userId,
          addedAt: new Date(),
        },
      ];
    } else {
      // Remove from favorites - Using new array reference for JSON persistence
      property.favorites = currentFavorites.filter(fav => fav.userId !== userId);
    }

    // Force save the property with favorites updated
    await this.propertyRepository.save(property);

    // Synchronize with User entity if not anonymous
    if (userId && userId !== 'anonymous') {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user) {
        const userFavorites = user.favoriteProperties || [];
        const userFavIndex = userFavorites.findIndex(
          (fav) => fav.propertyId === propertyId,
        );

        if (isAdding) {
          // If added to property, ensure it's in user favorites
          if (userFavIndex < 0) {
            user.favoriteProperties = [
              ...userFavorites,
              {
                propertyId,
                addedAt: new Date(),
              },
            ];
          }
        } else {
          // If removed from property, ensure it's removed from user favorites
          if (userFavIndex >= 0) {
            user.favoriteProperties = userFavorites.filter(
              (fav) => fav.propertyId !== propertyId,
            );
          }
        }
        await this.userRepository.save(user);
      }
    }

    return {
      isFavorited: isAdding,
    };
  }

  /**
   * Check if a property is favorited by a specific user
   */
  async isFavorited(propertyId: string, userId: string): Promise<boolean> {
    const property = await this.propertyRepository.findOne({
      where: { id: propertyId },
    });

    if (!property || !property.favorites) {
      return false;
    }

    return property.favorites.some(fav => fav.userId === userId);
  }

  /**
   * Get price range (min/max) for published properties
   * @param operationType Optional filter by SALE or RENT. If not provided, returns overall range.
   * @returns Object with minPrice and maxPrice
   */
  async getPriceRange(operationType?: PropertyOperationType): Promise<{ minPrice: number; maxPrice: number }> {
    try {
      let query = this.propertyRepository
        .createQueryBuilder('property')
        .select('MIN(property.price)', 'minPrice')
        .addSelect('MAX(property.price)', 'maxPrice')
        .where('property.status = :status', { status: PropertyStatus.PUBLISHED })
        .andWhere('property.deletedAt IS NULL')
        .andWhere('property.price > 0');

      if (operationType) {
        query = query.andWhere('property.operationType = :operationType', { operationType });
      }

      const result = await query.getRawOne();

      return {
        minPrice: result?.minPrice ? parseFloat(result.minPrice) : 0,
        maxPrice: result?.maxPrice ? parseFloat(result.maxPrice) : 10000000,
      };
    } catch (error) {
      console.error('❌ Error getting price range:', error);
      return { minPrice: 0, maxPrice: 10000000 };
    }
  }

  /**
   * Get related properties based on similarity algorithm
   * Priority: location > type > price > operation > characteristics
   */
  async getRelatedProperties(propertyId: string, limit: number = 5): Promise<Property[]> {
    try {
      // Get the reference property
      const refProperty = await this.propertyRepository.findOne({
        where: { id: propertyId, deletedAt: IsNull() },
        relations: ['propertyType'],
      });

      if (!refProperty) {
        return [];
      }

      const targetLimit = Math.max(3, limit); // Minimum 3 properties

      // Strategy 1: Same location + type + similar price + same operation
      let relatedProperties = await this.findRelatedWithCriteria(
        refProperty,
        {
          sameCity: true,
          sameState: true,
          sameType: true,
          priceRange: 0.3, // ±30%
          sameOperation: true,
        },
        targetLimit,
      );

      // Strategy 2: Relax price range if not enough results
      if (relatedProperties.length < targetLimit) {
        relatedProperties = await this.findRelatedWithCriteria(
          refProperty,
          {
            sameCity: true,
            sameState: true,
            sameType: true,
            priceRange: 0.5, // ±50%
            sameOperation: true,
          },
          targetLimit,
        );
      }

      // Strategy 3: Relax type requirement
      if (relatedProperties.length < targetLimit) {
        relatedProperties = await this.findRelatedWithCriteria(
          refProperty,
          {
            sameCity: true,
            sameState: true,
            sameType: false,
            priceRange: 0.5,
            sameOperation: true,
          },
          targetLimit,
        );
      }

      // Strategy 4: Expand to same region only
      if (relatedProperties.length < targetLimit) {
        relatedProperties = await this.findRelatedWithCriteria(
          refProperty,
          {
            sameCity: false,
            sameState: true,
            sameType: false,
            priceRange: 0.5,
            sameOperation: true,
          },
          targetLimit,
        );
      }

      // Strategy 5: Just get recent published properties with same operation
      if (relatedProperties.length < targetLimit) {
        relatedProperties = await this.findRelatedWithCriteria(
          refProperty,
          {
            sameCity: false,
            sameState: false,
            sameType: false,
            priceRange: null,
            sameOperation: true,
          },
          targetLimit,
        );
      }

      return relatedProperties.slice(0, limit);
    } catch (error) {
      console.error('❌ Error getting related properties:', error);
      return [];
    }
  }

  private async findRelatedWithCriteria(
    refProperty: Property,
    criteria: {
      sameCity: boolean;
      sameState: boolean;
      sameType: boolean;
      priceRange: number | null;
      sameOperation: boolean;
    },
    limit: number,
  ): Promise<Property[]> {
    let query = this.propertyRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.propertyType', 'pt')
      .leftJoinAndSelect('p.multimedia', 'm')
      .where('p.status = :status', { status: PropertyStatus.PUBLISHED })
      .andWhere('p.deletedAt IS NULL')
      .andWhere('p.id != :refId', { refId: refProperty.id });

    // Location filters
    if (criteria.sameCity && refProperty.city) {
      query = query.andWhere('p.city = :city', { city: refProperty.city });
    }
    if (criteria.sameState && refProperty.state) {
      query = query.andWhere('p.state = :state', { state: refProperty.state });
    }

    // Type filter
    if (criteria.sameType && refProperty.propertyTypeId) {
      query = query.andWhere('p.propertyTypeId = :typeId', {
        typeId: refProperty.propertyTypeId,
      });
    }

    // Operation filter
    if (criteria.sameOperation && refProperty.operationType) {
      query = query.andWhere('p.operationType = :operationType', {
        operationType: refProperty.operationType,
      });
    }

    // Price range filter
    if (criteria.priceRange !== null && refProperty.price > 0) {
      const minPrice = refProperty.price * (1 - criteria.priceRange);
      const maxPrice = refProperty.price * (1 + criteria.priceRange);
      query = query.andWhere('p.price BETWEEN :minPrice AND :maxPrice', {
        minPrice,
        maxPrice,
      });
    }

    // Order by: featured first, then by creation date
    query = query
      .orderBy('p.isFeatured', 'DESC')
      .addOrderBy('p.createdAt', 'DESC')
      .limit(limit);

    return await query.getMany();
  }

}

function toInt(v: any): number { const n = parseInt(v, 10); return isNaN(n) ? 0 : n; }
function toNumber(v: any): number { const n = typeof v === 'number' ? v : parseFloat(v); return isNaN(n) ? 0 : n; }
function isFiniteNumber(n: any): boolean { return typeof n === 'number' && isFinite(n); }
function formatPrice(price: number, currency?: string): string {
  if (!isFiniteNumber(price) || price <= 0) return '';
  if (currency === 'UF') {
    return `${new Intl.NumberFormat('es-CL').format(Math.round(price))} UF`;
  }
  return `$ ${new Intl.NumberFormat('es-CL').format(Math.round(price))}`;
}

