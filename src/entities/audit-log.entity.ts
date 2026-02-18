import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import {
  AuditAction,
  AuditEntityType,
  RequestSource,
} from '../common/enums/audit.enums';

@Entity('audit_logs')
@Index(['userId', 'createdAt'])
@Index(['entityType', 'entityId'])
@Index(['action', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  @Index()
  userId: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({
    type: 'enum',
    enum: AuditEntityType,
  })
  entityType: AuditEntityType;

  @Column('uuid', { nullable: true })
  @Index()
  entityId: string | null;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'json', nullable: true })
  metadata: any;

  @Column({ type: 'json', nullable: true })
  oldValues: any;

  @Column({ type: 'json', nullable: true })
  newValues: any;

  @Column({ type: 'boolean', default: true })
  success: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  errorMessage: string | null;

  @Column({
    type: 'enum',
    enum: RequestSource,
    default: RequestSource.USER,
  })
  source: RequestSource;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
