import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { KategoriStatusEnum } from '@prisma/client';

export class CreateJenisPemeriksaanDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama jenis pemeriksaan wajib diisi' })
  nama!: string;
}

export class UpdateJenisPemeriksaanDto {
  @IsOptional()
  @IsString()
  nama?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class CreateStatusRekomendasiDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama status rekomendasi wajib diisi' })
  nama!: string;

  @IsEnum(KategoriStatusEnum, {
    message: 'Kategori status harus SELESAI atau BELUM_SELESAI',
  })
  kategori!: KategoriStatusEnum;

  @IsOptional()
  @IsInt()
  @Min(1)
  urutan?: number;
}

export class UpdateStatusRekomendasiDto {
  @IsOptional()
  @IsString()
  nama?: string;

  @IsOptional()
  @IsEnum(KategoriStatusEnum)
  kategori?: KategoriStatusEnum;

  @IsOptional()
  @IsInt()
  @Min(1)
  urutan?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class CreateSuratTemplateDto {
  @IsString()
  @IsNotEmpty({ message: 'Jenis surat wajib diisi (misal: SP1, SP2, SP3)' })
  jenis_surat!: string;

  @IsString()
  @IsNotEmpty({ message: 'Judul template surat wajib diisi' })
  judul!: string;

  @IsString()
  @IsNotEmpty({ message: 'Konten HTML template surat wajib diisi' })
  konten_html!: string;
}

export class UpdateSuratTemplateDto {
  @IsOptional()
  @IsString()
  judul?: string;

  @IsOptional()
  @IsString()
  konten_html?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
