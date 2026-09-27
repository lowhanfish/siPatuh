import { IsEnum, IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { RoleEnum } from '@prisma/client';

export class ActivateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'egov_user_id wajib diisi' })
  egov_user_id!: string;

  @IsEnum(RoleEnum, {
    message: 'Role harus berupa SUPER_ADMIN, ADMIN_IRBAN, atau BUPATI',
  })
  role!: RoleEnum;

  @ValidateIf((o: ActivateUserDto) => o.role === RoleEnum.ADMIN_IRBAN)
  @IsNotEmpty({ message: 'irban_id wajib diisi untuk role ADMIN_IRBAN' })
  @IsString()
  irban_id?: string | null;
}
