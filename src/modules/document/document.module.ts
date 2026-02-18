import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '../../entities/document.entity';
import { DocumentType } from '../../entities/document-type.entity';
import { User } from '../../entities/user.entity';
import { Person } from '../../entities/person.entity';
import { Multimedia } from '../../entities/multimedia.entity';
import { Payment } from '../../entities/payment.entity';
import { Contract } from '../../entities/contract.entity';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { MultimediaModule } from '../multimedia/multimedia.module';
import { AuthModule } from '../auth/auth.module';
import { JweAuthGuard } from '../../auth/jwe/jwe-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, DocumentType, User, Person, Multimedia, Payment, Contract]),
    MultimediaModule,
    AuthModule,
  ],
  controllers: [DocumentController],
  providers: [DocumentService, JweAuthGuard],
  exports: [DocumentService],
})
export class DocumentModule {}
