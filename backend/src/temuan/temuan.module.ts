import { Module } from '@nestjs/common';
import { TemuanService } from './temuan.service';
import { TemuanController } from './temuan.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { IrbanModule } from '../irban/irban.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, IrbanModule, AuthModule],
  controllers: [TemuanController],
  providers: [TemuanService],
  exports: [TemuanService],
})
export class TemuanModule {}
