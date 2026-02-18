import { Module } from '@nestjs/common';
import { PredictController } from './predict.controller';
import { PredictService } from './predict.service';

@Module({
  controllers: [PredictController],
  providers: [PredictService],
  exports: [PredictService],
})
export class PredictModule {}
