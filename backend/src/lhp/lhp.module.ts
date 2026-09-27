import { Module } from '@nestjs/common';
import { LhpService } from './lhp.service';
import { LhpController } from './lhp.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ExternalModule } from '../external/external.module';
import { IrbanModule } from '../irban/irban.module';
import { FilesModule } from '../files/files.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, ExternalModule, IrbanModule, FilesModule, AuthModule],
  controllers: [LhpController],
  providers: [LhpService],
  exports: [LhpService],
})
export class LhpModule {}
