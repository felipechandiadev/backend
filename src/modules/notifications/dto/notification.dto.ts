import {
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsUUID,
  IsArray,
  IsString,
  IsEmail,
} from 'class-validator';
import { NotificationType, NotificationStatus, NotificationSenderType } from '../../../entities/notification.entity';

export class PropertyInterestDto {
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @IsString()
  @IsOptional()
  assignedAgentId?: string;

  @IsString()
  @IsOptional()
  interestedUserId?: string;

  @IsString()
  @IsNotEmpty()
  interestedUserName: string;

  @IsEmail()
  @IsNotEmpty()
  interestedUserEmail: string;

  @IsString()
  @IsNotEmpty()
  interestedUserPhone: string;

  @IsString()
  @IsNotEmpty()
  interestedUserMessage: string;
}

export class CreateNotificationDto {
  @IsEnum(NotificationSenderType)
  @IsNotEmpty()
  senderType: NotificationSenderType;

  @IsString()
  @IsOptional()
  senderId?: string;

  @IsString()
  @IsNotEmpty()
  senderName: string;

  @IsNotEmpty()
  isSystem: boolean;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  targetUserIds: string[];

  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @IsArray()
  @IsEmail({}, { each: true })
  @IsOptional()
  targetMails?: string[];

  @IsEnum(NotificationStatus)
  @IsOptional()
  status?: NotificationStatus;

  @IsString()
  @IsOptional()
  firstViewerId?: string;

  @IsOptional()
  firstViewedAt?: Date;

  @IsUUID('4')
  @IsOptional()
  multimediaId?: string;

  @IsString()
  @IsOptional()
  interestedUserEmail?: string;

  @IsString()
  @IsOptional()
  interestedUserName?: string;

  @IsString()
  @IsOptional()
  interestedUserPhone?: string;

  @IsString()
  @IsOptional()
  interestedUserMessage?: string;
}

export class UpdateNotificationStatusDto {
  @IsEnum(NotificationStatus)
  @IsNotEmpty()
  status: NotificationStatus;
}

export class UpdateNotificationDto {
  @IsEnum(NotificationSenderType)
  @IsOptional()
  senderType?: NotificationSenderType;

  @IsString()
  @IsOptional()
  senderId?: string;

  @IsString()
  @IsOptional()
  senderName?: string;

  @IsOptional()
  isSystem?: boolean;

  @IsString()
  @IsOptional()
  message?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  targetUserIds?: string[];

  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @IsArray()
  @IsEmail({}, { each: true })
  @IsOptional()
  targetMails?: string[];

  @IsEnum(NotificationStatus)
  @IsOptional()
  status?: NotificationStatus;

  @IsString()
  @IsOptional()
  firstViewerId?: string;

  @IsOptional()
  firstViewedAt?: Date;

  @IsUUID('4')
  @IsOptional()
  multimediaId?: string;
}
