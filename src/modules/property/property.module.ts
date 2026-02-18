import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property } from '../../entities/property.entity';
import { PropertyController } from './property.controller';
import { PropertyService } from './property.service';
import { User } from '../../entities/user.entity';
import { PropertyType } from '../../entities/property-type.entity';
import { Multimedia } from '../../entities/multimedia.entity';
import { AuditModule } from '../../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MultimediaModule } from '../multimedia/multimedia.module';
import { FileUploadService } from '../../common/services/file-upload.service';

@Module({
  imports: [TypeOrmModule.forFeature([Property, User, Multimedia, PropertyType]), AuditModule, NotificationsModule, MultimediaModule, AuthModule],
  controllers: [PropertyController],
  providers: [PropertyService, FileUploadService],
  exports: [PropertyService],
})
export class PropertyModule {}
