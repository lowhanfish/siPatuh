import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsString({ message: 'Identifier (NIP atau Username) harus berupa string' })
  @IsNotEmpty({ message: 'NIP atau Username wajib diisi' })
  identifier!: string;

  @IsString({ message: 'Password harus berupa string' })
  @IsNotEmpty({ message: 'Password wajib diisi' })
  password!: string;
}
