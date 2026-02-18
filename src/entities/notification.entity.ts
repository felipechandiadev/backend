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
import { User } from './user.entity';
import { Multimedia } from './multimedia.entity';

export enum NotificationType {
  INTEREST = 'INTEREST',
  CONTACT = 'CONTACT',
  PAYMENT_RECEIPT = 'PAYMENT_RECEIPT',
  PAYMENT_OVERDUE = 'PAYMENT_OVERDUE',
  PUBLICATION_STATUS_CHANGE = 'PUBLICATION_STATUS_CHANGE',
  CONTRACT_STATUS_CHANGE = 'CONTRACT_STATUS_CHANGE',
  PROPERTY_AGENT_ASSIGNMENT = 'PROPERTY_AGENT_ASSIGNMENT',
  PROPERTY_PUBLICATION_REQUEST = 'PROPERTY_PUBLICATION_REQUEST',
}

export enum NotificationStatus {
  SEND = 'SEND',
  OPEN = 'OPEN',
}

export enum NotificationSenderType {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
  ANONYMOUS = 'ANONYMOUS',
}

export interface NotificationTarget {
  targetUserIds: string[];
  targetMails?: string[];
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: NotificationSenderType, default: NotificationSenderType.SYSTEM })
  senderType: NotificationSenderType;

  @Column({ type: 'varchar', nullable: true })
  senderId: string | null;

  @Column({ type: 'varchar' })
  senderName: string;

  @Column({ type: 'boolean', default: false })
  isSystem: boolean;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'json' })
  targetUserIds: string[];

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'json', nullable: true })
  targetMails: string[];

  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.SEND })
  status: NotificationStatus;

  @Column({ type: 'varchar', nullable: true })
  interestedUserEmail: string | null;

  @Column({ type: 'varchar', nullable: true })
  interestedUserName: string | null;

  @Column({ type: 'varchar', nullable: true })
  interestedUserPhone: string | null;

  @Column({ type: 'text', nullable: true })
  interestedUserMessage: string | null;

  @Column({ type: 'varchar', nullable: true })
  firstViewerId: string | null;

  @Column({ type: 'datetime', nullable: true })
  firstViewedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  // Relations
  @ManyToOne(() => Multimedia)
  @JoinColumn({ name: 'multimediaId' })
  multimedia: Multimedia;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'viewerId' })
  viewer: User;
}
