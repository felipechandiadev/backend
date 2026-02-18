import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentType } from '../../../entities/document-type.entity';
import { Multimedia, MultimediaType } from '../../../entities/multimedia.entity';
import { MultimediaService as UploadMultimediaService } from '../../multimedia/services/multimedia.service';
import { DocumentUploadDto, DocumentResponse } from '../interfaces/document.interface';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(DocumentType)
    private readonly documentTypeRepository: Repository<DocumentType>,
    @InjectRepository(Multimedia)
    private readonly multimediaRepository: Repository<Multimedia>,
    private readonly uploadMultimediaService: UploadMultimediaService,
  ) {}

  async uploadDocument(data: DocumentUploadDto): Promise<DocumentResponse> {
    // Verificar que existe el tipo de documento
    const documentType = await this.documentTypeRepository.findOne({
      where: { id: data.documentTypeId },
    });

    if (!documentType) {
      throw new HttpException('Document type not found', HttpStatus.NOT_FOUND);
    }

    // Delegar la subida al servicio provider-aware (soporta local / R2 / S3)
    const multimedia = await this.uploadMultimediaService.uploadFile(
      data.file,
      { type: MultimediaType.DOCUMENT, seoTitle: data.metadata?.seoTitle, description: data.description },
    );

    return {
      id: multimedia.id,
      documentTypeId: documentType.id,
      documentType: documentType.name,
      url: multimedia.url,
      filename: multimedia.filename,
      fileSize: multimedia.fileSize,
      description: data.description,
      metadata: data.metadata,
      createdAt: multimedia.createdAt,
      updatedAt: multimedia.updatedAt,
    };
  }

  async getDocumentsByType(
    documentTypeId: string,
  ): Promise<DocumentResponse[]> {
    const documentType = await this.documentTypeRepository.findOne({
      where: { id: documentTypeId },
    });

    if (!documentType) {
      throw new HttpException('Document type not found', HttpStatus.NOT_FOUND);
    }

    const documents = await this.multimediaRepository.find({
      where: { type: MultimediaType.DOCUMENT },
    });

    return documents.map((doc) => ({
      id: doc.id,
      documentTypeId: documentType.id,
      documentType: documentType.name,
      url: doc.url,
      filename: doc.filename,
      fileSize: doc.fileSize,
      metadata: {
        seoTitle: doc.seoTitle,
      },
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));
  }

  async deleteDocument(id: string): Promise<void> {
    const document = await this.multimediaRepository.findOne({
      where: { id, type: MultimediaType.DOCUMENT },
    });

    if (!document) {
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    }

    try {
      // Usar el servicio provider-aware para eliminar (soporta S3/R2/local)
      await this.uploadMultimediaService.deleteFile(document.id);
    } catch (error) {
      throw new HttpException('Error deleting document', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
