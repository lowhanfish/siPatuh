import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { RoleEnum } from '@prisma/client';
import { UnitKerjaService } from './unit-kerja.service';
import { AssignUnitKerjaDto } from './dto/assign-unit-kerja.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Controller('unit-kerja')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UnitKerjaController {
  constructor(private readonly unitKerjaService: UnitKerjaService) {}

  @Get('simpeg')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async browseSimpeg(@Query('search') search?: string) {
    return this.unitKerjaService.browseSimpegUnitKerja(search);
  }

  @Get('search')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async searchUnitKerja(
    @Query('q') query?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Math.min(Math.max(Number(limit), 1), 100) : 50;
    return this.unitKerjaService.searchUnitKerja(query, parsedLimit);
  }

  @Get('mappings')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async findMappings(@Query('irban_id') irbanId?: string) {
    return this.unitKerjaService.findMappings(irbanId);
  }

  @Post('mappings')
  @Roles(RoleEnum.SUPER_ADMIN)
  async assign(
    @Body() dto: AssignUnitKerjaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.unitKerjaService.assignUnitKerja(dto, user);
  }

  @Delete('mappings/:id')
  @Roles(RoleEnum.SUPER_ADMIN)
  async unassign(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.unitKerjaService.unassignUnitKerja(id, user);
  }
}
