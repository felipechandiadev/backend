import { IsEmail, IsString, IsOptional, IsObject } from 'class-validator';

export class SendMailDto {
  @IsEmail()
  to: string;

  @IsString()
  subject: string;

  @IsString()
  template: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class MailConfigDto {
  @IsOptional()
  @IsString()
  template?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  sendToInterested?: boolean;

  @IsOptional()
  sendToAdmins?: boolean;

  @IsOptional()
  sendToAgent?: boolean;
}