import { IsNotEmpty, IsString } from 'class-validator';

export class AssignUnitKerjaDto {
  @IsString()
  @IsNotEmpty({ message: 'irban_id wajib diisi' })
  irban_id!: string;

  @IsString()
  @IsNotEmpty({ message: 'simpeg_unit_kerja_id wajib diisi' })
  simpeg_unit_kerja_id!: string;
}
