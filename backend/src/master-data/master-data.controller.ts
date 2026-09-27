import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { RoleEnum } from '@prisma/client';
import { MasterDataService } from './master-data.service';
import {
  CreateJenisPemeriksaanDto,
  UpdateJenisPemeriksaanDto,
  CreateStatusRekomendasiDto,
  UpdateStatusRekomendasiDto,
  CreateSuratTemplateDto,
  UpdateSuratTemplateDto,
} from './dto/master-data.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Controller('master-data')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  // ==========================================
  // JENIS PEMERIKSAAN
  // ==========================================

  @Get('jenis-pemeriksaan')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async findAllJenisPemeriksaan(@Query('active_only') activeOnly?: string) {
    return this.masterDataService.findAllJenisPemeriksaan(
      activeOnly === 'true',
    );
  }

  @Get('jenis-pemeriksaan/:id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async findJenisPemeriksaanById(@Param('id') id: string) {
    return this.masterDataService.findJenisPemeriksaanById(id);
  }

  @Post('jenis-pemeriksaan')
  @Roles(RoleEnum.SUPER_ADMIN)
  async createJenisPemeriksaan(
    @Body() dto: CreateJenisPemeriksaanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.masterDataService.createJenisPemeriksaan(dto, user);
  }

  @Patch('jenis-pemeriksaan/:id')
  @Roles(RoleEnum.SUPER_ADMIN)
  async updateJenisPemeriksaan(
    @Param('id') id: string,
    @Body() dto: UpdateJenisPemeriksaanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.masterDataService.updateJenisPemeriksaan(id, dto, user);
  }

  // ==========================================
  // STATUS REKOMENDASI
  // ==========================================

  @Get('status-rekomendasi')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async findAllStatusRekomendasi(@Query('active_only') activeOnly?: string) {
    return this.masterDataService.findAllStatusRekomendasi(
      activeOnly === 'true',
    );
  }

  @Get('status-rekomendasi/:id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async findStatusRekomendasiById(@Param('id') id: string) {
    return this.masterDataService.findStatusRekomendasiById(id);
  }

  @Post('status-rekomendasi')
  @Roles(RoleEnum.SUPER_ADMIN)
  async createStatusRekomendasi(
    @Body() dto: CreateStatusRekomendasiDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.masterDataService.createStatusRekomendasi(dto, user);
  }

  @Patch('status-rekomendasi/:id')
  @Roles(RoleEnum.SUPER_ADMIN)
  async updateStatusRekomendasi(
    @Param('id') id: string,
    @Body() dto: UpdateStatusRekomendasiDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.masterDataService.updateStatusRekomendasi(id, dto, user);
  }

  // ==========================================
  // SURAT TEMPLATES
  // ==========================================

  @Get('surat-templates')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async findAllSuratTemplates(@Query('jenis_surat') jenisSurat?: string) {
    return this.masterDataService.findAllSuratTemplates(jenisSurat);
  }

  @Get('surat-templates/:id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async findSuratTemplateById(@Param('id') id: string) {
    return this.masterDataService.findSuratTemplateById(id);
  }

  @Post('surat-templates')
  @Roles(RoleEnum.SUPER_ADMIN)
  async createSuratTemplate(
    @Body() dto: CreateSuratTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.masterDataService.createSuratTemplate(dto, user);
  }

  @Patch('surat-templates/:id')
  @Roles(RoleEnum.SUPER_ADMIN)
  async updateSuratTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateSuratTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.masterDataService.updateSuratTemplate(id, dto, user);
  }
}
