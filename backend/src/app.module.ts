import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { IrbanModule } from './irban/irban.module';
import { ExternalModule } from './external/external.module';
import { FilesModule } from './files/files.module';
import { AuditModule } from './audit/audit.module';
import { MasterDataModule } from './master-data/master-data.module';
import { LhpModule } from './lhp/lhp.module';
import { TemuanModule } from './temuan/temuan.module';
import { RekomendasiModule } from './rekomendasi/rekomendasi.module';
import { TindakLanjutModule } from './tindak-lanjut/tindak-lanjut.module';
import { VerifikasiModule } from './verifikasi/verifikasi.module';
import { SuratPeringatanModule } from './surat-peringatan/surat-peringatan.module';
import { PrismaModule } from './prisma/prisma.module';

import { validateConfig } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateConfig,
    }),
    HealthModule,
    AuthModule,
    UsersModule,
    IrbanModule,
    MasterDataModule,
    LhpModule,
    TemuanModule,
    RekomendasiModule,
    TindakLanjutModule,
    VerifikasiModule,
    SuratPeringatanModule,
    ExternalModule,
    FilesModule,
    AuditModule,
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
