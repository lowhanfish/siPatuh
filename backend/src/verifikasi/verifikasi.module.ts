import { Module } from '@nestjs/common';
import { VerifikasiService } from './verifikasi.service';
import { VerifikasiController } from './verifikasi.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { IrbanModule } from '../irban/irban.module';
import { FilesModule } from '../files/files.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, IrbanModule, FilesModule, AuthModule],
  controllers: [VerifikasiController],
  providers: [VerifikasiService],
  exports: [VerifikasiService],
})
export class VerifikasiModule {}
