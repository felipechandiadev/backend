import { Expose } from 'class-transformer';
import { UserRole, UserStatus } from '../../../entities/user.entity';

export class UserProfileResponseDto {
  @Expose()
  id: string;

  @Expose()
  username: string;

  @Expose()
  email: string;

  @Expose()
  personalInfo: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatarUrl?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    profession?: string;
    company?: string;
    nationality?: string;
    gender?: string;
    maritalStatus?: string;
  };

  @Expose()
  person?: {
    id: string;
    dni?: string;
    address?: string;
    phone?: string;
    email?: string;
    dniCardFrontUrl?: string;
    dniCardRearUrl?: string;
    verified: boolean;
  };

  @Expose()
  role: UserRole;

  @Expose()
  status: UserStatus;

  @Expose()
  lastLogin?: Date;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}