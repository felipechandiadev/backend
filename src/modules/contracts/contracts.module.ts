import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { Contract } from '../../entities/contract.entity';
import { Payment } from '../../entities/payment.entity';
import { Document } from '../../entities/document.entity';
import { Person } from '../../entities/person.entity';
import { User } from '../../entities/user.entity';
import { Multimedia } from '../../entities/multimedia.entity';
import { Property } from '../../entities/property.entity';
import { DocumentTypesModule } from '../document-types/document-types.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contract, Payment, Document, Person, User, Multimedia, Property]),
    DocumentTypesModule,
    NotificationsModule,
  ],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
