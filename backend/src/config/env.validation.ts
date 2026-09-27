import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 3001;

  @IsString()
  @IsOptional()
  FRONTEND_URL: string = 'http://localhost:3000';

  @IsString()
  @MinLength(1, { message: 'DATABASE_URL wajib dikonfigurasi' })
  DATABASE_URL!: string;

  @IsString()
  @MinLength(1, { message: 'EGOV_DATABASE_URL wajib dikonfigurasi' })
  EGOV_DATABASE_URL!: string;

  @IsString()
  @MinLength(1, { message: 'SIMPEG_DATABASE_URL wajib dikonfigurasi' })
  SIMPEG_DATABASE_URL!: string;

  @IsString()
  @MinLength(16, { message: 'JWT_ACCESS_SECRET minimal 16 karakter' })
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @MinLength(16, { message: 'JWT_REFRESH_SECRET minimal 16 karakter' })
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @MinLength(16, { message: 'COOKIE_SECRET minimal 16 karakter' })
  COOKIE_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRATION: string = '15m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRATION: string = '7d';

  @IsString()
  @IsOptional()
  UPLOAD_DIR: string = 'uploads';

  @IsString()
  @IsOptional()
  TTE_API_URL?: string;

  @IsString()
  @IsOptional()
  TTE_API_TOKEN?: string;

  @IsNumber()
  @IsOptional()
  TTE_REQUEST_TIMEOUT_MS: number = 30000;

  @IsNumber()
  @IsOptional()
  TTE_MAX_PDF_BYTES: number = 7000000;

  @IsString()
  @IsOptional()
  TTE_SIGNATURE_TAG: string = '#tagTTD#';
}

export function validateConfig(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const isTest = config.NODE_ENV === Environment.Test;
  const effectiveConfig = {
    ...config,
    DATABASE_URL:
      config.DATABASE_URL ??
      (isTest ? 'mysql://test:test@localhost:3306/sipatuh_test' : undefined),
    EGOV_DATABASE_URL:
      config.EGOV_DATABASE_URL ??
      (isTest ? 'mysql://test:test@localhost:3306/egov_test' : undefined),
    SIMPEG_DATABASE_URL:
      config.SIMPEG_DATABASE_URL ??
      (isTest ? 'mysql://test:test@localhost:3306/simpeg_test' : undefined),
    JWT_ACCESS_SECRET:
      config.JWT_ACCESS_SECRET ??
      (isTest ? 'test_jwt_access_secret_1234567890_min16' : undefined),
    JWT_REFRESH_SECRET:
      config.JWT_REFRESH_SECRET ??
      (isTest ? 'test_jwt_refresh_secret_1234567890_min16' : undefined),
    COOKIE_SECRET:
      config.COOKIE_SECRET ??
      (isTest ? 'test_cookie_secret_1234567890_min16' : undefined),
  };

  const validatedConfig = plainToInstance(
    EnvironmentVariables,
    effectiveConfig,
    {
      enableImplicitConversion: true,
    },
  );

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    // Sanitasi error: hanya sebutkan properti/field yang gagal tanpa mencetak nilai value
    const messages = errors.map((err) => {
      const constraints = err.constraints
        ? Object.values(err.constraints).join(', ')
        : 'Nilai tidak valid';
      return `Konfigurasi [${err.property}]: ${constraints}`;
    });
    throw new Error(
      `Gagal memvalidasi Environment Variables:\n${messages.join('\n')}`,
    );
  }

  return validatedConfig;
}
