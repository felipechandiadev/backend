import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Property } from './property.entity';
import { Document, DocumentStatus } from './document.entity';
import { PaymentStatus } from './payment.entity';
import { User } from './user.entity';

export enum ContractOperationType {
  COMPRAVENTA = 'COMPRAVENTA',
  ARRIENDO = 'ARRIENDO',
}

export enum ContractStatus {
  IN_PROCESS = 'IN_PROCESS',
  CLOSED = 'CLOSED',
  FAILED = 'FAILED',
}

export enum ContractRole {
  SELLER = 'SELLER',
  BUYER = 'BUYER',
  LANDLORD = 'LANDLORD',
  TENANT = 'TENANT',
  NOTARY = 'NOTARY',
  REGISTRAR = 'REGISTRAR',
  WITNESS = 'WITNESS',
  GUARANTOR = 'GUARANTOR',
  REPRESENTATIVE = 'REPRESENTATIVE',
  PROMISSOR = 'PROMISSOR',
  THIRD_PARTY = 'THIRD_PARTY',
  AGENT = 'AGENT',
}

export enum PaymentType {
  COMMISSION_INCOME = 'COMMISSION_INCOME',     // Ingreso por comisión (venta)
  RENT_PAYMENT = 'RENT_PAYMENT',               // Pago de arriendo mensual
  SALE_DOWN_PAYMENT = 'SALE_DOWN_PAYMENT',     // Pie/cuota inicial (venta)
  SALE_INSTALLMENT = 'SALE_INSTALLMENT',       // Cuota mensual (venta)
  SALE_FINAL_PAYMENT = 'SALE_FINAL_PAYMENT',   // Pago final/escritura (venta)
  DEPOSIT = 'DEPOSIT',                         // Depósito/garantía
  MAINTENANCE_FEE = 'MAINTENANCE_FEE',         // Gastos comunes
  UTILITIES = 'UTILITIES',                     // Servicios básicos
  OTHER = 'OTHER',                             // Otro tipo de pago
}

export interface ContractPerson {
  personId: string;
  role: ContractRole;
  personName?: string;
  personDni?: string;
  person?: {
    id: string;
    name?: string;
    dni?: string;
  };
}

export interface ContractPaymentDocument {
  id?: string;
  title?: string;
  status?: DocumentStatus;
  documentType?: {
    id: string;
    name?: string;
  };
  multimediaId?: string;
  multimedia?: {
    id: string;
    url: string;
    filename: string;
  };
  uploadedById?: string;
  createdAt?: string | Date;
  personId?: string;
  person?: {
    id: string;
    name?: string;
    dni?: string;
  };
  personName?: string;
  personDni?: string;
}

export interface ContractPayment {
  id?: string;
  amount: number;
  date: string | Date;
  description?: string;
  type: PaymentType;  // Tipo de pago para categorización
  status?: PaymentStatus;
  paidAt?: string | Date | null;
  isAgencyRevenue?: boolean;
  documents?: ContractPaymentDocument[];
}

export interface ContractDocument {
  documentTypeId: string;
  documentId?: string;
  id?: string;
  personId?: string;        // Persona asociada al documento (opcional)
  person?: {
    id: string;
    name?: string;
    dni?: string;
  };
  personName?: string;
  personDni?: string;
  title: string;            // Descripción/título del documento
  required: boolean;
  uploaded: boolean;
  status?: DocumentStatus;
  notes?: string;
  uploadedById?: string;
  uploadedByName?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  documentType?: {
    id: string;
    name?: string;
  };
  documentTypeName?: string;
  multimediaId?: string;
  multimedia?: {
    id: string;
    url: string;
    filename?: string;
  };
  contractCode?: string;
}

export enum ContractCurrency {
  CLP = 'CLP',
  UF = 'UF',
}

export interface ContractHistoryChange {
  field: string;
  previousValue: unknown;
  newValue: unknown;
}

export interface ContractHistoryEntry {
  id: string;
  timestamp: string;
  userId: string | null;
  action: string;
  changes: ContractHistoryChange[];
  metadata?: Record<string, unknown>;
}

@Entity('contracts')
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  code: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  propertyId: string;

  @Column({
    type: 'enum',
    enum: ContractOperationType,
  })
  operation: ContractOperationType;

  @Column({
    type: 'enum',
    enum: ContractStatus,
    default: ContractStatus.IN_PROCESS,
  })
  status: ContractStatus;

  @Column({ type: 'date', nullable: true })
  endDate: Date | null;

  @Column('int')
  amount: number; // Monto total del contrato en la moneda especificada

  @Column({
    type: 'enum',
    enum: ContractCurrency,
    default: ContractCurrency.CLP,
  })
  currency: ContractCurrency; // Moneda del monto (CLP o UF)

  @Column('float', { nullable: true })
  ufValue: number; // Valor de la UF al momento de crear el contrato (solo si currency es UF)

  @Column('float')
  commissionPercent: number; // Porcentaje de comisión (ej: 3.5 para 3.5%)

  @Column('int')
  commissionAmount: number; // Monto de comisión siempre en CLP (calculado automáticamente)

  @Column({ type: 'json', nullable: true })
  payments: ContractPayment[];

  @Column({ type: 'json', nullable: true })
  documents: ContractDocument[];

  @Column({ type: 'json' })
  people: ContractPerson[];

  @Column({ type: 'json', nullable: true })
  changeHistory: ContractHistoryEntry[];

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Property)
  @JoinColumn({ name: 'propertyId' })
  property: Property;
}
