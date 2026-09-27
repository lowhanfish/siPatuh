import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';
import { RoleEnum } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsEnum(RoleEnum, {
    message: 'Role harus berupa SUPER_ADMIN, ADMIN_IRBAN, atau BUPATI',
  })
  role?: RoleEnum;

  @ValidateIf((o: UpdateUserDto) => o.role === RoleEnum.ADMIN_IRBAN)
  @IsOptional()
  @IsString()
  irban_id?: string | null;
}
