import { Module } from '@nestjs/common';
import { JoseWrapperService } from './jose-wrapper.service';

@Module({
  providers: [JoseWrapperService],
  exports: [JoseWrapperService],
})
export class JoseWrapperModule {}
