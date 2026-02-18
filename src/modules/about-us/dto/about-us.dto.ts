import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateAboutUsDto {
  @IsNotEmpty()
  @IsString()
  bio: string;

  @IsNotEmpty()
  @IsString()
  mision: string;

  @IsNotEmpty()
  @IsString()
  vision: string;

  @IsOptional()
  @IsString()
  multimediaUrl?: string;
}

export class UpdateAboutUsDto {
  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  mision?: string;

  @IsOptional()
  @IsString()
  vision?: string;

  @IsOptional()
  @IsString()
  multimediaUrl?: string;
}
