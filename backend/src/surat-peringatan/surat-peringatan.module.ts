import { Module } from '@nestjs/common';
import { SpDueEngineService } from './sp-due.service';
import { SpPdfGeneratorService } from './sp-pdf.service';
import { SuratPeringatanService } from './surat-peringatan.service';
import { SuratPeringatanController } from './surat-peringatan.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { IrbanModule } from '../irban/irban.module';
import { ExternalModule } from '../external/external.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, IrbanModule, ExternalModule, AuthModule],
  controllers: [SuratPeringatanController],
  providers: [
    SpDueEngineService,
    SpPdfGeneratorService,
    SuratPeringatanService,
  ],
  exports: [SpDueEngineService, SpPdfGeneratorService, SuratPeringatanService],
})
export class SuratPeringatanModule {}
