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
import { TemuanService } from './temuan.service';
import { CreateTemuanDto, UpdateTemuanDto } from './dto/temuan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class TemuanController {
  constructor(private readonly temuanService: TemuanService) {}

  @Post('lhp/:lhpId/temuan')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN)
  async create(
    @Param('lhpId') lhpId: string,
    @Body() dto: CreateTemuanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.temuanService.create(lhpId, dto, user);
  }

  @Get('lhp/:lhpId/temuan')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async findByLhpId(
    @Param('lhpId') lhpId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.temuanService.findByLhpId(lhpId, user);
  }

  @Get('temuan/:id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.temuanService.findById(id, user);
  }

  @Patch('temuan/:id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTemuanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.temuanService.update(id, dto, user);
  }

  @Delete('temuan/:id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.temuanService.delete(id, user);
  }
}
