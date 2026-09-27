import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { SpLevelEnum } from '@prisma/client';

export class CreateSuratPeringatanDto {
  @IsUUID('all', { message: 'ID LHP harus berupa UUID yang valid' })
  @IsNotEmpty({ message: 'lhp_id wajib diisi' })
  lhp_id!: string;

  @IsEnum(SpLevelEnum, {
    message: 'Tingkat Surat Peringatan harus SP1, SP2, atau SP3',
  })
  @IsNotEmpty({ message: 'level surat peringatan wajib diisi' })
  level!: SpLevelEnum;

  @IsString()
  @IsNotEmpty({ message: 'Nomor surat peringatan wajib diisi' })
  nomor_surat!: string;

  @IsDateString(
    {},
    {
      message: 'Format tanggal_surat harus tanggal ISO yang valid (YYYY-MM-DD)',
    },
  )
  @IsNotEmpty({ message: 'Tanggal surat wajib diisi' })
  tanggal_surat!: string;

  @IsOptional()
  @IsUUID('all', { message: 'pejabat_id harus berupa UUID yang valid' })
  pejabat_id?: string;

  @IsOptional()
  @IsString()
  template_id?: string;
}

export class UpdateSuratPeringatanDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Nomor surat tidak boleh kosong' })
  nomor_surat?: string;

  @IsOptional()
  @IsDateString(
    {},
    {
      message: 'Format tanggal_surat harus tanggal ISO yang valid (YYYY-MM-DD)',
    },
  )
  tanggal_surat?: string;

  @IsOptional()
  @IsUUID('all', { message: 'pejabat_id harus berupa UUID yang valid' })
  pejabat_id?: string;

  @IsOptional()
  @IsString()
  template_id?: string;
}

export class QuerySuratPeringatanDto {
  @IsOptional()
  @IsUUID()
  lhp_id?: string;

  @IsOptional()
  @IsEnum(SpLevelEnum)
  level?: SpLevelEnum;

  @IsOptional()
  @IsString()
  irban_id?: string;

  @IsOptional()
  @IsString()
  tahun?: string;
}
