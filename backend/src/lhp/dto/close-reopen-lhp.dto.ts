import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CloseLhpDto {
  @IsOptional()
  @IsString()
  catatan?: string;
}

export class ReopenLhpDto {
  @IsString()
  @IsNotEmpty({
    message: 'Alasan pembukaan kembali (reopen_reason) wajib diisi',
  })
  alasan!: string;
}
