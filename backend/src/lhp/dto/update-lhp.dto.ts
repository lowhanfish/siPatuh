import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateLhpDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nomor_lhp?: string;

  @IsOptional()
  @IsDateString()
  tanggal_lhp?: string;

  @IsOptional()
  @IsDateString()
  tanggal_diterima_lhp?: string;

  @IsOptional()
  @IsDateString()
  tanggal_mulai_pemeriksaan?: string | null;

  @IsOptional()
  @IsDateString()
  tanggal_selesai_pemeriksaan?: string | null;

  @IsOptional()
  @IsString()
  jenis_pemeriksaan_id?: string;
}
