import { IsOptional, IsString, IsUUID } from 'class-validator';

export class ReportQueryDto {
  @IsOptional()
  @IsString()
  tahun?: string;

  @IsOptional()
  @IsString()
  irban_id?: string;

  @IsOptional()
  @IsString()
  simpeg_unit_kerja_id?: string;

  @IsOptional()
  @IsUUID('all', {
    message: 'jenis_pemeriksaan_id harus berupa UUID yang valid',
  })
  jenis_pemeriksaan_id?: string;

  @IsOptional()
  @IsUUID('all', {
    message: 'status_rekomendasi_id harus berupa UUID yang valid',
  })
  status_rekomendasi_id?: string;
}
