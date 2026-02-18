import { IsString, IsOptional } from 'class-validator';

export class UpdateAvatarDto {
  @IsOptional()
  @IsString()
  avatarUrl?: string; // Para respuesta, no para input
}