import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum LhpStatusFilterEnum {
  ALL = 'ALL',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export class FilterLhpDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tahun?: number;

  @IsOptional()
  @IsString()
  irban_id?: string;

  @IsOptional()
  @IsString()
  jenis_pemeriksaan_id?: string;

  @IsOptional()
  @IsEnum(LhpStatusFilterEnum)
  status?: LhpStatusFilterEnum;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
