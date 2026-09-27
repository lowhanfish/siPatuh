import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RoleEnum } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('irban')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN)
  async getIrbanDashboard(
    @Query() query: DashboardQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const targetYear = query.tahun
      ? parseInt(query.tahun, 10)
      : new Date().getFullYear();
    return this.dashboardService.getIrbanDashboard(targetYear, user);
  }

  @Get('pimpinan')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.BUPATI)
  async getPimpinanDashboard(@Query() query: DashboardQueryDto) {
    const targetYear = query.tahun
      ? parseInt(query.tahun, 10)
      : new Date().getFullYear();
    return this.dashboardService.getPimpinanDashboard(targetYear);
  }
}
