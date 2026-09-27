import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { RoleEnum } from '@prisma/client';
import { LhpService } from './lhp.service';
import { CreateLhpDto } from './dto/create-lhp.dto';
import { UpdateLhpDto } from './dto/update-lhp.dto';
import { FilterLhpDto } from './dto/filter-lhp.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import type { UploadedMulterFile } from '../files/files.service';

@Controller('lhp')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LhpController {
  constructor(private readonly lhpService: LhpService) {}

  @Post()
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN)
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() dto: CreateLhpDto,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: UploadedMulterFile,
  ) {
    return this.lhpService.create(dto, user, file);
  }

  @Get()
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async findAll(
    @Query() filter: FilterLhpDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.lhpService.findAll(filter, user);
  }

  @Get(':id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.lhpService.findById(id, user);
  }

  @Patch(':id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLhpDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.lhpService.update(id, dto, user);
  }

  @Post(':id/file')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('id') id: string,
    @UploadedFile() file: UploadedMulterFile,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.lhpService.uploadFile(id, file, user);
  }

  @Get(':id/file')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async downloadFile(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const fileInfo = await this.lhpService.getFileForDownload(id, user);
    res.download(fileInfo.absolutePath, fileInfo.filename);
  }
}
