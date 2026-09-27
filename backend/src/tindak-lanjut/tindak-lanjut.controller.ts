import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { RoleEnum } from '@prisma/client';
import { TindakLanjutService } from './tindak-lanjut.service';
import { CreateTindakLanjutDto } from './dto/tindak-lanjut.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import type { UploadedMulterFile } from '../files/files.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class TindakLanjutController {
  constructor(private readonly tindakLanjutService: TindakLanjutService) {}

  @Post('rekomendasi/:rekomendasiId/tindak-lanjut')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN)
  @UseInterceptors(FilesInterceptor('files', 10))
  async create(
    @Param('rekomendasiId') rekomendasiId: string,
    @Body() dto: CreateTindakLanjutDto,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFiles() files?: UploadedMulterFile[],
  ) {
    return this.tindakLanjutService.create(rekomendasiId, dto, user, files);
  }

  @Get('rekomendasi/:rekomendasiId/tindak-lanjut')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async findByRekomendasiId(
    @Param('rekomendasiId') rekomendasiId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tindakLanjutService.findByRekomendasiId(rekomendasiId, user);
  }

  @Get('rekomendasi/:rekomendasiId/financial-summary')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async getFinancialSummary(
    @Param('rekomendasiId') rekomendasiId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tindakLanjutService.getFinancialSummary(rekomendasiId, user);
  }

  @Get('tindak-lanjut/:id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tindakLanjutService.findById(id, user);
  }

  @Get('tindak-lanjut/:id/files/:attachmentId')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async downloadAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const fileInfo = await this.tindakLanjutService.getAttachmentFile(
      id,
      attachmentId,
      user,
    );
    res.download(fileInfo.absolutePath, fileInfo.filename);
  }
}
