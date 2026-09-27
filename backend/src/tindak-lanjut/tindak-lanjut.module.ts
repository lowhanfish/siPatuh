import { Module } from '@nestjs/common';
import { TindakLanjutService } from './tindak-lanjut.service';
import { TindakLanjutController } from './tindak-lanjut.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { IrbanModule } from '../irban/irban.module';
import { FilesModule } from '../files/files.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, IrbanModule, FilesModule, AuthModule],
  controllers: [TindakLanjutController],
  providers: [TindakLanjutService],
  exports: [TindakLanjutService],
})
export class TindakLanjutModule {}
