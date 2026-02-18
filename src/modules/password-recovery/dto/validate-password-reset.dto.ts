import { IsNotEmpty, IsString } from 'class-validator';

export class ValidatePasswordResetDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}
