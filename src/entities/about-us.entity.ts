import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

@Entity('about_us')
export class AboutUs {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  @IsNotEmpty()
  @IsString()
  bio: string;

  @Column({ type: 'text' })
  @IsNotEmpty()
  @IsString()
  mision: string;

  @Column({ type: 'text' })
  @IsNotEmpty()
  @IsString()
  vision: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  @IsOptional()
  @IsString()
  multimediaUrl?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
