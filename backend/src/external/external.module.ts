import { Module } from '@nestjs/common';
import { SimpegAdapter } from './simpeg/simpeg.adapter';
import { EgovAdapter } from './egov/egov.adapter';

@Module({
  providers: [SimpegAdapter, EgovAdapter],
  exports: [SimpegAdapter, EgovAdapter],
})
export class ExternalModule {}
