import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEmail,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SocialMediaItem {
  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  available?: boolean;
}

export class SocialMedia {
  @IsOptional()
  @ValidateNested()
  @Type(() => SocialMediaItem)
  instagram?: SocialMediaItem;

  @IsOptional()
  @ValidateNested()
  @Type(() => SocialMediaItem)
  facebook?: SocialMediaItem;

  @IsOptional()
  @ValidateNested()
  @Type(() => SocialMediaItem)
  linkedin?: SocialMediaItem;

  @IsOptional()
  @ValidateNested()
  @Type(() => SocialMediaItem)
  youtube?: SocialMediaItem;
}

export class Partnership {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;
}

export class FAQItem {
  @IsNotEmpty()
  @IsString()
  question: string;

  @IsNotEmpty()
  @IsString()
  answer: string;
}

@Entity('identities')
export class Identity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  @IsNotEmpty()
  @IsString()
  name: string;

  @Column({ type: 'text' })
  @IsNotEmpty()
  @IsString()
  address: string;

  @Column({ type: 'varchar', length: 20 })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @Column({ type: 'varchar', length: 255 })
  @IsNotEmpty()
  @IsEmail()
  mail: string;

  @Column({ type: 'text' })
  @IsNotEmpty()
  @IsString()
  businessHours: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  @IsOptional()
  @IsString()
  urlLogo?: string;

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => SocialMedia)
  socialMedia?: SocialMedia;

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Partnership)
  partnerships?: Partnership[];

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FAQItem)
  faqs?: FAQItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
