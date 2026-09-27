import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { PenugasanEnum } from '@prisma/client';

export class CreatePejabatDto {
  @IsString()
  @IsNotEmpty({ message: 'simpeg_unit_kerja_id wajib diisi' })
  simpeg_unit_kerja_id!: string;

  @IsString()
  @IsNotEmpty({ message: 'NIP wajib diisi' })
  nip!: string;

  @IsString()
  @IsNotEmpty({ message: 'Nama pejabat wajib diisi' })
  nama!: string;

  @IsString()
  @IsNotEmpty({ message: 'Jabatan wajib diisi' })
  jabatan!: string;

  @IsEnum(PenugasanEnum, {
    message: 'Jenis penugasan harus berupa DEFINITIF, PLT, atau PLH',
  })
  jenis_penugasan!: PenugasanEnum;

  @IsDateString(
    {},
    { message: 'Format tanggal_mulai harus ISO string (YYYY-MM-DD)' },
  )
  tanggal_mulai!: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'Format tanggal_selesai harus ISO string (YYYY-MM-DD)' },
  )
  tanggal_selesai?: string | null;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdatePejabatDto {
  @IsOptional()
  @IsString()
  nip?: string;

  @IsOptional()
  @IsString()
  nama?: string;

  @IsOptional()
  @IsString()
  jabatan?: string;

  @IsOptional()
  @IsEnum(PenugasanEnum)
  jenis_penugasan?: PenugasanEnum;

  @IsOptional()
  @IsDateString()
  tanggal_mulai?: string;

  @IsOptional()
  @IsDateString()
  tanggal_selesai?: string | null;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
