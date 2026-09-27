import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { RoleEnum } from '@prisma/client';
import { IrbanService } from './irban.service';
import { UpdateIrbanDto } from './dto/update-irban.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Controller('irban')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IrbanController {
  constructor(private readonly irbanService: IrbanService) {}

  @Get()
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async findAll() {
    return this.irbanService.findAll();
  }

  @Get(':id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_IRBAN, RoleEnum.BUPATI)
  async findById(@Param('id') id: string) {
    return this.irbanService.findById(id);
  }

  @Patch(':id')
  @Roles(RoleEnum.SUPER_ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateIrbanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.irbanService.update(id, dto, user);
  }
}
