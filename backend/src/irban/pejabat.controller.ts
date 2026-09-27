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
} from '@nestjs/common';
import { RoleEnum } from '@prisma/client';
import { PejabatService } from './pejabat.service';
import { CreatePejabatDto, UpdatePejabatDto } from './dto/pejabat.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Controller('pejabat')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PejabatController {
  constructor(private readonly pejabatService: PejabatService) {}

  @Get()
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async findAll(
    @Query('simpeg_unit_kerja_id') simpegUnitKerjaId?: string,
    @Query('is_active') isActive?: string,
  ) {
    const isActiveBool =
      isActive !== undefined ? isActive === 'true' : undefined;
    return this.pejabatService.findAll(simpegUnitKerjaId, isActiveBool);
  }

  @Get('resolve-recipient/:simpeg_unit_kerja_id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async resolveRecipient(
    @Param('simpeg_unit_kerja_id') simpegUnitKerjaId: string,
  ) {
    return this.pejabatService.resolveRecipient(simpegUnitKerjaId);
  }

  @Get(':id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async findById(@Param('id') id: string) {
    return this.pejabatService.findById(id);
  }

  @Post()
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN)
  async create(
    @Body() dto: CreatePejabatDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pejabatService.create(dto, user);
  }

  @Patch(':id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePejabatDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pejabatService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pejabatService.delete(id, user);
  }
}
