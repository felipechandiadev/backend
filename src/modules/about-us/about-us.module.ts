import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AboutUs } from '../../entities/about-us.entity';
import { AboutUsService } from './about-us.service';
import { AboutUsController } from './about-us.controller';
import { MultimediaModule } from '../multimedia/multimedia.module';

@Module({
  imports: [TypeOrmModule.forFeature([AboutUs]), MultimediaModule],
  controllers: [AboutUsController],
  providers: [AboutUsService],
  exports: [AboutUsService],
})
export class AboutUsModule {}
