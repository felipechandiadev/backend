import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlideService } from './slide.service';
import { SlideController } from './slide.controller';
import { Slide } from '../../entities/slide.entity';
import { Multimedia } from '../../entities/multimedia.entity';
import { AuthModule } from '../auth/auth.module';
import { MultimediaModule } from '../multimedia/multimedia.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Slide, Multimedia]),
    AuthModule,
    MultimediaModule
  ],
  controllers: [SlideController],
  providers: [SlideService],
  exports: [SlideService],
})
export class SlideModule {}