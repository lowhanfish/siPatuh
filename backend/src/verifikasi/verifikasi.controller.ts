import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { RoleEnum } from '@prisma/client';
import { VerifikasiService } from './verifikasi.service';
import { CreateVerifikasiDto } from './dto/create-verifikasi.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import type { UploadedMulterFile } from '../files/files.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class VerifikasiController {
  constructor(private readonly verifikasiService: VerifikasiService) {}

  @Post('tindak-lanjut/:tindakLanjutId/verifikasi')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN)
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Param('tindakLanjutId') tindakLanjutId: string,
    @Body() dto: CreateVerifikasiDto,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: UploadedMulterFile,
  ) {
    return this.verifikasiService.create(tindakLanjutId, dto, user, file);
  }

  @Get('tindak-lanjut/:tindakLanjutId/verifikasi')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async findByTindakLanjutId(
    @Param('tindakLanjutId') tindakLanjutId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.verifikasiService.findByTindakLanjutId(tindakLanjutId, user);
  }

  @Get('verifikasi/:id/files/:attachmentId')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async downloadAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const fileInfo = await this.verifikasiService.getAttachmentFile(
      id,
      attachmentId,
      user,
    );
    res.download(fileInfo.absolutePath, fileInfo.filename);
  }
}
