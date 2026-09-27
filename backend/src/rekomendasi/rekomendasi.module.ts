import { Module } from '@nestjs/common';
import { RekomendasiService } from './rekomendasi.service';
import { RekomendasiController } from './rekomendasi.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { IrbanModule } from '../irban/irban.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, IrbanModule, AuthModule],
  controllers: [RekomendasiController],
  providers: [RekomendasiService],
  exports: [RekomendasiService],
})
export class RekomendasiModule {}
