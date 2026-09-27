import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateIrbanDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nama!: string;
}
