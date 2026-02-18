import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { User } from './user.entity';
import { Multimedia } from './multimedia.entity';

@Entity('people')
export class Person {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  name: string;

  @Column({ unique: true, nullable: true })
  dni: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  email: string;

  @Column({ default: false })
  verified: boolean = false;

  @Column({ type: 'date', nullable: true })
  verificationRequest: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  // Relations
  @OneToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @ManyToOne(() => Multimedia)
  @JoinColumn({ name: 'dniCardFrontId' })
  dniCardFront: Multimedia;

  @Column({ type: 'uuid', nullable: true })
  dniCardFrontId: string;

  @ManyToOne(() => Multimedia)
  @JoinColumn({ name: 'dniCardRearId' })
  dniCardRear: Multimedia;

  @Column({ type: 'uuid', nullable: true })
  dniCardRearId: string;
}
