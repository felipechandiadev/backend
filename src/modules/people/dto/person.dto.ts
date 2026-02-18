import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEmail,
  IsBoolean,
  IsUUID,
  IsDateString,
  IsPhoneNumber,
} from 'class-validator';

export class CreatePersonDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  dni?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsPhoneNumber()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsBoolean()
  @IsOptional()
  verified?: boolean;

  @IsDateString()
  @IsOptional()
  verificationRequest?: Date;

  @IsUUID()
  @IsOptional()
  dniCardFrontId?: string;

  @IsUUID()
  @IsOptional()
  dniCardRearId?: string;

  @IsUUID()
  @IsOptional()
  userId?: string;
}

export class UpdatePersonDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  dni?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsPhoneNumber()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsBoolean()
  @IsOptional()
  verified?: boolean;

  @IsDateString()
  @IsOptional()
  verificationRequest?: Date;

  @IsUUID()
  @IsOptional()
  dniCardFrontId?: string;

  @IsUUID()
  @IsOptional()
  dniCardRearId?: string;

  @IsUUID()
  @IsOptional()
  userId?: string;
}

export class LinkUserDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;
}
