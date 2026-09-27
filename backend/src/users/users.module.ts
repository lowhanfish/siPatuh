import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ExternalModule } from '../external/external.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, ExternalModule, AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
