import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { MultimediaService } from './multimedia.service';
import { MultimediaController } from './multimedia.controller';
import { Multimedia } from '../../entities/multimedia.entity';
import { MultimediaController as UploadMultimediaController } from './controllers/multimedia.controller';
import { MultimediaService as UploadMultimediaService } from './services/multimedia.service';
import { StaticFilesService } from './services/static-files.service';
import { CloudflareStorageService } from './services/cloudflare-storage.service';
import { UploadConfigService } from '../../config/upload.config';

@Module({
  imports: [TypeOrmModule.forFeature([Multimedia]), ConfigModule],
  controllers: [MultimediaController, UploadMultimediaController],
  providers: [
    MultimediaService,
    UploadMultimediaService,
    StaticFilesService,
    CloudflareStorageService,
    UploadConfigService,
  ],
  exports: [
    MultimediaService,
    UploadMultimediaService,
    StaticFilesService,
    CloudflareStorageService,
    UploadConfigService,
  ],
})
export class MultimediaModule {}
