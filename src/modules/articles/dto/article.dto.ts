import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { ArticleCategory } from '../../../entities/article.entity';

export class CreateArticleDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsNotEmpty()
  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  multimediaUrl?: string;

  @IsNotEmpty()
  @IsEnum(ArticleCategory)
  category: ArticleCategory;
}

export class UpdateArticleDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  multimediaUrl?: string;

  @IsOptional()
  @IsEnum(ArticleCategory)
  category?: ArticleCategory;
}
