import { Module, Global } from '@nestjs/common';
import { FilesService } from './files.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
