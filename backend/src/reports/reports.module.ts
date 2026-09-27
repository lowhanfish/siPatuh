import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { IrbanModule } from '../irban/irban.module';
import { ExternalModule } from '../external/external.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, IrbanModule, ExternalModule, AuthModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
