import { Module } from '@nestjs/common';
import { SimpegAdapter } from './simpeg/simpeg.adapter';
import { EgovAdapter } from './egov/egov.adapter';
import { TteClient } from './tte/tte.client';

@Module({
  providers: [SimpegAdapter, EgovAdapter, TteClient],
  exports: [SimpegAdapter, EgovAdapter, TteClient],
})
export class ExternalModule {}
