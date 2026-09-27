import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { RoleEnum } from '@prisma/client';
import { RekomendasiService } from './rekomendasi.service';
import {
  CreateRekomendasiDto,
  UpdateRekomendasiDto,
} from './dto/rekomendasi.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class RekomendasiController {
  constructor(private readonly rekomendasiService: RekomendasiService) {}

  @Post('temuan/:temuanId/rekomendasi')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN)
  async create(
    @Param('temuanId') temuanId: string,
    @Body() dto: CreateRekomendasiDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rekomendasiService.create(temuanId, dto, user);
  }

  @Get('temuan/:temuanId/rekomendasi')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async findByTemuanId(
    @Param('temuanId') temuanId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rekomendasiService.findByTemuanId(temuanId, user);
  }

  @Get('rekomendasi/:id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rekomendasiService.findById(id, user);
  }

  @Patch('rekomendasi/:id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRekomendasiDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rekomendasiService.update(id, dto, user);
  }

  @Delete('rekomendasi/:id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rekomendasiService.delete(id, user);
  }
}
