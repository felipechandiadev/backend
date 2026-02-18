import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentType } from '../../../entities/document-type.entity';
import {
  Multimedia,
  MultimediaType,
} from '../../../entities/multimedia.entity';
import { StaticFilesService } from '../../multimedia/services/static-files.service';
import {
  DocumentUploadDto,
  DocumentResponse,
} from '../interfaces/document.interface';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(DocumentType)
    private readonly documentTypeRepository: Repository<DocumentType>,
    @InjectRepository(Multimedia)
    private readonly multimediaRepository: Repository<Multimedia>,
    private readonly staticFilesService: StaticFilesService,
  ) {}

  async uploadDocument(data: DocumentUploadDto): Promise<DocumentResponse> {
    // Verificar que existe el tipo de documento
    const documentType = await this.documentTypeRepository.findOne({
      where: { id: data.documentTypeId },
    });

    if (!documentType) {
      throw new HttpException('Document type not found', HttpStatus.NOT_FOUND);
    }

    const filename = `${Date.now()}-${data.file.originalname}`;
    const uploadPath = 'docs';
    const fullPath = this.staticFilesService.getFullPath(
      `${uploadPath}/${filename}`,
    );

    try {
      // Guardar el archivo
      await this.staticFilesService.saveFile(
        data.file.buffer,
        `${uploadPath}/${filename}`,
      );

      // Crear el registro multimedia
      const multimedia = new Multimedia();
      multimedia.type = MultimediaType.DOCUMENT;
      multimedia.format = this.staticFilesService.getFormatFromMimeType(
        data.file.mimetype,
      );
      multimedia.filename = filename;
      multimedia.fileSize = data.file.size;
      multimedia.url = this.staticFilesService.getPublicUrl(
        `${uploadPath}/${filename}`,
      );

      // Asignar seoTitle solo si está presente
      if (data.metadata?.seoTitle) {
        multimedia.seoTitle = data.metadata.seoTitle;
      }

      const savedMultimedia = await this.multimediaRepository.save(multimedia);

      return {
        id: savedMultimedia.id,
        documentTypeId: documentType.id,
        documentType: documentType.name,
        url: savedMultimedia.url,
        filename: savedMultimedia.filename,
        fileSize: savedMultimedia.fileSize,
        description: data.description,
        metadata: data.metadata,
        createdAt: savedMultimedia.createdAt,
        updatedAt: savedMultimedia.updatedAt,
      };
    } catch (error) {
      // Limpiar archivo si ocurre un error
      await this.staticFilesService.deleteFile(`${uploadPath}/${filename}`);
      throw new HttpException(
        'Error uploading document',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
      // Eliminar archivo físico
      await this.staticFilesService.deleteFile(document.url);

      // Eliminar registro de base de datos
      await this.multimediaRepository.remove(document);
    } catch (error) {
      throw new HttpException(
        'Error deleting document',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
