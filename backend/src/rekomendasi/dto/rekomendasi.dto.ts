import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRekomendasiDto {
  @IsString()
  @IsNotEmpty({ message: 'Uraian rekomendasi wajib diisi' })
  uraian!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Nilai rekomendasi harus berupa angka valid' })
  @Min(0, { message: 'Nilai rekomendasi tidak boleh negatif' })
  nilai_rekomendasi?: number | null;

  @IsString()
  @IsNotEmpty({ message: 'status_rekomendasi_id wajib dipilih' })
  status_rekomendasi_id!: string;
}

export class UpdateRekomendasiDto {
  @IsOptional()
  @IsString()
  uraian?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Nilai rekomendasi harus berupa angka valid' })
  @Min(0, { message: 'Nilai rekomendasi tidak boleh negatif' })
  nilai_rekomendasi?: number | null;

  @IsOptional()
  @IsString()
  status_rekomendasi_id?: string;
}
