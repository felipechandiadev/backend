import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsUUID,
  ValidateNested,
  IsArray,
  IsBoolean,
  IsDate,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { User } from './user.entity';
import { PropertyStatus } from '../common/enums/property-status.enum';
import { PropertyOperationType } from '../common/enums/property-operation-type.enum';
import {
  PostRequest,
  ChangeHistoryEntry,
  ViewEntry,
  LeadEntry,
} from '../common/interfaces/property.interfaces';
import { Multimedia } from './multimedia.entity';
import { RegionEnum } from '../common/regions/regions.enum';
import { ComunaEnum } from '../common/regions/comunas.enum';
import { PropertyType } from './property-type.entity';

export enum CurrencyPriceEnum {
  CLP = 'CLP',
  UF = 'UF',
}

@Entity('properties')
export class Property {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  // Property Code (auto-generated)
  @Column({ type: 'varchar', length: 20, unique: true })
  @IsOptional()
  @IsString()
  code: string;

  // Basic Information
  @Column({ type: 'varchar', length: 255 })
  @IsNotEmpty()
  @IsString()
  title: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Column({
    type: 'enum',
    enum: PropertyStatus,
    default: PropertyStatus.REQUEST,
  })
  @IsNotEmpty()
  @IsEnum(PropertyStatus)
  status: PropertyStatus;

  @Column({
    type: 'enum',
    enum: PropertyOperationType,
  })
  @IsNotEmpty()
  @IsEnum(PropertyOperationType)
  operationType: PropertyOperationType;

  // Users Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'creatorUserId' })
  creatorUser: User;

  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  creatorUserId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignedAgentId' })
  assignedAgent?: User;

  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  assignedAgentId?: string;

  // Pricing Information
  @Column({ type: 'float', default: 0 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @Column({
    type: 'enum',
    enum: CurrencyPriceEnum,
    default: CurrencyPriceEnum.CLP,
  })
  @IsNotEmpty()
  @IsEnum(CurrencyPriceEnum)
  currencyPrice: CurrencyPriceEnum;

  // SEO Information
  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  @IsOptional()
  @IsString()
  seoDescription?: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  seoKeywords?: string;

  // Publication Information
  @Column({ type: 'datetime', nullable: true })
  @IsOptional()
  @IsDate()
  publicationDate?: Date;

  @Column({ type: 'boolean', default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  // Physical Characteristics
  @ManyToOne(() => PropertyType, { nullable: true })
  @JoinColumn({ name: 'propertyTypeId' })
  propertyType?: PropertyType;

  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  propertyTypeId?: string;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  builtSquareMeters?: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  landSquareMeters?: number;

  @Column({ type: 'int', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bedrooms?: number;

  @Column({ type: 'int', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bathrooms?: number;

  @Column({ type: 'int', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  parkingSpaces?: number;

  @Column({ type: 'int', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  floors?: number;

  @Column({ type: 'int', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  constructionYear?: number;

  // Location Information
  @Column({ type: 'enum', enum: RegionEnum, nullable: true })
  @IsOptional()
  @IsEnum(RegionEnum)
  state?: RegionEnum; // Renamed from 'region'

  @Column({ type: 'enum', enum: ComunaEnum, nullable: true })
  @IsOptional()
  @IsEnum(ComunaEnum)
  city?: ComunaEnum; // Renamed from 'commune'

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  address?: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  // Multimedia (OneToMany relation to Multimedia table)
  @OneToMany(() => Multimedia, (m) => m.property, { cascade: true })
  @IsOptional()
  multimedia?: Multimedia[];

  @Column({ type: 'varchar', length: 500, nullable: true })
  @IsOptional()
  @IsString()
  mainImageUrl?: string;

  // Business Logic Fields
  @Column({ type: 'json', nullable: true })
  @IsOptional()
  postRequest?: PostRequest;

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  @IsArray()
  changeHistory?: ChangeHistoryEntry[];

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  @IsArray()
  views?: ViewEntry[];

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  @IsArray()
  leads?: LeadEntry[];

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  @IsArray()
  favorites?: Array<{ userId: string; addedAt: Date }>;

  // Internal Notes
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  internalNotes?: string;

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date; // This is already configured as a soft delete column

  @Column({ type: 'datetime', nullable: true })
  @IsOptional()
  @IsDate()
  publishedAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  @IsOptional()
  @IsDate()
  lastModifiedAt?: Date;


}
