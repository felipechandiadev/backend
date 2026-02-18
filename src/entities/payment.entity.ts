import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { Contract } from './contract.entity';
import { Document } from './document.entity';

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

export enum PaymentStatus {
  PENDING = 'PENDING',     // Pendiente de pago
  PAID = 'PAID',          // Pagado/Completado
  CANCELLED = 'CANCELLED', // Cancelado
  PENDING_VERIFICATION = 'PENDING_VERIFICATION', // Pago realizado, pendiente de verificación por admin
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: PaymentType,
    default: PaymentType.OTHER,
  })
  type: PaymentType;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ type: 'datetime', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'boolean', default: false })
  isAgencyRevenue: boolean;

  @ManyToOne(() => Contract, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contractId' })
  contract: Contract;

  @Column({ type: 'uuid' })
  contractId: string;

  @OneToMany(() => Document, (document) => document.payment, { cascade: true })
  documents?: Document[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
