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
import { UsersService } from './users.service';
import { ActivateUserDto } from './dto/activate-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ToggleUserStatusDto } from './dto/toggle-user-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('egov-search')
  @Roles(RoleEnum.SUPER_ADMIN)
  async searchEgovUsers(@Query('query') query: string) {
    return this.usersService.searchEgovUsers(query);
  }

  @Get()
  @Roles(RoleEnum.SUPER_ADMIN)
  async findAll(
    @Query('role') role?: RoleEnum,
    @Query('irban_id') irban_id?: string,
    @Query('is_active') is_active?: string,
    @Query('search') search?: string,
  ) {
    const isActiveBool =
      is_active !== undefined ? is_active === 'true' : undefined;

    return this.usersService.findAll({
      role,
      irban_id,
      is_active: isActiveBool,
      search,
    });
  }

  @Get(':id')
  @Roles(RoleEnum.SUPER_ADMIN)
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post('activate')
  @Roles(RoleEnum.SUPER_ADMIN)
  async activateUser(
    @Body() dto: ActivateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.usersService.activateUser(dto, currentUser);
  }

  @Patch(':id')
  @Roles(RoleEnum.SUPER_ADMIN)
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.usersService.updateUser(id, dto, currentUser);
  }

  @Patch(':id/status')
  @Roles(RoleEnum.SUPER_ADMIN)
  async toggleStatus(
    @Param('id') id: string,
    @Body() dto: ToggleUserStatusDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.usersService.toggleStatus(id, dto, currentUser);
  }
}
