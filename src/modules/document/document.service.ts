import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Document } from '../../entities/document.entity';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  UploadDocumentDto,
  UploadDNIDto,
} from './dto/document.dto';
import { MultimediaService } from '../multimedia/services/multimedia.service';
import { MultimediaType, Multimedia } from '../../entities/multimedia.entity';
import { DocumentType } from '../../entities/document-type.entity';
import { User } from '../../entities/user.entity';
import { Person } from '../../entities/person.entity';
import { DocumentStatus } from '../../entities/document.entity';
import { Payment } from '../../entities/payment.entity';
import { Contract, ContractStatus } from '../../entities/contract.entity';
import type { Express } from 'express';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(DocumentType)
    private readonly documentTypeRepository: Repository<DocumentType>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(Multimedia)
    private readonly multimediaRepository: Repository<Multimedia>,
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly multimediaService: MultimediaService,
  ) {}

  private readonly finalStatuses = new Set<ContractStatus>([
    ContractStatus.CLOSED,
    ContractStatus.FAILED,
  ]);

  private isFinalStatus(status?: ContractStatus | string | null): boolean {
    if (!status) {
      return false;
    }

    const normalized = typeof status === 'string' ? status.toUpperCase() : status;
    return this.finalStatuses.has(normalized as ContractStatus);
  }

  async create(createDocumentDto: CreateDocumentDto): Promise<Document> {
    const {
      documentTypeId,
      multimediaId,
      uploadedById,
      personId,
      paymentId,
      contractId,
      required,
      ...directFields
    } = createDocumentDto;

    const documentType = await this.documentTypeRepository.findOne({
      where: { id: documentTypeId },
    });
    if (!documentType) {
      throw new NotFoundException('Tipo de documento no encontrado');
    }

    const uploadedBy = await this.userRepository.findOne({
      where: { id: uploadedById },
    });
    if (!uploadedBy) {
      throw new NotFoundException('Usuario no encontrado');
    }

    let person: Person | undefined;
    if (personId) {
      console.log('🔍 Buscando persona con ID:', personId);
      console.log('🔍 Tipo de dato:', typeof personId);

      const foundPerson = await this.personRepository.findOne({
        where: { id: personId },
        withDeleted: false,
      });

      console.log('🔍 Persona encontrada:', foundPerson ? `✅ ${foundPerson.name}` : '❌ No encontrada');

      if (!foundPerson) {
        throw new NotFoundException('Persona no encontrada');
      }
      person = foundPerson;
    }

    let multimedia: Multimedia | undefined;
    if (multimediaId) {
      const foundMultimedia = await this.multimediaRepository.findOne({
        where: { id: multimediaId },
      });
      if (!foundMultimedia) {
        throw new NotFoundException('Multimedia no encontrado');
      }
      multimedia = foundMultimedia;
    }

    let resolvedContractId = contractId;
    if (paymentId) {
      const payment = await this.paymentRepository.findOne({
        where: { id: paymentId, deletedAt: IsNull() },
      });

      if (!payment) {
        throw new NotFoundException('Pago no encontrado');
      }

      resolvedContractId ??= payment.contractId;
    }

    if (resolvedContractId) {
      const contract = await this.contractRepository.findOne({
        where: { id: resolvedContractId, deletedAt: IsNull() },
      });

      if (!contract) {
        throw new NotFoundException('Contrato no encontrado');
      }

      const isPlaceholderContractDocument = !paymentId && !multimediaId;

      if (isPlaceholderContractDocument && this.isFinalStatus(contract.status)) {
        throw new BadRequestException('No se pueden registrar nuevos documentos en contratos cerrados o fallidos');
      }
    }

    const document = this.documentRepository.create({
      ...directFields,
      documentType,
      documentTypeId,
      multimedia,
      multimediaId: multimedia?.id ?? multimediaId,
      uploadedBy,
      uploadedById,
      person,
      personId: person?.id ?? personId,
      paymentId,
      contractId: resolvedContractId,
      required: required === true,
    });

    return await this.documentRepository.save(document);
  }

  async findAll(): Promise<Document[]> {
    return await this.documentRepository.find({
      where: { deletedAt: IsNull() },
      relations: ['documentType', 'multimedia', 'uploadedBy', 'person', 'contract'],
    });
  }

  async findByPersonId(personId: string): Promise<Document[]> {
    return await this.documentRepository.find({
      where: { personId, deletedAt: IsNull() },
      relations: ['documentType', 'multimedia', 'uploadedBy', 'person', 'contract'],
    });
  }

  async findByContractId(contractId: string): Promise<Document[]> {
    return await this.documentRepository.find({
      where: { contractId, deletedAt: IsNull() },
      relations: ['documentType', 'multimedia', 'uploadedBy', 'person', 'contract'],
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['documentType', 'multimedia', 'uploadedBy', 'person', 'contract'],
    });

    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    return document;
  }

  async update(
    id: string,
    updateDocumentDto: UpdateDocumentDto,
  ): Promise<Document> {
    const document = await this.findOne(id);

    // Actualizar campos directos
    const {
      documentTypeId,
      multimediaId,
      uploadedById,
      personId,
      required,
      ...directFields
    } = updateDocumentDto;
    Object.assign(document, directFields);

    if (typeof required === 'boolean') {
      document.required = required;
    }

    // Actualizar relaciones si se proporcionan
    if (documentTypeId) {
      const documentType = await this.documentTypeRepository.findOne({
        where: { id: documentTypeId },
      });
      if (!documentType) {
        throw new NotFoundException('Tipo de documento no encontrado');
      }
      document.documentType = documentType;
    }

    if (uploadedById) {
      const uploadedBy = await this.userRepository.findOne({
        where: { id: uploadedById },
      });
      if (!uploadedBy) {
        throw new NotFoundException('Usuario no encontrado');
      }
      document.uploadedBy = uploadedBy;
    }

    if (personId !== undefined) {
      if (personId) {
        const person = await this.personRepository.findOne({
          where: { id: personId },
        });
        if (!person) {
          throw new NotFoundException('Persona no encontrada');
        }
        document.person = person;
      } else {
        document.person = undefined;
      }
    }

    if (multimediaId !== undefined) {
      if (multimediaId) {
        const multimedia = await this.multimediaRepository.findOne({
          where: { id: multimediaId },
        });
        if (!multimedia) {
          throw new NotFoundException('Multimedia no encontrado');
        }
        document.multimedia = multimedia;
      } else {
        document.multimedia = undefined;
      }
    }

    return await this.documentRepository.save(document);
  }

  async softDelete(id: string): Promise<void> {
    const document = await this.findOne(id);

    const contractStatus = document.contract?.status;
    if (document.contractId && this.isFinalStatus(contractStatus)) {
      throw new BadRequestException('No se pueden eliminar documentos asociados a contratos cerrados o fallidos');
    }

    await this.documentRepository.softDelete(id);
  }

  async uploadDocument(
    file: Express.Multer.File,
    uploadDocumentDto: UploadDocumentDto & { uploadedById: string },
  ): Promise<Document> {
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

    // Crear el documento con la referencia al multimedia
    const createDocumentDto: CreateDocumentDto = {
      title: uploadDocumentDto.title,
      documentTypeId: uploadDocumentDto.documentTypeId,
      multimediaId: multimedia.id,
      uploadedById: uploadDocumentDto.uploadedById,
      personId: uploadDocumentDto.personId,
      contractId: uploadDocumentDto.contractId,
      paymentId: uploadDocumentDto.paymentId,
      status: uploadDocumentDto.status,
      notes: uploadDocumentDto.notes,
      required: uploadDocumentDto.required,
    };

    return await this.create(createDocumentDto);
  }

  async uploadDNI(
    file: Express.Multer.File,
    uploadDNIDto: UploadDNIDto & { uploadedById: string },
  ): Promise<Document> {
    // Validar que el archivo sea una imagen
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Solo se permiten archivos de imagen para DNI');
    }

    // Validar que la persona exista antes de continuar
    const person = await this.personRepository.findOne({
      where: { id: uploadDNIDto.personId, deletedAt: IsNull() },
      relations: ['dniCardFront', 'dniCardRear'],
    });

    if (!person) {
      throw new NotFoundException('Persona no encontrada');
    }

    // Determinar el tipo multimedia basado en el lado del DNI
    const multimediaType = uploadDNIDto.dniSide === 'FRONT' ? MultimediaType.DNI_FRONT : MultimediaType.DNI_REAR;
    
    // Determinar el título y el DocumentType basado en el lado
    let sideLabel: string;
    let documentTypeQuery: string;

    if (uploadDNIDto.dniSide === 'FRONT') {
      sideLabel = 'Frontal';
      documentTypeQuery = 'DNI Frontal';
    } else {
      sideLabel = 'Trasero';
      documentTypeQuery = 'DNI Trasero';
    }

    const title = `DNI ${sideLabel}`;

    // Subir el archivo usando el servicio de multimedia
    const multimediaMetadata = {
      type: multimediaType,
      seoTitle: title,
    };

    const multimedia = await this.multimediaService.uploadFile(
      file,
      multimediaMetadata,
      uploadDNIDto.uploadedById,
    );

    // Buscar el DocumentType específico para el lado del DNI
    const dniDocumentType = await this.documentTypeRepository.findOne({
      where: { name: documentTypeQuery },
    });

    if (!dniDocumentType) {
      throw new NotFoundException(`Tipo de documento "${documentTypeQuery}" no encontrado en el sistema. Por favor, ejecute los seeders.`);
    }

    // Crear el documento con la referencia al multimedia
    const createDocumentDto: CreateDocumentDto = {
      title,
      documentTypeId: dniDocumentType.id,
      multimediaId: multimedia.id,
      uploadedById: uploadDNIDto.uploadedById,
      personId: uploadDNIDto.personId,
      status: uploadDNIDto.status || DocumentStatus.UPLOADED,
    };

    const document = await this.create(createDocumentDto);

    // Asociar el multimedia a la persona para reflejarlo en su ficha
    if (uploadDNIDto.dniSide === 'FRONT') {
      person.dniCardFront = multimedia;
    } else {
      person.dniCardRear = multimedia;
    }

    await this.personRepository.save(person);

    return document;
  }
}
