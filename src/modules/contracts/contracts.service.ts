import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In, DeepPartial } from 'typeorm';
import {
  Contract,
  ContractOperationType,
  ContractStatus,
  ContractRole,
  ContractCurrency,
  PaymentType,
  ContractHistoryEntry,
  ContractHistoryChange,
  ContractPaymentDocument,
  ContractDocument,
} from '../../entities/contract.entity';
import { Payment, PaymentStatus } from '../../entities/payment.entity';
import {
  CreateContractDto,
  UpdateContractDto,
  AddPaymentDto,
  AddPersonDto,
  CloseContractDto,
  UploadContractDocumentDto,
  UploadPaymentDocumentDto,
} from './dto/contract.dto';
import { DocumentTypesService } from '../document-types/document-types.service';
import { DocumentStatus } from '../../entities/document.entity';
import { Document as DocumentEntity } from '../../entities/document.entity';
import { DocumentType } from '../../entities/document-type.entity';
import { Person } from '../../entities/person.entity';
import { User, UserRole } from '../../entities/user.entity';
import { Property } from '../../entities/property.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, NotificationSenderType } from '../../entities/notification.entity';
import type { Express } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(DocumentEntity)
    private readonly documentRepository: Repository<DocumentEntity>,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    private readonly documentTypesService: DocumentTypesService,
    private readonly notificationsService: NotificationsService,
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

  private async normalizeContractStatus(contract: Contract): Promise<Contract> {
    const rawStatus = (contract.status as unknown as string) ?? ContractStatus.IN_PROCESS;

    if (rawStatus === 'ON_HOLD') {
      contract.status = ContractStatus.IN_PROCESS;
      await this.contractRepository.update(contract.id, { status: ContractStatus.IN_PROCESS });
    }

    return contract;
  }

  private appendHistoryEntry(
    contract: Contract,
    entry: {
      userId?: string | null;
      action: string;
      changes: ContractHistoryChange[];
      metadata?: Record<string, unknown>;
      timestamp?: string;
    },
  ): void {
    if (!entry.changes.length) {
      return;
    }

    const normalizedEntry: ContractHistoryEntry = {
      id: randomUUID(),
      timestamp: entry.timestamp ?? new Date().toISOString(),
      userId: entry.userId ?? null,
      action: entry.action,
      changes: entry.changes.map((change) => ({
        field: change.field,
        previousValue: this.serializeHistoryValue(change.previousValue),
        newValue: this.serializeHistoryValue(change.newValue),
      })),
    };

    if (entry.metadata) {
      normalizedEntry.metadata = this.serializeHistoryValue(entry.metadata) as Record<string, unknown>;
    }

    contract.changeHistory = [...(contract.changeHistory ?? []), normalizedEntry];
  }

  private serializeHistoryValue(value: unknown): unknown {
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.serializeHistoryValue(item));
    }

    if (value && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        if (key === 'contract') {
          continue;
        }
        result[key] = this.serializeHistoryValue(val);
      }
      return result;
    }

    return value;
  }

  private computeChangesFromPatch(
    previous: Contract,
    patch: Record<string, unknown>,
  ): ContractHistoryChange[] {
    const changes: ContractHistoryChange[] = [];

    for (const [field, newValue] of Object.entries(patch)) {
      const previousValue = this.getFieldValue(previous, field);

      if (this.areValuesEqual(previousValue, newValue)) {
        continue;
      }

      changes.push({ field, previousValue, newValue });
    }

    return changes;
  }

  private getFieldValue(contract: Contract, field: string): unknown {
    const record = contract as unknown as Record<string, unknown | undefined>;
    return record[field];
  }

  private areValuesEqual(previousValue: unknown, newValue: unknown): boolean {
    if (previousValue === newValue) {
      return true;
    }

    if (previousValue instanceof Date && newValue instanceof Date) {
      return previousValue.getTime() === newValue.getTime();
    }

    return (
      JSON.stringify(this.serializeHistoryValue(previousValue)) ===
      JSON.stringify(this.serializeHistoryValue(newValue))
    );
  }

  /**
   * Generate unique contract code based on operation type
   * Format: CV-YY-NNNNNNN (Contrato Venta) or CA-YY-NNNNNNN (Contrato Arriendo)
   */
  private async generateContractCode(operationType: ContractOperationType): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = operationType === ContractOperationType.COMPRAVENTA ? 'CV' : 'CA';

    // Get the last contract with this prefix and year
    const lastContract = await this.contractRepository
      .createQueryBuilder('contract')
      .where('contract.code LIKE :pattern', { pattern: `${prefix}-${year}-%` })
      .orderBy('contract.code', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastContract?.code) {
      const lastSequence = parseInt(lastContract.code.split('-')[2], 10);
      sequence = lastSequence + 1;
    }

    const sequenceStr = sequence.toString().padStart(7, '0');
    return `${prefix}-${year}-${sequenceStr}`;
  }

  async create(createContractDto: CreateContractDto, actorId?: string): Promise<Contract> {
    // Validate UF value if currency is UF
    if (createContractDto.currency === ContractCurrency.UF && !createContractDto.ufValue) {
      throw new BadRequestException('El valor de la UF es requerido cuando la moneda es UF');
    }

    // Generate unique contract code
    const code = await this.generateContractCode(createContractDto.operation);

    // Calculate commission amount in CLP
    let commissionAmount: number;
    if (createContractDto.currency === ContractCurrency.UF) {
      // Convert UF amount to CLP equivalent
      const clpEquivalent = createContractDto.amount * createContractDto.ufValue!;
      commissionAmount = clpEquivalent * (createContractDto.commissionPercent / 100);
    } else {
      // Currency is CLP
      commissionAmount = createContractDto.amount * (createContractDto.commissionPercent / 100);
    }

    const normalizedDocuments: ContractDocument[] | undefined = Array.isArray(createContractDto.documents)
      ? createContractDto.documents.map((doc) => {
          const docAny = doc as Record<string, any>;
          const rawTitle = typeof docAny.title === 'string' ? docAny.title.trim() : '';
          const resolvedTitle = rawTitle.length > 0
            ? rawTitle
            : typeof docAny.documentType?.name === 'string'
              ? docAny.documentType.name
              : '';

          const resolvedStatus: DocumentStatus = typeof docAny.status === 'string'
            ? docAny.status as DocumentStatus
            : doc.uploaded
              ? DocumentStatus.UPLOADED
              : DocumentStatus.PENDING;

          const resolvedDocumentId = (() => {
            if (typeof doc.documentId === 'string' && doc.documentId.trim().length > 0) {
              return doc.documentId.trim();
            }
            if (typeof docAny.documentId === 'string' && docAny.documentId.trim().length > 0) {
              return docAny.documentId.trim();
            }
            if (typeof docAny.id === 'string' && docAny.id.trim().length > 0) {
              return docAny.id.trim();
            }
            return undefined;
          })();

          return {
            documentTypeId: doc.documentTypeId,
            documentId: resolvedDocumentId,
            id: resolvedDocumentId,
            title: resolvedTitle,
            notes:
              typeof docAny.notes === 'string' && docAny.notes.trim().length > 0
                ? docAny.notes.trim()
                : undefined,
            personId:
              typeof docAny.personId === 'string' && docAny.personId.trim().length > 0
                ? docAny.personId.trim()
                : undefined,
            personName:
              typeof docAny.personName === 'string' && docAny.personName.trim().length > 0
                ? docAny.personName.trim()
                : undefined,
            personDni:
              typeof docAny.personDni === 'string' && docAny.personDni.trim().length > 0
                ? docAny.personDni.trim()
                : undefined,
            required: typeof doc.required === 'boolean' ? doc.required : false,
            uploaded: typeof doc.uploaded === 'boolean' ? doc.uploaded : false,
            status: resolvedStatus,
            uploadedById:
              typeof docAny.uploadedById === 'string' && docAny.uploadedById.trim().length > 0
                ? docAny.uploadedById.trim()
                : undefined,
            documentType:
              docAny.documentType && typeof docAny.documentType === 'object'
                ? docAny.documentType
                : undefined,
          } as ContractDocument;
        })
      : undefined;

    const contract = this.contractRepository.create({
      code,
      operation: createContractDto.operation,
      status: createContractDto.status || ContractStatus.IN_PROCESS,
      amount: createContractDto.amount,
      currency: createContractDto.currency || ContractCurrency.CLP,
      ufValue: createContractDto.ufValue,
      commissionPercent: createContractDto.commissionPercent,
      commissionAmount: Math.round(commissionAmount), // Round to nearest integer
      description: createContractDto.description,
      people: createContractDto.people as any[],
      payments: createContractDto.payments as any[],
      documents: normalizedDocuments,
      changeHistory: [],
      // set relations by id
      property: createContractDto.propertyId
        ? ({ id: createContractDto.propertyId } as any)
        : undefined,
      user: createContractDto.userId
        ? ({ id: createContractDto.userId } as any)
        : undefined,
    });

    this.appendHistoryEntry(contract, {
      userId: actorId ?? createContractDto.userId ?? null,
      action: 'CONTRACT_CREATED',
      changes: [
        {
          field: 'contract',
          previousValue: null,
          newValue: {
            code: contract.code,
            status: contract.status,
            amount: contract.amount,
            currency: contract.currency,
            operation: contract.operation,
          },
        },
      ],
      metadata: {
        propertyId: createContractDto.propertyId,
        userId: createContractDto.userId,
      },
    });

    let savedContract = await this.contractRepository.save(contract);

    if (createContractDto.payments && createContractDto.payments.length > 0) {
      const persistedPayments = [] as Array<{
        id: string;
        amount: number;
        date: string | Date;
        description?: string;
        type: PaymentType;
        status: PaymentStatus;
        paidAt: string | Date | null;
        isAgencyRevenue: boolean;
        documents: ContractPaymentDocument[];
      }>;

      for (const paymentDto of createContractDto.payments) {
        const resolvedPaidAt = paymentDto.status === PaymentStatus.PAID
          ? (paymentDto.paidAt ? new Date(paymentDto.paidAt) : new Date())
          : null;

        const paymentPayload: DeepPartial<Payment> = {
          amount: paymentDto.amount,
          date: new Date(paymentDto.date),
          description: paymentDto.description,
          type: paymentDto.type,
          status: paymentDto.status ?? PaymentStatus.PENDING,
          contractId: savedContract.id,
          paidAt: resolvedPaidAt,
          isAgencyRevenue: paymentDto.isAgencyRevenue ?? false,
        };

        const paymentEntity = this.paymentRepository.create(paymentPayload);

        const savedPayment = await this.paymentRepository.save(paymentEntity);

        persistedPayments.push({
          id: savedPayment.id,
          amount: Number(savedPayment.amount),
          date: savedPayment.date instanceof Date ? savedPayment.date.toISOString() : savedPayment.date,
          description: savedPayment.description ?? undefined,
          type: savedPayment.type,
          status: savedPayment.status,
          paidAt: savedPayment.paidAt instanceof Date ? savedPayment.paidAt.toISOString() : savedPayment.paidAt ?? null,
          isAgencyRevenue: savedPayment.isAgencyRevenue === true,
          documents: [],
        });
      }

      if (persistedPayments.length > 0) {
        savedContract.payments = [...persistedPayments] as any[];
        savedContract = await this.contractRepository.save(savedContract);
      }
    }

    if (normalizedDocuments?.length) {
      savedContract = await this.initializeContractDocuments(
        savedContract,
        normalizedDocuments,
        actorId,
        createContractDto.userId,
      );
    }

    return this.findOne(savedContract.id);
  }

  async findAll(query: any = {}): Promise<any> {
    const {
      operation,
      page = 1,
      limit = 25,
      sort,
      sortField,
      search,
      filters,
      pagination = true,
    } = query;

    const queryBuilder = this.contractRepository
      .createQueryBuilder('contract')
      .leftJoinAndSelect('contract.property', 'property')
      .leftJoinAndSelect('contract.user', 'user')
      .where('contract.deletedAt IS NULL');

    // Filter by user if provided
    if (query.userId) {
      // Intentar obtener el personId asociado al usuario
      // Primero buscamos en la tabla User para ver si tiene personId
      const userData = await this.userRepository.findOne({
        where: { id: query.userId },
        relations: ['person']
      });

      let personId = userData?.person?.id;

      // Si no lo encontramos en la relación, buscamos en la tabla Person filtrando por userId
      if (!personId) {
        const personData = await this.personRepository.findOne({
          where: { userId: query.userId }
        });
        personId = personData?.id;
      }

      if (personId) {
        // Buscar contratos donde sea el creador (agente) O donde sea un participante (persona asociada)
        queryBuilder.andWhere(
          '(contract.userId = :userId OR JSON_CONTAINS(contract.people, :personJson))',
          { 
            userId: query.userId, 
            personJson: JSON.stringify({ personId }) 
          }
        );
      } else {
        // Si definitivamente no hay persona asociada, solo filtrar por creador
        queryBuilder.andWhere('contract.userId = :userId', { userId: query.userId });
      }
    }

    // Filter by operation if provided
    if (operation) {
      queryBuilder.andWhere('contract.operation = :operation', { operation });
    }

    // Search functionality
    if (search) {
      queryBuilder.andWhere(
        '(property.title LIKE :search OR property.address LIKE :search OR user.name LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Sorting
    if (sortField && sort) {
      const direction = sort.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      queryBuilder.orderBy(`contract.${sortField}`, direction);
    } else {
      queryBuilder.orderBy('contract.createdAt', 'DESC');
    }

    // Pagination
    if (pagination) {
      const skip = (page - 1) * limit;
      queryBuilder.skip(skip).take(limit);
    }

    const [contracts, total] = await queryBuilder.getManyAndCount();

    await Promise.all(contracts.map((contract) => this.normalizeContractStatus(contract)));

    if (pagination) {
      return {
        data: contracts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    return contracts;
  }

  async findOne(id: string): Promise<Contract> {
    const contract = await this.contractRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['user', 'property'],
    });

    if (!contract) {
      throw new NotFoundException('Contrato no encontrado');
    }

    return contract;
  }

  /**
   * Sube un comprobante de pago para un pago específico de un contrato.
   * Cambia el estado del pago a PENDING_VERIFICATION y notifica a los responsables.
   */
  async uploadPaymentProof(
    file: Express.Multer.File,
    contractId: string,
    paymentId: string,
    userId: string,
  ): Promise<any> {
    // 1. Validar contrato
    const contract = await this.findOne(contractId);
    
    // 2. Validar pago
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId, contractId: contract.id },
      relations: ['documents']
    });
    
    if (!payment) {
      throw new NotFoundException('Pago no encontrado para este contrato');
    }

    // 3. Buscar tipo de documento para comprobante de pago
    const documentTypes = await this.documentTypesService.findAll();
    let docType = documentTypes.find(dt => 
      dt.name.toLowerCase().includes('pago') || 
      dt.name.toLowerCase().includes('comprobante')
    );
    
    if (!docType) {
        if (documentTypes.length > 0) docType = documentTypes[0];
        else throw new BadRequestException('No hay tipos de documentos configurados en el sistema');
    }

    // 4. Subir archivo usando el servicio de documentos
    const multimedia = await this.documentTypesService.uploadFile(file, {
      title: `Pago - ${contract.code} - ${payment.description || paymentId}`,
      uploadedById: userId,
    });

    // 5. Crear el registro del Documento
    const document = this.documentRepository.create({
      title: `Comprobante de Pago: ${contract.code}`,
      documentTypeId: docType.id,
      multimediaId: multimedia.id,
      uploadedById: userId,
      contractId: contract.id,
      paymentId: payment.id,
      status: DocumentStatus.UPLOADED,
      required: false,
    });

    const savedDoc = await this.documentRepository.save(document);

    // 6. Actualizar estado del pago en la base de datos
    payment.status = PaymentStatus.PENDING_VERIFICATION;
    await this.paymentRepository.save(payment);

    // 7. Sincronizar en el JSON del contrato (historial y estado actual del pago)
    if (contract.payments) {
       const pIndex = contract.payments.findIndex(p => p.id === paymentId);
       if (pIndex !== -1) {
           contract.payments[pIndex].status = PaymentStatus.PENDING_VERIFICATION;
           
           if (!contract.payments[pIndex].documents) contract.payments[pIndex].documents = [];
           contract.payments[pIndex].documents.push({
               id: savedDoc.id,
               title: savedDoc.title,
               status: savedDoc.status as any,
               multimediaId: multimedia.id,
               multimedia: {
                   id: multimedia.id,
                   url: multimedia.url,
                   filename: multimedia.filename
               },
               uploadedById: userId,
               createdAt: new Date()
           });
           await this.contractRepository.save(contract);
       }
    }

    // 8. Notificar a Admins y Agente de la propiedad
    const property = await this.propertyRepository.findOne({
        where: { id: contract.propertyId },
    });

    const admins = await this.userRepository.find({
        where: { role: UserRole.ADMIN }
    });

    const targetUserIds = new Set<string>();
    admins.forEach(admin => targetUserIds.add(admin.id));
    if (property?.assignedAgentId) {
        targetUserIds.add(property.assignedAgentId);
    }

    if (targetUserIds.size > 0) {
        await this.notificationsService.create({
            senderType: NotificationSenderType.SYSTEM,
            senderName: 'Sistema de Pagos',
            isSystem: true,
            message: `El usuario ha subido un comprobante de pago para el contrato ${contract.code}.`,
            type: NotificationType.PAYMENT_RECEIPT,
            targetUserIds: Array.from(targetUserIds),
        });
    }

    return {
        success: true,
        message: 'Comprobante subido correctamente y pendiente de verificación',
        paymentStatus: payment.status,
        documentId: savedDoc.id
    };
  }

  async update(
    id: string,
    updateContractDto: UpdateContractDto,
    actorId?: string,
  ): Promise<Contract> {
    const contract = await this.findOne(id);

    if (this.isFinalStatus(contract.status)) {
      const attemptedFinancialMutation = [
        'amount',
        'commissionPercent',
        'commissionAmount',
        'currency',
        'ufValue',
      ].some((field) => typeof (updateContractDto as Record<string, unknown>)[field] !== 'undefined');

      if (attemptedFinancialMutation) {
        throw new BadRequestException('No se pueden modificar los montos de un contrato cerrado o fallido');
      }
    }

    const resolvedCurrency = updateContractDto.currency ?? contract.currency;
    const resolvedAmount =
      typeof updateContractDto.amount === 'number'
        ? updateContractDto.amount
        : contract.amount;
    const resolvedUfValue = resolvedCurrency === ContractCurrency.UF
      ? (typeof updateContractDto.ufValue === 'number'
          ? updateContractDto.ufValue
          : contract.ufValue ?? 0)
      : 0;

    let resolvedCommissionPercent =
      typeof updateContractDto.commissionPercent === 'number'
        ? updateContractDto.commissionPercent
        : contract.commissionPercent;

    if (typeof updateContractDto.commissionAmount === 'number') {
      const baseForPercent = resolvedCurrency === ContractCurrency.UF
        ? resolvedAmount * resolvedUfValue
        : resolvedAmount;

      if (baseForPercent > 0) {
        resolvedCommissionPercent = Number(
          ((updateContractDto.commissionAmount / baseForPercent) * 100).toFixed(4),
        );
        updateContractDto.commissionPercent = resolvedCommissionPercent;
      }
    }

    const shouldRecalculateCommission =
      typeof updateContractDto.amount === 'number' ||
      typeof updateContractDto.commissionPercent === 'number' ||
      typeof updateContractDto.currency !== 'undefined' ||
      typeof updateContractDto.ufValue === 'number' ||
      typeof updateContractDto.commissionAmount === 'number';

    if (shouldRecalculateCommission) {
      const baseAmount = resolvedCurrency === ContractCurrency.UF
        ? resolvedAmount * resolvedUfValue
        : resolvedAmount;

      if (baseAmount > 0 && Number.isFinite(resolvedCommissionPercent)) {
        const computedCommission = Math.round(
          baseAmount * (resolvedCommissionPercent / 100),
        );
        updateContractDto.commissionAmount = computedCommission;
      }
    }

    const changes = this.computeChangesFromPatch(
      contract,
      updateContractDto as Record<string, unknown>,
    );

    Object.assign(contract, updateContractDto);

    this.appendHistoryEntry(contract, {
      userId: actorId ?? null,
      action: 'CONTRACT_UPDATED',
      changes,
    });

    const updatedContract = await this.contractRepository.save(contract);

    return this.findOne(updatedContract.id);
  }

  async softDelete(id: string, actorId?: string): Promise<void> {
    const contract = await this.findOne(id);

    const deletionTime = new Date();

    this.appendHistoryEntry(contract, {
      userId: actorId ?? null,
      action: 'CONTRACT_SOFT_DELETED',
      changes: [
        {
          field: 'deletedAt',
          previousValue: contract.deletedAt,
          newValue: deletionTime,
        },
      ],
    });

    await this.contractRepository.save(contract);
    await this.contractRepository.softDelete(id);
  }

  async close(
    id: string,
    closeContractDto: CloseContractDto,
    actorId?: string,
  ): Promise<Contract> {
    const contract = await this.findOne(id);

    if (
      contract.status === ContractStatus.CLOSED ||
      contract.status === ContractStatus.FAILED
    ) {
      throw new BadRequestException('El contrato ya está cerrado o fallido');
    }

    // Validate required roles
    await this.validateRequiredRoles(contract);

    // Validate required documents are uploaded
    this.validateRequiredDocuments(contract, closeContractDto.documents);

    const previousStatus = contract.status;
    const previousEndDate = contract.endDate;

    contract.status = ContractStatus.CLOSED;
    contract.endDate = new Date(closeContractDto.endDate);

    const changes: ContractHistoryChange[] = [];

    if (!this.areValuesEqual(previousStatus, ContractStatus.CLOSED)) {
      changes.push({
        field: 'status',
        previousValue: previousStatus,
        newValue: ContractStatus.CLOSED,
      });
    }

    if (!this.areValuesEqual(previousEndDate, contract.endDate)) {
      changes.push({
        field: 'endDate',
        previousValue: previousEndDate,
        newValue: contract.endDate,
      });
    }

    this.appendHistoryEntry(contract, {
      userId: actorId ?? null,
      action: 'CONTRACT_CLOSED',
      changes,
      metadata: {
        documentsProvided: closeContractDto.documents?.length ?? 0,
      },
    });

    // Do not assign DTO documents directly to relation; documents should already be uploaded via uploadContractDocument
    const savedContract = await this.contractRepository.save(contract);
    return this.hydrateContractDocuments(savedContract);
  }

  async fail(id: string, endDate: Date, actorId?: string): Promise<Contract> {
    const contract = await this.findOne(id);

    if (
      contract.status === ContractStatus.CLOSED ||
      contract.status === ContractStatus.FAILED
    ) {
      throw new BadRequestException('El contrato ya está cerrado o fallido');
    }

    // Mark as failed
    const previousStatus = contract.status;
    const previousEndDate = contract.endDate;
    const resolvedEndDate = endDate instanceof Date ? endDate : new Date(endDate);

    contract.status = ContractStatus.FAILED;
    contract.endDate = resolvedEndDate;

    const changes: ContractHistoryChange[] = [];

    if (!this.areValuesEqual(previousStatus, ContractStatus.FAILED)) {
      changes.push({
        field: 'status',
        previousValue: previousStatus,
        newValue: ContractStatus.FAILED,
      });
    }

    if (!this.areValuesEqual(previousEndDate, resolvedEndDate)) {
      changes.push({
        field: 'endDate',
        previousValue: previousEndDate,
        newValue: resolvedEndDate,
      });
    }

    this.appendHistoryEntry(contract, {
      userId: actorId ?? null,
      action: 'CONTRACT_MARKED_FAILED',
      changes,
    });

    return await this.contractRepository.save(contract);
  }

  async addPayment(
    id: string,
    addPaymentDto: AddPaymentDto,
    actorId?: string,
  ): Promise<Contract> {
    const contract = await this.findOne(id);

    if (this.isFinalStatus(contract.status)) {
      throw new BadRequestException('No se pueden agregar pagos a un contrato cerrado o fallido');
    }

    const paymentDate = new Date(addPaymentDto.date);
    const paymentPayload: DeepPartial<Payment> = {
      amount: addPaymentDto.amount,
      date: paymentDate,
      description: addPaymentDto.description,
      type: addPaymentDto.type,
      status: PaymentStatus.PENDING,
      contractId: contract.id,
      paidAt: null,
      isAgencyRevenue: addPaymentDto.isAgencyRevenue ?? false,
    };

    const paymentEntity = this.paymentRepository.create(paymentPayload);

    const savedPayment = await this.paymentRepository.save(paymentEntity);

    const paymentRecord = {
      id: savedPayment.id,
      amount: Number(savedPayment.amount),
      date: savedPayment.date instanceof Date ? savedPayment.date.toISOString() : savedPayment.date,
      description: savedPayment.description ?? undefined,
      type: savedPayment.type,
      status: savedPayment.status,
      paidAt: savedPayment.paidAt instanceof Date ? savedPayment.paidAt.toISOString() : savedPayment.paidAt ?? null,
      isAgencyRevenue: savedPayment.isAgencyRevenue === true,
      documents: [],
    };

    const previousCount = Array.isArray(contract.payments)
      ? contract.payments.length
      : 0;

    const updatedPayments = [...(contract.payments ?? []), paymentRecord];
    contract.payments = updatedPayments as any[];

    this.appendHistoryEntry(contract, {
      userId: actorId ?? null,
      action: 'CONTRACT_PAYMENT_ADDED',
      changes: [
        {
          field: 'payments',
          previousValue: previousCount,
          newValue: previousCount + 1,
        },
      ],
      metadata: {
        payment: {
          id: paymentRecord.id,
          amount: paymentRecord.amount,
          date: paymentRecord.date,
          description: paymentRecord.description,
          type: paymentRecord.type,
          status: paymentRecord.status,
          paidAt: paymentRecord.paidAt,
          isAgencyRevenue: paymentRecord.isAgencyRevenue,
        },
      },
    });

    const updatedContract = await this.contractRepository.save(contract);

    return this.findOne(updatedContract.id);
  }

  async addPerson(id: string, addPersonDto: AddPersonDto, actorId?: string): Promise<Contract> {
    const contract = await this.findOne(id);

    const person = {
      personId: addPersonDto.personId,
      role: addPersonDto.role,
    };

    if (!contract.people) {
      contract.people = [];
    }

    const previousCount = contract.people.length;
    contract.people.push(person);

    this.appendHistoryEntry(contract, {
      userId: actorId ?? null,
      action: 'CONTRACT_PERSON_ADDED',
      changes: [
        {
          field: 'people',
          previousValue: previousCount,
          newValue: previousCount + 1,
        },
      ],
      metadata: {
        person,
      },
    });

    return await this.contractRepository.save(contract);
  }

  async getPeopleByRole(id: string, role: ContractRole): Promise<any[]> {
    const contract = await this.findOne(id);
    return (contract.people || []).filter((person) => person.role === role);
  }

  async validateRequiredRoles(contract: Contract): Promise<void> {
    const requiredRoles = this.getRequiredRolesForOperation(
      contract.operation as any,
    );
    const existingRoles = (contract.people || []).map((person) => person.role);

    const missingRoles = requiredRoles.filter(
      (role) => !existingRoles.includes(role),
    );

    if (missingRoles.length > 0) {
      throw new BadRequestException(
        `Faltan roles obligatorios para este tipo de contrato: ${missingRoles.join(', ')}`,
      );
    }
  }

  private getRequiredRolesForOperation(
    operation: ContractOperationType,
  ): ContractRole[] {
    switch (operation) {
      case ContractOperationType.COMPRAVENTA:
        return [ContractRole.SELLER, ContractRole.BUYER];
      case ContractOperationType.ARRIENDO:
        return [ContractRole.LANDLORD, ContractRole.TENANT];
      default:
        return [];
    }
  }

  async uploadContractDocument(
    file: Express.Multer.File,
    uploadContractDocumentDto: UploadContractDocumentDto,
    actorId?: string,
  ): Promise<any> {
    // Verificar que el contrato existe
    const contract = await this.findOne(uploadContractDocumentDto.contractId);

    // Verificar que el tipo de documento existe y está disponible
    const documentType = await this.documentTypesService.findOne(
      uploadContractDocumentDto.documentTypeId,
    );

    if (!documentType.available) {
      throw new BadRequestException(
        'El tipo de documento no está disponible para uso',
      );
    }

    const matchingContractDocument = Array.isArray(contract.documents)
      ? contract.documents.find((entry) => {
          if (!entry) {
            return false;
          }

          if (
            uploadContractDocumentDto.documentId &&
            entry.documentId &&
            entry.documentId === uploadContractDocumentDto.documentId
          ) {
            return true;
          }

          return entry.documentTypeId === uploadContractDocumentDto.documentTypeId;
        })
      : undefined;

    const resolvedRequired =
      typeof uploadContractDocumentDto.required === 'boolean'
        ? uploadContractDocumentDto.required
        : typeof matchingContractDocument?.required === 'boolean'
          ? matchingContractDocument.required
          : false;

    const existingDocument = uploadContractDocumentDto.documentId
      ? await this.documentRepository.findOne({
          where: { id: uploadContractDocumentDto.documentId },
          relations: ['multimedia', 'documentType'],
        })
      : null;

    if (existingDocument && existingDocument.contractId && existingDocument.contractId !== contract.id) {
      throw new BadRequestException('El documento seleccionado no pertenece al contrato');
    }

    if (existingDocument && existingDocument.documentTypeId !== uploadContractDocumentDto.documentTypeId) {
      throw new BadRequestException('El documento seleccionado no corresponde al tipo indicado');
    }

    if (existingDocument) {
      if (existingDocument.required !== resolvedRequired) {
        existingDocument.required = resolvedRequired;
      }

      const uploadPayloadTitle =
        uploadContractDocumentDto.title ?? existingDocument.title ?? documentType.name;

      const multimedia = await this.documentTypesService.uploadFile(file, {
        title: uploadPayloadTitle,
        uploadedById: uploadContractDocumentDto.uploadedById,
        seoTitle:
          uploadContractDocumentDto.seoTitle ??
          existingDocument.title ??
          uploadPayloadTitle,
      });

      const previousMultimediaId = existingDocument.multimediaId;

      existingDocument.title = existingDocument.title ?? uploadPayloadTitle;
      existingDocument.multimediaId = multimedia.id;
      existingDocument.multimedia = multimedia;
      existingDocument.status = DocumentStatus.UPLOADED;
      existingDocument.notes =
        uploadContractDocumentDto.notes !== undefined
          ? uploadContractDocumentDto.notes
          : existingDocument.notes;
      existingDocument.uploadedById = uploadContractDocumentDto.uploadedById;
      existingDocument.contractId = existingDocument.contractId ?? contract.id;

      await this.documentRepository.save(existingDocument);

      this.syncContractDocumentRecord(contract, existingDocument);

      this.appendHistoryEntry(contract, {
        userId: actorId ?? uploadContractDocumentDto.uploadedById ?? null,
        action: 'CONTRACT_DOCUMENT_UPDATED',
        changes: [
          {
            field: 'documents',
            previousValue: {
              documentId: existingDocument.id,
              multimediaId: previousMultimediaId,
            },
            newValue: {
              documentId: existingDocument.id,
              multimediaId: multimedia.id,
            },
          },
        ],
        metadata: {
          documentId: existingDocument.id,
          documentTypeId: existingDocument.documentTypeId,
        },
      });

      await this.contractRepository.save(contract);

      return {
        contract,
        document: existingDocument,
        multimedia,
      };
    }

    const previousDocumentsLength = Array.isArray(contract.documents)
      ? contract.documents.length
      : 0;

    const uploadResult = await this.documentTypesService.uploadDocument(file, {
      title: uploadContractDocumentDto.title,
      documentTypeId: uploadContractDocumentDto.documentTypeId,
      uploadedById: uploadContractDocumentDto.uploadedById,
      contractId: uploadContractDocumentDto.contractId,
      status: DocumentStatus.UPLOADED,
      notes: uploadContractDocumentDto.notes,
      seoTitle: uploadContractDocumentDto.seoTitle,
      required: resolvedRequired,
    });

    const syncResult = this.syncContractDocumentRecord(contract, uploadResult.document);

    this.appendHistoryEntry(contract, {
      userId: actorId ?? uploadContractDocumentDto.uploadedById ?? null,
      action: 'CONTRACT_DOCUMENT_ATTACHED',
      changes: [
        {
          field: 'documents',
          previousValue: syncResult.created
            ? previousDocumentsLength
            : syncResult.previousEntry,
          newValue: syncResult.created
            ? previousDocumentsLength + 1
            : syncResult.updatedEntry,
        },
      ],
      metadata: {
        documentId: uploadResult.document?.id,
        documentTypeId: uploadContractDocumentDto.documentTypeId,
      },
    });

    await this.contractRepository.save(contract);

    return {
      contract,
      document: uploadResult.document,
      multimedia: uploadResult.multimedia,
    };
  }

  private async initializeContractDocuments(
    contract: Contract,
    documents: ContractDocument[],
    actorId?: string,
    fallbackUploaderId?: string,
  ): Promise<Contract> {
    if (!Array.isArray(documents) || documents.length === 0) {
      return contract;
    }

    const defaultUploaderId = actorId ?? fallbackUploaderId ?? contract.userId;

    const documentTypeCache = new Map<string, DocumentType>();
    const userCache = new Map<string, User>();
    const personCache = new Map<string, Person>();

    const resolveDocumentType = async (documentTypeId: string): Promise<DocumentType> => {
      if (!documentTypeCache.has(documentTypeId)) {
        const documentType = await this.documentTypesService.findOne(documentTypeId);

        if (!documentType.available) {
          throw new BadRequestException('El tipo de documento no está disponible para uso');
        }

        documentTypeCache.set(documentTypeId, documentType);
      }

      return documentTypeCache.get(documentTypeId)!;
    };

    const resolveUser = async (userId: string) => {
      if (!userCache.has(userId)) {
        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user) {
          throw new NotFoundException('Usuario responsable del documento no encontrado');
        }

        userCache.set(userId, user);
      }

      return userCache.get(userId)!;
    };

    const resolvePerson = async (personId: string) => {
      if (!personCache.has(personId)) {
        const person = await this.personRepository.findOne({ where: { id: personId } });

        if (!person) {
          throw new NotFoundException('Persona asociada al documento no encontrada');
        }

        personCache.set(personId, person);
      }

      return personCache.get(personId)!;
    };

    const createdDocumentIds: string[] = [];
    const createdDocumentSummaries: Array<{ documentId: string; documentTypeId: string }> = [];

    for (const documentConfig of documents) {
      if (!documentConfig?.documentTypeId) {
        continue;
      }

      const identifierCandidates = [documentConfig.documentId, documentConfig.id]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map((value) => value.trim());

      let existingDocument: DocumentEntity | null = null;

      for (const identifier of identifierCandidates) {
        existingDocument = await this.documentRepository.findOne({
          where: { id: identifier },
          relations: ['documentType', 'multimedia', 'uploadedBy', 'person'],
        });

        if (existingDocument) {
          break;
        }
      }

      if (!existingDocument) {
        existingDocument = await this.documentRepository.findOne({
          where: {
            contractId: contract.id,
            documentTypeId: documentConfig.documentTypeId,
          },
          relations: ['documentType', 'multimedia', 'uploadedBy', 'person'],
        });
      }

      if (existingDocument) {
        if (typeof documentConfig.required === 'boolean' && existingDocument.required !== documentConfig.required) {
          existingDocument.required = documentConfig.required;
          await this.documentRepository.save(existingDocument);
        }

        if (!existingDocument.contractId) {
          existingDocument.contractId = contract.id;
          await this.documentRepository.save(existingDocument);
        }

        const syncResult = this.syncContractDocumentRecord(contract, existingDocument);
        this.applyDocumentConfigToRecord(contract, syncResult.updatedEntry, documentConfig);
        continue;
      }

      const documentType = await resolveDocumentType(documentConfig.documentTypeId);

      const uploaderIdCandidate = (() => {
        const rawUploaderId = documentConfig.uploadedById;
        if (typeof rawUploaderId === 'string' && rawUploaderId.trim().length > 0) {
          return rawUploaderId.trim();
        }
        return defaultUploaderId;
      })();

      if (!uploaderIdCandidate) {
        throw new BadRequestException('No se pudo determinar el usuario responsable de los documentos del contrato');
      }

      const uploader = await resolveUser(uploaderIdCandidate);

      let associatedPerson: Person | undefined;
      if (typeof documentConfig.personId === 'string' && documentConfig.personId.trim().length > 0) {
        associatedPerson = await resolvePerson(documentConfig.personId.trim());
      }

      const resolvedNotes =
        typeof documentConfig.notes === 'string' && documentConfig.notes.trim().length > 0
          ? documentConfig.notes.trim()
          : undefined;

      const statusFromConfig =
        typeof documentConfig.status === 'string'
          ? (documentConfig.status as DocumentStatus)
          : undefined;
      const resolvedStatus =
        statusFromConfig ??
        (documentConfig.uploaded ? DocumentStatus.UPLOADED : DocumentStatus.PENDING);

      const titleCandidates = [
        typeof documentConfig.title === 'string' ? documentConfig.title : undefined,
        documentType.name,
      ];

      const resolvedTitle =
        titleCandidates.find(
          (value) => typeof value === 'string' && value.trim().length > 0,
        )?.trim() ?? documentType.name;

      const placeholderDocument = this.documentRepository.create({
        title: resolvedTitle,
        documentType,
        documentTypeId: documentType.id,
        uploadedBy: uploader,
        uploadedById: uploader.id,
        person: associatedPerson,
        personId: associatedPerson?.id,
        contractId: contract.id,
        status: resolvedStatus,
        notes: resolvedNotes,
        required: documentConfig.required === true,
      });

      const savedDocument = await this.documentRepository.save(placeholderDocument);

      createdDocumentIds.push(savedDocument.id);
      createdDocumentSummaries.push({
        documentId: savedDocument.id,
        documentTypeId: savedDocument.documentTypeId,
      });

      const syncResult = this.syncContractDocumentRecord(contract, savedDocument);
      this.applyDocumentConfigToRecord(contract, syncResult.updatedEntry, documentConfig);

    }

    if (createdDocumentSummaries.length > 0) {
      this.appendHistoryEntry(contract, {
        userId: actorId ?? defaultUploaderId ?? null,
        action: 'CONTRACT_DOCUMENT_PLACEHOLDERS_CREATED',
        changes: [
          {
            field: 'documents',
            previousValue: null,
            newValue: createdDocumentSummaries,
          },
        ],
        metadata: createdDocumentIds.length
          ? { documentIds: createdDocumentIds }
          : undefined,
      });
    }

    return await this.contractRepository.save(contract);
  }

  private applyDocumentConfigToRecord(
    contract: Contract,
    updatedEntry: ContractDocument,
    documentConfig: ContractDocument,
  ): void {
    const docs = Array.isArray(contract.documents)
      ? [...contract.documents]
      : [];

    const matchIndex = docs.findIndex((entry) => {
      if (!entry) {
        return false;
      }

      if (
        typeof entry.documentId === 'string' &&
        typeof updatedEntry.documentId === 'string' &&
        entry.documentId === updatedEntry.documentId
      ) {
        return true;
      }

      return entry.documentTypeId === updatedEntry.documentTypeId;
    });

    const normalizedNotes =
      typeof documentConfig.notes === 'string' && documentConfig.notes.trim().length > 0
        ? documentConfig.notes.trim()
        : undefined;

    if (matchIndex >= 0) {
      const mergedEntry: ContractDocument = {
        ...docs[matchIndex],
        ...updatedEntry,
        required:
          typeof documentConfig.required === 'boolean'
            ? documentConfig.required
            : docs[matchIndex].required ?? false,
      };

      if (normalizedNotes !== undefined) {
        mergedEntry.notes = normalizedNotes;
      }

      if (
        typeof documentConfig.personId === 'string' &&
        documentConfig.personId.trim().length > 0
      ) {
        mergedEntry.personId = documentConfig.personId.trim();
      }

      if (
        typeof documentConfig.personName === 'string' &&
        documentConfig.personName.trim().length > 0
      ) {
        mergedEntry.personName = documentConfig.personName.trim();
      }

      if (
        typeof documentConfig.personDni === 'string' &&
        documentConfig.personDni.trim().length > 0
      ) {
        mergedEntry.personDni = documentConfig.personDni.trim();
      }

      mergedEntry.status = updatedEntry.status;
      mergedEntry.uploaded = updatedEntry.uploaded;

      contract.documents = [
        ...docs.slice(0, matchIndex),
        mergedEntry,
        ...docs.slice(matchIndex + 1),
      ];
      return;
    }

    const newEntry: ContractDocument = {
      ...updatedEntry,
      required:
        typeof documentConfig.required === 'boolean'
          ? documentConfig.required
          : updatedEntry.required ?? false,
    };

    if (normalizedNotes !== undefined) {
      newEntry.notes = normalizedNotes;
    }

    if (
      typeof documentConfig.personId === 'string' &&
      documentConfig.personId.trim().length > 0
    ) {
      newEntry.personId = documentConfig.personId.trim();
    }

    if (
      typeof documentConfig.personName === 'string' &&
      documentConfig.personName.trim().length > 0
    ) {
      newEntry.personName = documentConfig.personName.trim();
    }

    if (
      typeof documentConfig.personDni === 'string' &&
      documentConfig.personDni.trim().length > 0
    ) {
      newEntry.personDni = documentConfig.personDni.trim();
    }

    newEntry.status = updatedEntry.status;
    newEntry.uploaded = updatedEntry.uploaded;

    contract.documents = [...docs, newEntry];
  }

  private syncContractDocumentRecord(
    contract: Contract,
    document: DocumentEntity,
  ): {
    created: boolean;
    previousEntry?: ContractDocument;
    updatedEntry: ContractDocument;
  } {
    const docs: ContractDocument[] = Array.isArray(contract.documents)
      ? [...contract.documents]
      : [];

    const matchesDocument = (entry: any) => {
      if (!entry) return false;

      const entryDocumentId =
        (typeof entry.documentId === 'string' && entry.documentId) ||
        (typeof entry.id === 'string' && entry.id) ||
        undefined;
      const entryDocumentTypeId =
        (typeof entry.documentTypeId === 'string' && entry.documentTypeId) ||
        (typeof entry.documentType?.id === 'string' && entry.documentType.id) ||
        undefined;

      return (
        entryDocumentId === document.id ||
        (!!entryDocumentTypeId && entryDocumentTypeId === document.documentTypeId)
      );
    };

    const matchIndex = docs.findIndex(matchesDocument);
    const previousEntry = matchIndex >= 0 ? docs[matchIndex] : undefined;

    const requiredFlag =
      typeof document.required === 'boolean'
        ? document.required
        : previousEntry?.required ?? false;

    const resolvedDocumentType = document.documentType ?? previousEntry?.documentType;
    const documentTypeName =
      typeof resolvedDocumentType?.name === 'string'
        ? resolvedDocumentType.name
        : typeof previousEntry?.documentType?.name === 'string'
          ? previousEntry.documentType!.name
          : undefined;

    const hasMultimedia = Boolean(
      document.multimediaId ??
        document.multimedia?.id ??
        previousEntry?.multimediaId ??
        previousEntry?.multimedia?.id,
    );

    const resolvedStatus = document.status ?? previousEntry?.status ?? (hasMultimedia
      ? DocumentStatus.UPLOADED
      : DocumentStatus.PENDING);

    const resolvedUploaded = resolvedStatus !== DocumentStatus.PENDING;

    const resolvedNotes =
      document.notes !== undefined
        ? document.notes
        : previousEntry?.notes;

    const resolvedUploadedById = document.uploadedById ?? previousEntry?.uploadedById;

    const resolvedPerson = document.person ?? previousEntry?.person;
    const resolvedPersonId =
      document.personId ?? previousEntry?.personId ?? resolvedPerson?.id ?? undefined;

    const resolvedPersonName = (() => {
      if (typeof previousEntry?.personName === 'string' && previousEntry.personName.trim().length > 0) {
        return previousEntry.personName.trim();
      }
      if (resolvedPerson?.name) {
        return resolvedPerson.name;
      }
      return undefined;
    })();

    const resolvedPersonDni = (() => {
      if (typeof previousEntry?.personDni === 'string' && previousEntry.personDni.trim().length > 0) {
        return previousEntry.personDni.trim();
      }
      if (resolvedPerson?.dni) {
        return resolvedPerson.dni;
      }
      return undefined;
    })();

    const resolvedTitle = (() => {
      if (typeof previousEntry?.title === 'string' && previousEntry.title.trim().length > 0) {
        return previousEntry.title.trim();
      }
      if (typeof document.title === 'string' && document.title.trim().length > 0) {
        return document.title.trim();
      }
      if (documentTypeName && documentTypeName.trim().length > 0) {
        return documentTypeName.trim();
      }
      return '';
    })();

    const resolvedMultimediaId =
      document.multimediaId ?? document.multimedia?.id ?? previousEntry?.multimediaId;

    const resolvedMultimedia = document.multimedia ?? previousEntry?.multimedia;

    const resolvedCreatedAt = document.createdAt ?? previousEntry?.createdAt;

    const updatedEntry: ContractDocument = {
      ...(previousEntry ?? {}),
      documentTypeId: document.documentTypeId,
      documentId: document.id,
      id: document.id,
      title: resolvedTitle,
      required: requiredFlag,
      uploaded: resolvedUploaded,
      status: resolvedStatus,
      notes: resolvedNotes,
      uploadedById: resolvedUploadedById,
      personId: resolvedPersonId,
      person: resolvedPerson ?? undefined,
      personName: resolvedPersonName,
      personDni: resolvedPersonDni,
      documentType: resolvedDocumentType ?? previousEntry?.documentType ?? undefined,
      multimediaId: resolvedMultimediaId,
      multimedia: resolvedMultimedia,
      createdAt: resolvedCreatedAt,
    };

    if (matchIndex >= 0) {
      docs[matchIndex] = updatedEntry;
    } else {
      docs.push(updatedEntry);
    }

    contract.documents = docs;

    return {
      created: matchIndex === -1,
      previousEntry,
      updatedEntry,
    };
  }

  private async hydrateContractDocuments(contract: Contract): Promise<Contract> {
    const persistedDocuments = await this.documentRepository.find({
      where: { contractId: contract.id, deletedAt: IsNull() },
      order: { createdAt: 'ASC' },
      relations: ['documentType', 'multimedia', 'uploadedBy', 'person'],
    });

    if (!persistedDocuments.length) {
      contract.documents = [];
      return contract;
    }

    const mappedDocuments: ContractDocument[] = persistedDocuments.map((document) => {
      const uploadStatus = document.status ?? DocumentStatus.PENDING;
      const personRecord = document.person
        ? {
            id: document.person.id,
            name: document.person.name ?? undefined,
            dni: document.person.dni ?? undefined,
          }
        : undefined;

      const documentTypeRecord = document.documentType
        ? {
            id: document.documentType.id,
            name: document.documentType.name,
          }
        : undefined;

      return {
        documentTypeId: document.documentTypeId,
        documentId: document.id,
        id: document.id,
        title: document.title,
        required: document.required === true,
        uploaded: uploadStatus !== DocumentStatus.PENDING,
        status: uploadStatus,
        notes: document.notes ?? undefined,
        uploadedById: document.uploadedById,
        personId: document.personId ?? undefined,
        person: personRecord,
        personName: document.person?.name ?? undefined,
        personDni: document.person?.dni ?? undefined,
        documentType: documentTypeRecord,
        documentTypeName: document.documentType?.name,
        multimediaId: document.multimediaId ?? document.multimedia?.id ?? undefined,
        multimedia: document.multimedia
          ? {
              id: document.multimedia.id,
              url: document.multimedia.url,
              filename: document.multimedia.filename,
            }
          : undefined,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        contractCode: contract.code,
        uploadedByName: document.uploadedBy?.name ?? document.uploadedBy?.email ?? undefined,
      } as ContractDocument;
    });

    contract.documents = mappedDocuments;
    return contract;
  }

  private validateRequiredDocuments(
    contract: Contract,
    documents: any[],
  ): void {
    const requiredDocuments = documents.filter((doc) => doc.required);
    const uploadedDocuments = documents.filter((doc) => doc.uploaded);

    if (requiredDocuments.length !== uploadedDocuments.length) {
      throw new BadRequestException(
        'Faltan documentos obligatorios para cerrar el contrato',
      );
    }
  }

  async associateDocumentToPayment(
    paymentId: string,
    documentId: string,
  ): Promise<{ payment: Payment; document: DocumentEntity }> {
    // Verificar que el pago existe
    const payment = await this.contractRepository.manager.findOne(Payment, {
      where: { id: paymentId },
      relations: ['contract'],
    });

    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    // Verificar que el documento existe
    const document = await this.contractRepository.manager.findOne(DocumentEntity, {
      where: { id: documentId },
      relations: ['contract'],
    });

    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    // Verificar que ambos pertenecen al mismo contrato (opcional, pero recomendado)
    if (payment.contractId !== document.contractId) {
      throw new BadRequestException(
        'El pago y el documento deben pertenecer al mismo contrato',
      );
    }

    // Asociar el documento al pago
    document.paymentId = paymentId;
    document.payment = payment;

    // Guardar el documento actualizado
    const updatedDocument = await this.contractRepository.manager.save(DocumentEntity, document);

    // Recargar el pago con sus documentos asociados
    const updatedPayment = await this.contractRepository.manager.findOne(Payment, {
      where: { id: paymentId },
      relations: ['documents', 'contract'],
    });

    if (!updatedPayment) {
      throw new NotFoundException('Error al recargar el pago');
    }

    return {
      payment: updatedPayment,
      document: updatedDocument,
    };
  }

  async getPaymentDocuments(paymentId: string): Promise<DocumentEntity[]> {
    const payment = await this.contractRepository.manager.findOne(Payment, {
      where: { id: paymentId },
      relations: ['documents'],
    });

    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    return payment.documents || [];
  }

  async validatePaymentWithDocuments(paymentId: string): Promise<{
    payment: Payment;
    documents: DocumentEntity[];
    isValid: boolean;
    missingDocuments: string[];
  }> {
    const payment = await this.contractRepository.manager.findOne(Payment, {
      where: { id: paymentId },
      relations: ['documents', 'contract'],
    });

    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    const documents = payment.documents || [];
    const contract = payment.contract;

    // Definir documentos requeridos según el tipo de operación y monto
    const requiredDocumentTypes = this.getRequiredDocumentsForPayment(
      contract.operation,
      payment.amount,
    );

    const existingDocumentTypes = documents.map(doc => doc.documentType?.name || 'Unknown');
    const missingDocuments = requiredDocumentTypes.filter(
      requiredType => !existingDocumentTypes.includes(requiredType)
    );

    const isValid = missingDocuments.length === 0;

    return {
      payment,
      documents,
      isValid,
      missingDocuments,
    };
  }

  private getRequiredDocumentsForPayment(
    operation: ContractOperationType,
    amount: number,
  ): string[] {
    const baseDocuments = ['Comprobante de Pago'];

    // Documentos adicionales según el tipo de operación
    switch (operation) {
      case ContractOperationType.COMPRAVENTA:
        baseDocuments.push('Escritura de Venta');
        if (amount > 10000000) { // Para montos altos
          baseDocuments.push('Certificado de Avalúo');
        }
        break;
      case ContractOperationType.ARRIENDO:
        baseDocuments.push('Contrato de Arriendo');
        if (amount > 500000) { // Para arriendos caros
          baseDocuments.push('Certificado de Crédito');
        }
        break;
    }

    return baseDocuments;
  }

  // Métodos para manejo de pagos por tipo
  async getPaymentsByType(contractId: string, type: PaymentType): Promise<Payment[]> {
    return await this.paymentRepository.find({
      where: {
        contractId,
        type,
        deletedAt: IsNull()
      },
      order: { date: 'ASC' }
    });
  }

  async getCommissionPayments(): Promise<Payment[]> {
    return await this.paymentRepository.find({
      where: {
        type: PaymentType.COMMISSION_INCOME,
        deletedAt: IsNull()
      },
      relations: ['contract'],
      order: { date: 'DESC' }
    });
  }

  async getRentPayments(contractId?: string): Promise<Payment[]> {
    const where: any = {
      type: PaymentType.RENT_PAYMENT,
      deletedAt: IsNull()
    };

    if (contractId) {
      where.contractId = contractId;
    }

    return await this.paymentRepository.find({
      where,
      relations: ['contract'],
      order: { date: 'DESC' }
    });
  }

  // Método para determinar tipo de pago por defecto basado en el contrato
  getDefaultPaymentType(operation: ContractOperationType): PaymentType {
    switch (operation) {
      case ContractOperationType.COMPRAVENTA:
        return PaymentType.SALE_DOWN_PAYMENT;
      case ContractOperationType.ARRIENDO:
        return PaymentType.RENT_PAYMENT;
      default:
        return PaymentType.OTHER;
    }
  }

  /**
   * Update contract status only
   */
  async updateContractStatus(id: string, status: ContractStatus, actorId?: string): Promise<Contract> {
    const contract = await this.findOne(id);
    const previousStatus = contract.status;
    const previousEndDate = contract.endDate;

    if (this.isFinalStatus(previousStatus) && previousStatus !== status) {
      throw new BadRequestException('El contrato está cerrado o fallido y no permite cambiar su estado');
    }

    if (previousStatus === status) {
      return contract;
    }

    contract.status = status;

    if (this.isFinalStatus(status)) {
      if (!contract.endDate) {
        contract.endDate = new Date();
      }
    }

    if (!this.isFinalStatus(status)) {
      contract.endDate = null;
    }

    const changes: ContractHistoryChange[] = [
      {
        field: 'status',
        previousValue: previousStatus,
        newValue: status,
      },
    ];

    if (previousEndDate !== contract.endDate && this.isFinalStatus(status)) {
      changes.push({
        field: 'endDate',
        previousValue: previousEndDate,
        newValue: contract.endDate,
      });
    }

    this.appendHistoryEntry(contract, {
      userId: actorId ?? null,
      action: 'CONTRACT_STATUS_UPDATED',
      changes,
    });

    return await this.contractRepository.save(contract);
  }

  /**
   * Update contract assigned agent (userId)
   */
  async updateContractAgent(id: string, userId: string, actorId?: string): Promise<Contract> {
    const contract = await this.findOne(id);
    const previousAgentId = contract.userId;

    if (previousAgentId === userId) {
      return contract;
    }

    // TODO: Validate that userId exists and is an AGENT or ADMINISTRATOR
    contract.userId = userId;
    contract.user = { id: userId } as any; // ensure relation updates correctly

    this.appendHistoryEntry(contract, {
      userId: actorId ?? null,
      action: 'CONTRACT_AGENT_UPDATED',
      changes: [
        {
          field: 'userId',
          previousValue: previousAgentId,
          newValue: userId,
        },
      ],
    });

    await this.contractRepository.save(contract);
    
    // Return contract with all relations loaded
    return this.findOne(id);
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(paymentId: string, status: PaymentStatus, actorId?: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId, deletedAt: IsNull() },
      relations: ['contract'],
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${paymentId} not found`);
    }

    const previousStatus = payment.status;
    const previousPaidAt = payment.paidAt ?? null;

    if (previousStatus === status) {
      return payment;
    }

    payment.status = status;
    if (status === PaymentStatus.PAID) {
      payment.paidAt = payment.paidAt ?? new Date();
    } else {
      payment.paidAt = null;
    }

    const updatedPayment = await this.paymentRepository.save(payment);

    if (payment.contractId) {
      const contract = await this.contractRepository.findOne({ where: { id: payment.contractId } });
      if (contract) {
        if (Array.isArray(contract.payments)) {
          contract.payments = contract.payments.map((item: any) =>
            item?.id === payment.id
              ? {
                  ...item,
                  status,
                  paidAt: updatedPayment.paidAt instanceof Date
                    ? updatedPayment.paidAt.toISOString()
                    : updatedPayment.paidAt ?? null,
                }
              : item
          ) as any[];
        }

        const normalizedPreviousPaidAt =
          previousPaidAt instanceof Date ? previousPaidAt.toISOString() : previousPaidAt;
        const normalizedNewPaidAt =
          updatedPayment.paidAt instanceof Date
            ? updatedPayment.paidAt.toISOString()
            : updatedPayment.paidAt ?? null;

        const changes: ContractHistoryChange[] = [
          {
            field: `payment:${payment.id}:status`,
            previousValue: previousStatus,
            newValue: status,
          },
        ];

        if (!this.areValuesEqual(normalizedPreviousPaidAt, normalizedNewPaidAt)) {
          changes.push({
            field: `payment:${payment.id}:paidAt`,
            previousValue: normalizedPreviousPaidAt,
            newValue: normalizedNewPaidAt,
          });
        }

        this.appendHistoryEntry(contract, {
          userId: actorId ?? null,
          action: 'CONTRACT_PAYMENT_STATUS_UPDATED',
          changes,
          metadata: {
            paymentId: payment.id,
            paidAt: normalizedNewPaidAt,
          },
        });
        await this.contractRepository.save(contract);

        // Notify tenant if payment is marked as PAID
        if (status === PaymentStatus.PAID) {
          const tenantRecord = (contract.people as any[])?.find(
            (p) => p.role === ContractRole.TENANT,
          );
          if (tenantRecord?.personId) {
            const person = await this.personRepository.findOne({
              where: { id: tenantRecord.personId },
            });
            if (person?.userId) {
              await this.notificationsService.create({
                targetUserIds: [person.userId],
                type: NotificationType.PAYMENT_RECEIPT,
                senderName: 'Sistema',
                isSystem: true,
                message: `Su pago de arriendo (${payment.description || 'cuota'}) ha sido confirmado exitosamente.`,
                senderType: NotificationSenderType.SYSTEM,
              });
            }
          }
        }
      }
    }

    return updatedPayment;
  }

  /**
   * Upload document for payment verification
   */
  async uploadPaymentDocument(
    file: Express.Multer.File,
    uploadPaymentDocumentDto: UploadPaymentDocumentDto,
  ): Promise<DocumentEntity> {
    // Verify payment exists
    const payment = await this.paymentRepository.findOne({
      where: { id: uploadPaymentDocumentDto.paymentId, deletedAt: IsNull() },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${uploadPaymentDocumentDto.paymentId} not found`);
    }

    // Use DocumentTypesService to upload the document
    const result = await this.documentTypesService.uploadDocument(
      file,
      {
        title: uploadPaymentDocumentDto.title,
        documentTypeId: uploadPaymentDocumentDto.documentTypeId,
        uploadedById: uploadPaymentDocumentDto.uploadedById,
        notes: uploadPaymentDocumentDto.notes,
        seoTitle: uploadPaymentDocumentDto.seoTitle,
        paymentId: uploadPaymentDocumentDto.paymentId,
        personId: uploadPaymentDocumentDto.personId,
        contractId:
          uploadPaymentDocumentDto.contractId ?? payment.contractId,
      },
    );

    // Update payment status to PENDING_VERIFICATION
    await this.updatePaymentStatus(
      uploadPaymentDocumentDto.paymentId,
      PaymentStatus.PENDING_VERIFICATION,
      uploadPaymentDocumentDto.uploadedById,
    );

    return result.document;
  }
}
