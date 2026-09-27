import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTindakLanjutDto {
  @IsDateString(
    {},
    {
      message:
        'Format tanggal_diterima harus tanggal ISO yang valid (YYYY-MM-DD)',
    },
  )
  tanggal_diterima!: string;

  @IsString()
  @IsNotEmpty({ message: 'Uraian tindak lanjut wajib diisi' })
  uraian!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Nilai tindak lanjut harus berupa angka valid' })
  @Min(0, { message: 'Nilai tindak lanjut tidak boleh negatif' })
  nilai_tindak_lanjut?: number | null;
}
