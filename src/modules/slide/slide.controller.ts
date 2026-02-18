import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { SlideService } from './slide.service';
import { CreateSlideDto } from './dto/create-slide.dto';
import { CreateSlideWithMultimediaDto } from './dto/create-slide-with-multimedia.dto';
import { UpdateSlideDto } from './dto/update-slide.dto';
import { UpdateSlideWithMultimediaDto } from './dto/update-slide-with-multimedia.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Audit } from '../../common/interceptors/audit.interceptor';
import { AuditAction, AuditEntityType } from '../../common/enums/audit.enums';

@Controller('slide')
@ApiTags('Slides')
export class SlideController {
  constructor(private readonly slideService: SlideService) {}

  // Helper method para validar tamaño de archivo según tipo
  private validateFileSize(file: Express.Multer.File): void {
    if (!file) return;

    const isVideo = file.mimetype.startsWith('video/');
    const maxSize = isVideo ? 60 * 1024 * 1024 : 10 * 1024 * 1024; // 60MB vs 10MB
    const maxSizeLabel = isVideo ? '60MB' : '10MB';
    const fileType = isVideo ? 'videos' : 'imágenes';

    if (file.size > maxSize) {
      throw new BadRequestException(
        `El archivo excede el límite de ${maxSizeLabel} permitido para ${fileType}`
      );
    }

    // Validar tipo de archivo
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'video/mp4', 'video/webm', 'video/avi', 'video/mov'
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Solo se permiten imágenes (JPG, PNG, GIF) y videos (MP4, WebM, AVI, MOV)'
      );
    }
  }

  /**
   * Create a new slide without multimedia
   */
  @Post()
  @ApiOperation({ summary: 'Create new slide' })
  @ApiResponse({
    status: 201,
    description: 'Slide created successfully',
  })
  @ApiBody({ type: CreateSlideDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Audit(AuditAction.CREATE, AuditEntityType.PROPERTY, 'Slide created')
  create(@Body() createSlideDto: CreateSlideDto) {
    return this.slideService.create(createSlideDto);
  }

  /**
   * Create a new slide with multimedia file
   * Supports images (JPG, PNG, GIF max 10MB) and videos (MP4, WebM, AVI, MOV max 60MB)
   */
  @Post('create-with-multimedia')
  @ApiOperation({ summary: 'Create slide with optional multimedia file' })
  @ApiResponse({
    status: 201,
    description: 'Slide with optional multimedia created successfully',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        duration: { type: 'number', example: 3 },
        isActive: { type: 'boolean' },
        multimedia: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('multimedia', {
    fileFilter: (req, file, cb) => {
      // Aceptar archivos válidos o ningún archivo
      if (!file) {
        cb(null, true);
        return;
      }
      
      const isValidType = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');
      if (!isValidType) {
        cb(new BadRequestException('Solo se permiten imágenes y videos'), false);
        return;
      }
      
      cb(null, true);
    },
  }))
  @Audit(AuditAction.CREATE, AuditEntityType.PROPERTY, 'Slide created with optional multimedia')
  createWithMultimedia(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() createSlideDto: CreateSlideWithMultimediaDto,
  ) {
    // Validar tamaño de archivo solo si se proporcionó
    if (file) {
      this.validateFileSize(file);
    }

    // Asegurar que los tipos sean correctos desde FormData
    const processedDto = {
      ...createSlideDto,
      duration: typeof createSlideDto.duration === 'string' 
        ? parseInt(createSlideDto.duration, 10) 
        : createSlideDto.duration || 3,
      isActive: String(createSlideDto.isActive) === 'true',
    };
    
    return this.slideService.createWithMultimedia(processedDto, file);
  }

  /**
   * Get all slides with optional search
   */
  @Get()
  @ApiOperation({ summary: 'Get all slides' })
  @ApiResponse({
    status: 200,
    description: 'List of all slides',
  })
  @ApiQuery({ name: 'search', required: false })
  findAll(@Query('search') search?: string) {
    return this.slideService.findAll(search);
  }

  /**
   * Get active slides
   */
  @Get('active')
  @ApiOperation({ summary: 'Get active slides' })
  @ApiResponse({
    status: 200,
    description: 'List of active slides',
  })
  @ApiQuery({ name: 'search', required: false })
  findActive(@Query('search') search?: string) {
    return this.slideService.findActive(search);
  }

  /**
   * Get publicly available active slides
   */
  @Get('public/active')
  @ApiOperation({ summary: 'Get public active slides' })
  @ApiResponse({
    status: 200,
    description: 'List of public active slides',
  })
  findPublicActive() {
    return this.slideService.findPublicActive();
  }

  /**
   * Get slide by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get slide by ID' })
  @ApiResponse({
    status: 200,
    description: 'Slide details',
  })
  @ApiResponse({
    status: 404,
    description: 'Slide not found',
  })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id') id: string) {
    return this.slideService.findOne(id);
  }

  /**
   * Update slide without multimedia
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update slide' })
  @ApiResponse({
    status: 200,
    description: 'Slide updated successfully',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateSlideDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Audit(AuditAction.UPDATE, AuditEntityType.PROPERTY, 'Slide updated')
  update(@Param('id') id: string, @Body() updateSlideDto: UpdateSlideDto) {
    return this.slideService.update(id, updateSlideDto);
  }

  /**
   * Update slide with multimedia file
   */
  @Put(':id/with-multimedia')
  @ApiOperation({ summary: 'Update slide with optional multimedia file' })
  @ApiResponse({
    status: 200,
    description: 'Slide with optional multimedia updated successfully',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        duration: { type: 'number' },
        isActive: { type: 'boolean' },
        multimedia: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('multimedia', {
    fileFilter: (req, file, cb) => {
      // Aceptar archivos válidos o ningún archivo
      if (!file) {
        cb(null, true);
        return;
      }
      
      const isValidType = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');
      if (!isValidType) {
        cb(new BadRequestException('Solo se permiten imágenes y videos'), false);
        return;
      }
      
      cb(null, true);
    },
  }))
  @Audit(AuditAction.UPDATE, AuditEntityType.PROPERTY, 'Slide updated with optional multimedia')
  updateWithMultimedia(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() updateSlideDto: UpdateSlideWithMultimediaDto,
  ) {
    // Validar tamaño de archivo solo si se proporcionó
    if (file) {
      this.validateFileSize(file);
    }

    // Asegurar que los tipos sean correctos desde FormData
    const processedDto = {
      ...updateSlideDto,
      duration: typeof updateSlideDto.duration === 'string' 
        ? parseInt(updateSlideDto.duration, 10) 
        : updateSlideDto.duration,
      isActive: updateSlideDto.isActive !== undefined 
        ? String(updateSlideDto.isActive) === 'true' 
        : undefined,
    };
    
    return this.slideService.updateWithMultimedia(id, processedDto, file);
  }

  /**
   * Toggle slide active/inactive status
   */
  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Toggle slide active status' })
  @ApiResponse({
    status: 200,
    description: 'Slide status toggled',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Audit(AuditAction.UPDATE, AuditEntityType.PROPERTY, 'Slide status toggled')
  toggleStatus(@Param('id') id: string) {
    return this.slideService.toggleStatus(id);
  }

  /**
   * Reorder slides
   */
  @Post('reorder')
  @ApiOperation({ summary: 'Reorder slides' })
  @ApiResponse({
    status: 200,
    description: 'Slides reordered successfully',
  })
  @ApiBody({
    schema: {
      example: { slideIds: ['id1', 'id2', 'id3'] },
    },
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Audit(AuditAction.UPDATE, AuditEntityType.PROPERTY, 'Slides reordered')
  reorder(@Body('slideIds') slideIds: string[]) {
    return this.slideService.reorder(slideIds);
  }

  /**
   * Delete slide
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete slide' })
  @ApiResponse({
    status: 200,
    description: 'Slide deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Slide not found',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Audit(AuditAction.DELETE, AuditEntityType.PROPERTY, 'Slide deleted')
  remove(@Param('id') id: string) {
    return this.slideService.remove(id);
  }
}