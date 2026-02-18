import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Testimonial } from '../../entities/testimonial.entity';
import {
  CreateTestimonialDto,
  UpdateTestimonialDto,
} from './dto/testimonial.dto';
import { MultimediaService as UploadMultimediaService } from '../multimedia/services/multimedia.service';
import {
  MultimediaType,
  Multimedia,
  MultimediaFormat,
} from '../../entities/multimedia.entity';
import type { Express } from 'express';

@Injectable()
export class TestimonialsService {
  // Listar testimonios públicos (activos y no eliminados)
  async listPublic(): Promise<Testimonial[]> {
    return await this.testimonialRepository.find({
      where: { isActive: true, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }
  constructor(
    @InjectRepository(Testimonial)
    private readonly testimonialRepository: Repository<Testimonial>,
    private readonly uploadMultimediaService: UploadMultimediaService,
  ) {}

  async create(
    createTestimonialDto: CreateTestimonialDto,
    file?: Express.Multer.File,
  ): Promise<Testimonial> {
    let imageUrl: string | undefined;

    if (file) {
      // Store the image via MultimediaService so STORAGE_PROVIDER (local or R2) is respected
      try {
        const multimedia = await this.uploadMultimediaService.uploadFile(file, { type: MultimediaType.TESTIMONIAL_IMG }, undefined);
        imageUrl = multimedia.url;
      } catch (err) {
        // If multimedia upload fails, surface the error so caller can handle it
        console.warn('[TestimonialsService] multimedia upload failed, aborting:', err);
        throw err;
      }
    }

    // Forzar isActive a booleano si viene en el DTO
    const createData = { ...createTestimonialDto };
    if ('isActive' in createData) {
      createData.isActive = !!createData.isActive;
    }
    const testimonial = this.testimonialRepository.create({
      ...createData,
      imageUrl,
      isActive: createData.isActive ?? true,
    });
    return await this.testimonialRepository.save(testimonial);
  }

  async findAll(): Promise<Testimonial[]> {
    return await this.testimonialRepository.find({
      where: { deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Testimonial> {
    const testimonial = await this.testimonialRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!testimonial) {
      throw new NotFoundException('Testimonio no encontrado.');
    }

    return testimonial;
  }

  async update(
    id: string,
    updateTestimonialDto: UpdateTestimonialDto,
    image?: Express.Multer.File,
  ): Promise<Testimonial> {
    const testimonial = await this.findOne(id);
    
    let imageUrl: string | undefined;
    if (image) {
      // Store the image via MultimediaService (supports R2/local)
      try {
        const multimedia = await this.uploadMultimediaService.uploadFile(image, { type: MultimediaType.TESTIMONIAL_IMG }, undefined);
        imageUrl = multimedia.url;
      } catch (err) {
        console.warn('[TestimonialsService] multimedia upload failed during update:', err);
        throw err;
      }
    }

    // Forzar isActive a booleano si viene en el DTO
    const updateData = { ...updateTestimonialDto };
    if ('isActive' in updateData) {
      updateData.isActive = !!updateData.isActive;
    }
    Object.assign(testimonial, {
      ...updateData,
      ...(imageUrl && { imageUrl }),
    });
    return await this.testimonialRepository.save(testimonial);
  }

  async softDelete(id: string): Promise<void> {
    const testimonial = await this.findOne(id);
    await this.testimonialRepository.softDelete(id);
  }
}
