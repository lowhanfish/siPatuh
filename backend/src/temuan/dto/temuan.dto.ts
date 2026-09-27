import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTemuanDto {
  @IsString()
  @IsNotEmpty({ message: 'Judul temuan wajib diisi' })
  judul!: string;

  @IsString()
  @IsNotEmpty({ message: 'Uraian temuan wajib diisi' })
  uraian!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Nilai temuan harus berupa angka valid' })
  @Min(0, { message: 'Nilai temuan tidak boleh negatif' })
  nilai_temuan?: number | null;
}

export class UpdateTemuanDto {
  @IsOptional()
  @IsString()
  judul?: string;

  @IsOptional()
  @IsString()
  uraian?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Nilai temuan harus berupa angka valid' })
  @Min(0, { message: 'Nilai temuan tidak boleh negatif' })
  nilai_temuan?: number | null;
}
