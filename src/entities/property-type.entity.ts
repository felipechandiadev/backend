import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('property_types')
export class PropertyType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: false })
  hasBedrooms: boolean;

  @Column({ default: false })
  hasBathrooms: boolean;

  @Column({ default: false })
  hasBuiltSquareMeters: boolean;

  @Column({ default: false })
  hasLandSquareMeters: boolean;

  @Column({ default: false })
  hasParkingSpaces: boolean;

  @Column({ default: false })
  hasFloors: boolean;

  @Column({ default: false })
  hasConstructionYear: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
