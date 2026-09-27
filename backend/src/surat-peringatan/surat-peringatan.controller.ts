import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { RoleEnum } from '@prisma/client';
import { SpDueEngineService } from './sp-due.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Controller('surat-peringatan')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuratPeringatanController {
  constructor(private readonly spDueEngine: SpDueEngineService) {}

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
}
