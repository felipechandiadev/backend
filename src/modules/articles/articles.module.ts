import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from '../../entities/article.entity';
import { ArticlesService } from './articles.service';
import { ArticlesController } from './articles.controller';
import { MultimediaModule } from '../multimedia/multimedia.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Article]),
    MultimediaModule,
  ],
  controllers: [ArticlesController],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
