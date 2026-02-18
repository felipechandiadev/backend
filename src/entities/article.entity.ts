import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';

export enum ArticleCategory {
  COMPRAR = 'Comprar',
  ARRENDAR = 'Arrendar',
  INVERSION = 'Inversión',
  DECORACION = 'Decoración',
  MERCADO = 'Mercado',
}

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @IsNotEmpty()
  @IsString()
  title: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @Column({ type: 'text' })
  @IsNotEmpty()
  @IsString()
  text: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  @IsOptional()
  @IsString()
  multimediaUrl?: string;

  @Column({
    type: 'enum',
    enum: ArticleCategory,
  })
  @IsNotEmpty()
  @IsEnum(ArticleCategory)
  category: ArticleCategory;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
