import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { AboutUs } from '../../entities/about-us.entity';
import { CreateAboutUsDto, UpdateAboutUsDto } from './dto/about-us.dto';
import { MultimediaService } from '../multimedia/services/multimedia.service';
import { StaticFilesService } from '../multimedia/services/static-files.service';

@Injectable()
export class AboutUsService {
  constructor(
    @InjectRepository(AboutUs)
    private readonly aboutUsRepository: Repository<AboutUs>,
    private readonly multimediaService: MultimediaService,
    private readonly staticFilesService: StaticFilesService,
  ) {}

  async create(createAboutUsDto: CreateAboutUsDto): Promise<AboutUs> {
    const aboutUs = this.aboutUsRepository.create(createAboutUsDto);
    return await this.aboutUsRepository.save(aboutUs);
  }

  async findAll(): Promise<AboutUs[]> {
    return await this.aboutUsRepository.find({
      where: { deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(): Promise<AboutUs> {
    let aboutUs = await this.aboutUsRepository.findOne({
      where: { deletedAt: IsNull() },
    });

    if (!aboutUs) {
      // Crear registro inicial vacío si no existe
      aboutUs = this.aboutUsRepository.create({
        bio: '',
        mision: '',
        vision: '',
      } as Partial<AboutUs>);
      await this.aboutUsRepository.save(aboutUs);
    }

    return aboutUs;
  }

  async update(updateAboutUsDto: UpdateAboutUsDto, file?: Express.Multer.File): Promise<AboutUs> {
    const aboutUs = await this.findOne();

    // Handle multimedia upload
    if (file) {
      // uploadFileToPath ya devuelve la URL correcta (R2 o local según configuración)
      updateAboutUsDto.multimediaUrl = await this.multimediaService.uploadFileToPath(file, 'web/aboutUs');
    }

    Object.assign(aboutUs, updateAboutUsDto);
    return await this.aboutUsRepository.save(aboutUs);
  }

  async softDelete(): Promise<void> {
    const aboutUs = await this.findOne();
    await this.aboutUsRepository.softDelete(aboutUs.id);
  }

  async findLatest(): Promise<AboutUs | null> {
    return await this.aboutUsRepository.findOne({
      where: { deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }
}
