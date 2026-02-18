import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DocumentType } from './document-type.entity';
import { Multimedia } from './multimedia.entity';
import { User } from './user.entity';
import { Contract } from './contract.entity';
import { Payment } from './payment.entity';
import { Person } from './person.entity';

export enum DocumentStatus {
  PENDING = 'PENDING',
  UPLOADED = 'UPLOADED',
  RECIBIDO = 'RECIBIDO',
  REJECTED = 'REJECTED',
}

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string; // Título del documento

  @ManyToOne(() => DocumentType)
  @JoinColumn({ name: 'documentTypeId' })
  documentType: DocumentType;

  @Column({ type: 'uuid' })
  documentTypeId: string;

  @ManyToOne(() => Multimedia, { nullable: true })
  @JoinColumn({ name: 'multimediaId' })
  multimedia?: Multimedia;

  @Column({ type: 'uuid', nullable: true })
  multimediaId?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User;

  @Column({ type: 'uuid' })
  uploadedById: string;

  @ManyToOne(() => Person, { nullable: true })
  @JoinColumn({ name: 'personId' })
  person?: Person;

  @Column({ type: 'uuid', nullable: true })
  personId?: string;

  @ManyToOne(() => Contract, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contractId' })
  contract?: Contract;

  @Column({ type: 'uuid', nullable: true })
  contractId?: string;

  @ManyToOne(() => Payment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'paymentId' })
  payment?: Payment;

  @Column({ type: 'uuid', nullable: true })
  paymentId?: string;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.PENDING,
  })
  status: DocumentStatus;

  @Column({ nullable: true })
  notes?: string; // Notas adicionales

  @Column({ type: 'boolean', default: false })
  required: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
