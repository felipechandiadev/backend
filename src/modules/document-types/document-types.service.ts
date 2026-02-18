import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { DocumentType } from '../../entities/document-type.entity';
import {
  CreateDocumentTypeDto,
  UpdateDocumentTypeDto,
  UploadFileDto,
  UploadDocumentDto,
} from './dto/document-type.dto';
import { MultimediaService } from '../multimedia/services/multimedia.service';
import { DocumentService } from '../document/document.service';
import { MultimediaType } from '../../entities/multimedia.entity';
import { DocumentStatus } from '../../entities/document.entity';
import type { Express } from 'express';

@Injectable()
export class DocumentTypesService {
  constructor(
    @InjectRepository(DocumentType)
    private readonly documentTypeRepository: Repository<DocumentType>,
    private readonly multimediaService: MultimediaService,
    private readonly documentService: DocumentService,
  ) {}

  async create(
    createDocumentTypeDto: CreateDocumentTypeDto,
  ): Promise<DocumentType> {
    // Check if name already exists
    const existingDocumentType = await this.documentTypeRepository.findOne({
      where: { name: createDocumentTypeDto.name, deletedAt: IsNull() },
    });
    if (existingDocumentType) {
      throw new ConflictException(
        'El nombre del tipo de documento ya está registrado',
      );
    }

    const documentType = this.documentTypeRepository.create({
      ...createDocumentTypeDto,
      available: createDocumentTypeDto.available ?? true,
    });
    return await this.documentTypeRepository.save(documentType);
  }

  async findAll(): Promise<DocumentType[]> {
    return await this.documentTypeRepository.find({
      where: { deletedAt: IsNull() },
    });
  }

  async findOne(id: string): Promise<DocumentType> {
    const documentType = await this.documentTypeRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!documentType) {
      throw new NotFoundException('Tipo de documento no encontrado');
    }

    return documentType;
  }

  async update(
    id: string,
    updateDocumentTypeDto: UpdateDocumentTypeDto,
  ): Promise<DocumentType> {
    const documentType = await this.findOne(id);

    // Check if name already exists (if being updated)
    if (
      updateDocumentTypeDto.name &&
      updateDocumentTypeDto.name !== documentType.name
    ) {
      const existingDocumentType = await this.documentTypeRepository.findOne({
        where: { name: updateDocumentTypeDto.name, deletedAt: IsNull() },
      });
      if (existingDocumentType) {
        throw new ConflictException(
          'El nombre del tipo de documento ya está registrado',
        );
      }
    }

    Object.assign(documentType, updateDocumentTypeDto);
    return await this.documentTypeRepository.save(documentType);
  }

  async softDelete(id: string): Promise<void> {
    const documentType = await this.findOne(id);
    await this.documentTypeRepository.softDelete(id);
  }

  async setAvailable(id: string, available: boolean): Promise<DocumentType> {
    const documentType = await this.findOne(id);
    documentType.available = available;
    return await this.documentTypeRepository.save(documentType);
  }

  async uploadFile(
    file: Express.Multer.File,
    uploadFileDto: UploadFileDto,
  ): Promise<any> {
    // Subir el archivo usando el servicio de multimedia
    const multimediaMetadata = {
      type: MultimediaType.DOCUMENT,
      seoTitle: uploadFileDto.seoTitle || uploadFileDto.title,
      description: uploadFileDto.description,
    };

    const multimedia = await this.multimediaService.uploadFile(
      file,
      multimediaMetadata,
      uploadFileDto.uploadedById,
    );

    return multimedia;
  }

  async uploadDocument(
    file: Express.Multer.File,
    uploadDocumentDto: UploadDocumentDto,
  ): Promise<any> {
    // Subir el archivo usando el servicio de multimedia
    const multimediaMetadata = {
      type: MultimediaType.DOCUMENT,
      seoTitle: uploadDocumentDto.seoTitle || uploadDocumentDto.title,
    };

    const multimedia = await this.multimediaService.uploadFile(
      file,
      multimediaMetadata,
      uploadDocumentDto.uploadedById,
    );

    // Crear el documento con la referencia al multimedia y estado UPLOADED
    const createDocumentDto: any = {
      title: uploadDocumentDto.title,
      documentTypeId: uploadDocumentDto.documentTypeId,
      multimediaId: multimedia.id,
      uploadedById: uploadDocumentDto.uploadedById,
      status: DocumentStatus.UPLOADED,
      notes: uploadDocumentDto.notes,
      required: uploadDocumentDto.required,
    };

    // Agregar paymentId si está presente
    if (uploadDocumentDto.paymentId) {
      createDocumentDto.paymentId = uploadDocumentDto.paymentId;
    }

    if (uploadDocumentDto.contractId) {
      createDocumentDto.contractId = uploadDocumentDto.contractId;
    }

    if (uploadDocumentDto.personId) {
      createDocumentDto.personId = uploadDocumentDto.personId;
    }

    const document = await this.documentService.create(createDocumentDto);

    return {
      document,
      multimedia,
    };
  }
}
