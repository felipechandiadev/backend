import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertyTypesService } from './property-types.service';
import { PropertyTypesController } from './property-types.controller';
import { PropertyType } from '../../entities/property-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PropertyType])],
  controllers: [PropertyTypesController],
  providers: [PropertyTypesService],
  exports: [PropertyTypesService],
})
export class PropertyTypesModule {}
