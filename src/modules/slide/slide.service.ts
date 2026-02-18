import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Slide } from '../../entities/slide.entity';
import { Multimedia } from '../../entities/multimedia.entity';
import { CreateSlideDto } from './dto/create-slide.dto';
import { UpdateSlideDto } from './dto/update-slide.dto';
import { CreateSlideWithMultimediaDto } from './dto/create-slide-with-multimedia.dto';
import { UpdateSlideWithMultimediaDto } from './dto/update-slide-with-multimedia.dto';
import { MultimediaService } from '../multimedia/services/multimedia.service';
import { StaticFilesService } from '../multimedia/services/static-files.service';
import { MultimediaType, MultimediaFormat } from '../../entities/multimedia.entity';
import { MultimediaUploadMetadata } from '../multimedia/interfaces/multimedia.interface';

@Injectable()
export class SlideService {
  constructor(
    @InjectRepository(Slide)
    private slideRepository: Repository<Slide>,
    private multimediaService: MultimediaService,
    private staticFilesService: StaticFilesService,
    private dataSource: DataSource,
  ) {}

  async create(createSlideDto: CreateSlideDto): Promise<Slide> {
    const slide = this.slideRepository.create(createSlideDto);
    return await this.slideRepository.save(slide);
  }

  async createWithMultimedia(
    createSlideDto: CreateSlideWithMultimediaDto,
    file?: Express.Multer.File,
  ): Promise<Slide> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Obtener siguiente orden
      const maxOrder = await this.getMaxOrder();
      const nextOrder = maxOrder + 1;

      let multimediaUrl: string | undefined;

      // Solo procesar multimedia si se proporcionó archivo
      if (file) {
        // Determinar tipo de multimedia
        const isImage = file.mimetype.startsWith('image/');
        const multimediaType = MultimediaType.SLIDE;
        const multimediaFormat = isImage ? MultimediaFormat.IMG : MultimediaFormat.VIDEO;

        // Subir multimedia siguiendo patrón de Identity
        // uploadFileToPath ya devuelve la URL correcta (R2 o local según configuración)
        multimediaUrl = await this.multimediaService.uploadFileToPath(file, 'web/slides');
      }

      // Crear slide con multimedia URL opcional - asegurar tipos correctos
      const slideData: Partial<Slide> = {
        title: createSlideDto.title,
        description: createSlideDto.description || '',
        multimediaUrl: multimediaUrl || undefined,
        linkUrl: createSlideDto.linkUrl || undefined,
        duration: createSlideDto.duration || 3,
        startDate: createSlideDto.startDate ? new Date(createSlideDto.startDate) : undefined,
        endDate: createSlideDto.endDate ? new Date(createSlideDto.endDate) : undefined,
        order: nextOrder,
        isActive: createSlideDto.isActive !== false, // true por defecto, false solo si explícitamente es false
      };

      const slide = this.slideRepository.create(slideData);
      const savedSlide = await queryRunner.manager.save(slide);

      await queryRunner.commitTransaction();
      return savedSlide;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(search?: string): Promise<Slide[]> {
    const queryBuilder = this.slideRepository
      .createQueryBuilder('slide')
      .where('slide.deletedAt IS NULL');

    if (search) {
      queryBuilder.andWhere(
        '(slide.title LIKE :search OR slide.description LIKE :search)',
        { search: `%${search}%` }
      );
    }

    return await queryBuilder
      .orderBy('slide.order', 'ASC')
      .addOrderBy('slide.createdAt', 'DESC')
      .getMany();
  }

  async findActive(search?: string): Promise<Slide[]> {
    const queryBuilder = this.slideRepository
      .createQueryBuilder('slide')
      .where('slide.deletedAt IS NULL')
      .andWhere('slide.isActive = :isActive', { isActive: true });

    if (search) {
      queryBuilder.andWhere(
        '(slide.title LIKE :search OR slide.description LIKE :search)',
        { search: `%${search}%` }
      );
    }

    return await queryBuilder
      .orderBy('slide.order', 'ASC')
      .getMany();
  }

  async findPublicActive(): Promise<Slide[]> {
    const currentDate = new Date();
    
    return await this.slideRepository
      .createQueryBuilder('slide')
      .where('slide.deletedAt IS NULL')
      .andWhere('slide.isActive = :isActive', { isActive: true })
      .andWhere('(slide.startDate IS NULL OR slide.startDate <= :currentDate)', { currentDate })
      .andWhere('(slide.endDate IS NULL OR slide.endDate >= :currentDate)', { currentDate })
      .orderBy('slide.order', 'ASC')
      .getMany();
  }

  async findOne(id: string): Promise<Slide> {
    const slide = await this.slideRepository.findOne({ where: { id } });
    if (!slide) {
      throw new NotFoundException(`Slide with ID ${id} not found`);
    }
    return slide;
  }

  async update(id: string, updateSlideDto: UpdateSlideDto): Promise<Slide> {
    const slide = await this.findOne(id);
    
    // Si hay multimediaUrl y no es absoluta, convertirla a absoluta
    if (updateSlideDto.multimediaUrl && !updateSlideDto.multimediaUrl.startsWith('http')) {
      updateSlideDto.multimediaUrl = this.staticFilesService.getPublicUrl(
        updateSlideDto.multimediaUrl.replace(/^\/public\//, '')
      );
    }
    
    Object.assign(slide, updateSlideDto);
    return await this.slideRepository.save(slide);
  }

  async remove(id: string): Promise<void> {
    const slide = await this.findOne(id);
    await this.slideRepository.softDelete(id);
  }

  async toggleStatus(id: string): Promise<Slide> {
    const slide = await this.findOne(id);
    slide.isActive = !slide.isActive;
    return await this.slideRepository.save(slide);
  }

  async reorder(slideIds: string[]): Promise<void> {
    for (let i = 0; i < slideIds.length; i++) {
      await this.slideRepository.update(slideIds[i], { order: i + 1 });
    }
  }

  async getMaxOrder(): Promise<number> {
    const result = await this.slideRepository
      .createQueryBuilder('slide')
      .select('MAX(slide.order)', 'maxOrder')
      .getRawOne();
    
    return result?.maxOrder || 0;
  }

  async updateWithMultimedia(
    id: string,
    updateSlideDto: UpdateSlideWithMultimediaDto,
    file?: Express.Multer.File,
  ): Promise<Slide> {
    return await this.slideRepository.manager.transaction(async (manager) => {
      // 1. Verificar que el slide existe
      const existingSlide = await manager.findOne(Slide, { where: { id } });
      if (!existingSlide) {
        throw new NotFoundException('Slide no encontrado');
      }

      let newMultimediaUrl = existingSlide.multimediaUrl;

      // 2. Si hay nuevo archivo, procesar multimedia
      if (file) {
        // Eliminar archivo anterior si existe (soporta local y proveedores remotos)
        if (existingSlide.multimediaUrl) {
          try {
            await this.multimediaService.deleteFileByUrl(existingSlide.multimediaUrl);
          } catch (error) {
            // Log pero no fallar la actualización
            console.warn('Error eliminando archivo anterior:', error);
          }
        }

        // Subir nuevo archivo
        // uploadFileToPath ya devuelve la URL correcta (R2 o local según configuración)
        newMultimediaUrl = await this.multimediaService.uploadFileToPath(file, 'web/slides');
      }

      // 3. Preparar datos para actualización
      const slideData = {
        ...updateSlideDto,
        multimediaUrl: newMultimediaUrl,
      };

      // 4. Actualizar en base de datos
      await manager.update(Slide, id, slideData);

      // 5. Retornar slide actualizado
      const updatedSlide = await manager.findOne(Slide, { where: { id } });
      if (!updatedSlide) {
        throw new NotFoundException('Error actualizando slide');
      }
      return updatedSlide;
    });
  }
}