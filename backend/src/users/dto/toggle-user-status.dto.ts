import { IsBoolean } from 'class-validator';

export class ToggleUserStatusDto {
  @IsBoolean()
  is_active!: boolean;
}
