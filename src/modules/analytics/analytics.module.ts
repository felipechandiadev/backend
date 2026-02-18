import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Property } from '../../entities/property.entity';
import { Contract } from '../../entities/contract.entity';
import { User } from '../../entities/user.entity';
import { Payment } from '../../entities/payment.entity';

@Module({
  imports: [
    // Add Payment repository for revenue aggregations
    TypeOrmModule.forFeature([Property, Contract, User, Payment]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}