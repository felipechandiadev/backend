import { IsEmail, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class SendEmailDto {
  @IsEmail()
  to: string;

  @IsNotEmpty()
  subject: string;

  @IsOptional()
  html?: string;

  @IsOptional()
  text?: string;

  @IsOptional()
  @IsObject()
  templateVariables?: Record<string, string>;
}
