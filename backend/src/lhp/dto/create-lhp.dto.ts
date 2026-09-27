import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateLhpDto {
  @IsString()
  @IsNotEmpty({ message: 'Nomor LHP wajib diisi' })
  @MaxLength(100)
  nomor_lhp!: string;

  @IsDateString(
    {},
    {
      message: 'Format tanggal_lhp harus tanggal ISO yang valid (YYYY-MM-DD)',
    },
  )
  tanggal_lhp!: string;

  @IsDateString(
    {},
    {
      message:
        'Format tanggal_diterima_lhp harus tanggal ISO yang valid (YYYY-MM-DD)',
    },
  )
  tanggal_diterima_lhp!: string;

  @IsOptional()
  @IsDateString(
    {},
    {
      message: 'Format tanggal_mulai_pemeriksaan harus tanggal ISO yang valid',
    },
  )
  tanggal_mulai_pemeriksaan?: string | null;

  @IsOptional()
  @IsDateString(
    {},
    {
      message:
        'Format tanggal_selesai_pemeriksaan harus tanggal ISO yang valid',
    },
  )
  tanggal_selesai_pemeriksaan?: string | null;

  @IsString()
  @IsNotEmpty({
    message: 'simpeg_unit_kerja_id sasaran pemeriksaan wajib dipilih',
  })
  simpeg_unit_kerja_id!: string;

  @IsString()
  @IsNotEmpty({ message: 'jenis_pemeriksaan_id wajib dipilih' })
  jenis_pemeriksaan_id!: string;
}
