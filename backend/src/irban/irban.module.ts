import { Module } from '@nestjs/common';
import { IrbanService } from './irban.service';
import { IrbanController } from './irban.controller';
import { IrbanScopeService } from './irban-scope.service';
import { UnitKerjaService } from './unit-kerja.service';
import { UnitKerjaController } from './unit-kerja.controller';
import { PejabatService } from './pejabat.service';
import { PejabatController } from './pejabat.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ExternalModule } from '../external/external.module';

@Module({
  imports: [PrismaModule, AuthModule, ExternalModule],
  controllers: [IrbanController, UnitKerjaController, PejabatController],
  providers: [
    IrbanService,
    IrbanScopeService,
    UnitKerjaService,
    PejabatService,
  ],
  exports: [IrbanService, IrbanScopeService, UnitKerjaService, PejabatService],
})
export class IrbanModule {}
