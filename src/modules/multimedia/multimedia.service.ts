import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Multimedia } from '../../entities/multimedia.entity';
import { CreateMultimediaDto, UpdateMultimediaDto } from './dto/multimedia.dto';
import { MultimediaUploadMetadata } from './interfaces/multimedia.interface';
import { MultimediaType, MultimediaFormat } from '../../entities/multimedia.entity';
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';
import { StaticFilesService } from './services/static-files.service';

@Injectable()
export class MultimediaService {
  constructor(
    @InjectRepository(Multimedia)
    private readonly multimediaRepository: Repository<Multimedia>,
    private readonly staticFilesService: StaticFilesService,
  ) {}

  async create(createMultimediaDto: CreateMultimediaDto): Promise<Multimedia> {
    const multimedia = this.multimediaRepository.create(createMultimediaDto);
    return await this.multimediaRepository.save(multimedia);
  }

  async findAll(): Promise<Multimedia[]> {
    return await this.multimediaRepository.find({
      where: { deletedAt: IsNull() },
    });
  }

  async findOne(id: string): Promise<Multimedia> {
    const multimedia = await this.multimediaRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!multimedia) {
      throw new NotFoundException('Archivo multimedia no encontrado');
    }

    return multimedia;
  }

  async update(
    id: string,
    updateMultimediaDto: UpdateMultimediaDto,
  ): Promise<Multimedia> {
    const multimedia = await this.findOne(id);

    Object.assign(multimedia, updateMultimediaDto);
    return await this.multimediaRepository.save(multimedia);
  }

  async softDelete(id: string): Promise<void> {
    const multimedia = await this.findOne(id);
    await this.multimediaRepository.softDelete(id);
  }

  async hardDelete(id: string): Promise<void> {
    const multimedia = await this.findOne(id);

    // Eliminar archivo físico si existe
    try {
      const filePath = path.join(process.cwd(), 'uploads', multimedia.url.replace('/uploads/', ''));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      // Log error but don't fail the operation
      console.warn(`Could not delete physical file for multimedia ${id}:`, error);
    }

    // Eliminar registro de la base de datos
    await this.multimediaRepository.remove(multimedia);
  }

  async getUrl(id: string): Promise<string> {
    const multimedia = await this.findOne(id);
    return multimedia.url;
  }

  async setSeoTitle(id: string, seoTitle: string): Promise<Multimedia> {
    const multimedia = await this.findOne(id);
    multimedia.seoTitle = seoTitle;
    return await this.multimediaRepository.save(multimedia);
  }

  async uploadFile(
    file: Express.Multer.File,
    metadata: MultimediaUploadMetadata,
    userId: string
  ): Promise<Multimedia> {
    // Determinar el tipo y formato basado en el mimetype
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    const isDocument =
      file.mimetype.startsWith('application/') ||
      file.mimetype.startsWith('text/') ||
      file.mimetype.includes('pdf');

    let type: MultimediaType;
    let format: MultimediaFormat;

    if (isImage) {
      type = MultimediaType.PROPERTY_IMG;
      format = MultimediaFormat.IMG;
    } else if (isVideo) {
      type = MultimediaType.PROPERTY_VIDEO;
      format = MultimediaFormat.VIDEO;
    } else if (isDocument) {
      type = MultimediaType.DOCUMENT;
      format = MultimediaFormat.DOCUMENT;
    } else {
      throw new Error(`Unsupported file type: ${file.mimetype}`);
    }

    // Generar nombre único para el archivo
    const fileExtension = path.extname(file.originalname);
    const uniqueId = randomBytes(16).toString('hex');
    const uniqueFilename = `${uniqueId}${fileExtension}`;

    // Determinar la ruta relativa basada en el tipo
    let relativePath: string;
    switch (type) {
      case MultimediaType.PROPERTY_IMG:
        relativePath = `PROPERTY_IMG/${uniqueFilename}`;
        break;
      case MultimediaType.PROPERTY_VIDEO:
        relativePath = `PROPERTY_VIDEO/${uniqueFilename}`;
        break;
      case MultimediaType.DOCUMENT:
        relativePath = `docs/${uniqueFilename}`;
        break;
      default:
        relativePath = `temp/${uniqueFilename}`;
    }

    // Guardar el archivo usando StaticFilesService
    await this.staticFilesService.saveFile(file.buffer, relativePath);

    // Crear la entidad Multimedia con URL absoluta
    const multimedia = new Multimedia();
    multimedia.filename = uniqueFilename;
    multimedia.url = this.staticFilesService.getPublicUrl(relativePath);
    multimedia.type = type;
    multimedia.format = format;
    multimedia.fileSize = file.size;
    multimedia.seoTitle = metadata.seoTitle || file.originalname;
    multimedia.description = metadata.description;
    multimedia.userId = userId;

    // Guardar en la base de datos
    return await this.multimediaRepository.save(multimedia);
  }

  // TODO: Implement linkToEntity and unlinkFromEntity methods
  // These would require additional entity relationships
}
