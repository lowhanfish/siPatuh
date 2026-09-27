import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { RoleEnum } from '@prisma/client';
import { SpDueEngineService } from './sp-due.service';
import { SuratPeringatanService } from './surat-peringatan.service';
import {
  CreateSuratPeringatanDto,
  QuerySuratPeringatanDto,
  UpdateSuratPeringatanDto,
} from './dto/create-surat-peringatan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Controller('surat-peringatan')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuratPeringatanController {
  constructor(
    private readonly spDueEngine: SpDueEngineService,
    private readonly suratPeringatanService: SuratPeringatanService,
  ) {}

  @Get('due')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async getDueLhps(
    @Query('irban_id') irbanId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.spDueEngine.findDueLhps(user, irbanId);
  }

  @Get('due/:lhpId')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async evaluateLhp(
    @Param('lhpId') lhpId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.spDueEngine.evaluateLhp(lhpId, user);
  }

  @Post()
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN)
  async create(
    @Body() dto: CreateSuratPeringatanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.suratPeringatanService.create(dto, user);
  }

  @Get()
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async findAll(
    @Query() query: QuerySuratPeringatanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.suratPeringatanService.findAll(query, user);
  }

  @Get(':id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.suratPeringatanService.findById(id, user);
  }

  @Get(':id/draft')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async getDraftPdf(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const fileInfo = await this.suratPeringatanService.getDraftFileStream(
      id,
      user,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${fileInfo.filename}"`,
    );
    res.setHeader('Content-Length', fileInfo.size);
    fileInfo.stream.pipe(res);
  }

  @Patch(':id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSuratPeringatanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.suratPeringatanService.update(id, dto, user);
  }

  @Post(':id/regenerate-draft')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN)
  async regenerateDraft(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.suratPeringatanService.regenerateDraft(id, user);
  }

  @Delete(':id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.suratPeringatanService.delete(id, user);
  }
}
