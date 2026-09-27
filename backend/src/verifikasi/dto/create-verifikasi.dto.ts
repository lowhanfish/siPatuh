import { IsNotEmpty, IsString } from 'class-validator';

export class CreateVerifikasiDto {
  @IsString()
  @IsNotEmpty({ message: 'Catatan hasil verifikasi wajib diisi' })
  catatan!: string;

  @IsString()
  @IsNotEmpty({ message: 'Status rekomendasi hasil verifikasi wajib dipilih' })
  status_rekomendasi_id!: string;
}
