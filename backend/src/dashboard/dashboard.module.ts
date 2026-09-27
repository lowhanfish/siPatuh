import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { IrbanModule } from '../irban/irban.module';
import { ExternalModule } from '../external/external.module';
import { SuratPeringatanModule } from '../surat-peringatan/surat-peringatan.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    IrbanModule,
    ExternalModule,
    SuratPeringatanModule,
    AuthModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
