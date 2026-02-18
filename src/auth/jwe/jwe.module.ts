import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JweService } from './jwe.service';

@Module({
  imports: [ConfigModule],
  providers: [JweService],
  exports: [JweService],
})
export class JweModule {}
