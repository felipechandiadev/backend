import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
} from 'class-validator';
import { PersonalInfo } from '../common/interfaces/user.interfaces';
import { UserFavoriteData } from '../common/interfaces/user-favorites.interface';
import * as bcrypt from 'bcrypt';
import { Property } from './property.entity';
import { Contract } from './contract.entity';
import { Document } from './document.entity';
import { Notification } from './notification.entity';
import { Article } from './article.entity';
import { Testimonial } from './testimonial.entity';
import { Person } from './person.entity';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  VACATION = 'VACATION',
  LEAVE = 'LEAVE',
}

export enum UserRole {
  ADMIN = 'ADMIN',
  AGENT = 'AGENT',
  COMMUNITY = 'COMMUNITY',
}

export enum Permission {
  MANAGE_USERS = 'MANAGE_USERS',
  MANAGE_AGENTS = 'MANAGE_AGENTS',
  MANAGE_ADMINS = 'MANAGE_ADMINS',
  MANAGE_PROPERTIES = 'MANAGE_PROPERTIES',
  ASSIGN_PROPERTY_AGENT = 'ASSIGN_PROPERTY_AGENT',
  MANAGE_CONTRACTS = 'MANAGE_CONTRACTS',
  MANAGE_NOTIFICATIONS = 'MANAGE_NOTIFICATIONS',
  MANAGE_MULTIMEDIA = 'MANAGE_MULTIMEDIA',
  MANAGE_DOCUMENT_TYPES = 'MANAGE_DOCUMENT_TYPES',
  MANAGE_PROPERTY_TYPES = 'MANAGE_PROPERTY_TYPES',
  MANAGE_ARTICLES = 'MANAGE_ARTICLES',
  MANAGE_TESTIMONIALS = 'MANAGE_TESTIMONIALS',
  VIEW_REPORTS = 'VIEW_REPORTS',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @IsNotEmpty()
  @IsString()
  username: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @Column({ type: 'varchar', length: 255 })
  @IsNotEmpty()
  @IsString()
  password: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  @IsNotEmpty()
  @IsEnum(UserStatus)
  status: UserStatus;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.COMMUNITY,
  })
  @IsNotEmpty()
  @IsEnum(UserRole)
  role: UserRole;

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  permissions?: Permission[];

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  personalInfo?: PersonalInfo;

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  favoriteProperties?: UserFavoriteData[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastLogin?: Date;

  @Column({ type: 'uuid', nullable: true })
  personId?: string;

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ type: 'varchar', nullable: true })
  emailVerificationToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  emailVerificationExpires?: Date;

  // Relaciones navegables (OneToMany)
  @OneToMany(() => Property, (p) => p.creatorUser)
  createdProperties?: Property[];

  @OneToMany(() => Property, (p) => p.assignedAgent)
  assignedProperties?: Property[];

  @OneToMany(() => Contract, (c) => c.user)
  agentContracts?: Contract[];

  // buyerContracts & sellerContracts are modeled via Contract.people JSON in the current schema,
  // keep placeholder relations if in future Contract stores explicit buyerId/sellerId
  @OneToMany(() => Contract, (c) => c.property)
  buyerContracts?: Contract[];

  @OneToMany(() => Contract, (c) => c.property)
  sellerContracts?: Contract[];

  @OneToMany(() => Document, (d) => d.uploadedBy)
  uploadedDocuments?: Document[];

  @OneToMany(() => Notification, (n) => n.viewer)
  notifications?: Notification[];

  @OneToMany(() => Article, (a) => a.id)
  articles?: Article[];

  @OneToMany(() => Testimonial, (t) => t.id)
  testimonials?: Testimonial[];

  // Relación con Person
  @OneToOne(() => Person, { nullable: true })
  @JoinColumn({ name: 'personId' })
  person?: Person;

  // Authentication methods
  async setPassword(plainPassword: string): Promise<void> {
    this.password = await bcrypt.hash(plainPassword, 12);
  }

  async validatePassword(plainPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, this.password);
  }

  get name(): string {
    if (this.personalInfo?.firstName && this.personalInfo?.lastName) {
      return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
    }
    return this.username;
  }
}
