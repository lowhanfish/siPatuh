import { Injectable, NotFoundException } from '@nestjs/common';
import { SpLevelEnum, KategoriStatusEnum, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IrbanScopeService } from '../irban/irban-scope.service';
import { SimpegAdapter } from '../external/simpeg/simpeg.adapter';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

export interface SpEligibilityResult {
  lhp_id: string;
  nomor_lhp: string;
  irban_id: string;
  simpeg_unit_kerja_id: string;
  unit_kerja_nama?: string;
  tanggal_lhp: Date;
  tanggal_diterima_lhp: Date;
  age_days: number;
  is_closed: boolean;
  total_rekomendasi: number;
  pending_rekomendasi_count: number;
  outstanding_rekomendasis: Array<{
    id: string;
    temuan_id: string;
    nomor_urut: number;
    uraian: string;
    nilai_rekomendasi: number | null;
    status_nama: string;
    status_kategori: KategoriStatusEnum;
  }>;
  existing_sp_levels: SpLevelEnum[];
  eligible_level: SpLevelEnum | null;
  is_due: boolean;
  next_threshold_days?: number;
}

@Injectable()
export class SpDueEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly irbanScopeService: IrbanScopeService,
    private readonly simpegAdapter: SimpegAdapter,
  ) {}

  /**
   * Menghitung selisih hari kalender dari tanggal_diterima_lhp hingga tanggal target (default: sekarang).
   * Menggunakan perhitungan date-only untuk menghindari drift jam/menit.
   */
  calculateAgeInDays(
    tanggalDiterima: Date,
    referenceDate: Date = new Date(),
  ): number {
    const receivedUtc = Date.UTC(
      tanggalDiterima.getFullYear(),
      tanggalDiterima.getMonth(),
      tanggalDiterima.getDate(),
    );
    const refUtc = Date.UTC(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate(),
    );

    const diffMs = refUtc - receivedUtc;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Menentukan level SP tertinggi yang layak diterbitkan berdasarkan umur hari dan riwayat SP yang sudah terbit:
   * - Umur >= 60 hari: Target SP3 (jika SP3 belum terbit)
   * - Umur >= 45 hari: Target SP2 (jika SP2 belum terbit)
   * - Umur >= 30 hari: Target SP1 (jika SP1 belum terbit)
   * Eskalasi berurutan: jika SP1 belum pernah terbit dan umur >= 45 hari, level yang disarankan tetap level terendah yang belum terbit
   * atau level sesuai umur sesuai kebijakan.
   */
  determineEligibleLevel(
    ageDays: number,
    existingLevels: SpLevelEnum[],
  ): SpLevelEnum | null {
    if (ageDays < 30) {
      return null;
    }

    if (ageDays >= 60) {
      if (!existingLevels.includes(SpLevelEnum.SP3)) {
        if (!existingLevels.includes(SpLevelEnum.SP2)) {
          return existingLevels.includes(SpLevelEnum.SP1)
            ? SpLevelEnum.SP2
            : SpLevelEnum.SP1;
        }
        return SpLevelEnum.SP3;
      }
      return null;
    }

    if (ageDays >= 45) {
      if (!existingLevels.includes(SpLevelEnum.SP2)) {
        return existingLevels.includes(SpLevelEnum.SP1)
          ? SpLevelEnum.SP2
          : SpLevelEnum.SP1;
      }
      return null;
    }

    if (ageDays >= 30) {
      if (!existingLevels.includes(SpLevelEnum.SP1)) {
        return SpLevelEnum.SP1;
      }
      return null;
    }

    return null;
  }

  /**
   * Evaluasi kelayakan SP untuk satu LHP
   */
  async evaluateLhp(
    lhpId: string,
    currentUser: AuthenticatedUser,
    referenceDate: Date = new Date(),
  ): Promise<SpEligibilityResult> {
    const lhp = await this.prisma.lhp.findUnique({
      where: { id: lhpId },
      include: {
        surat_peringatans: { select: { level: true } },
        temuans: {
          orderBy: { nomor_urut: 'asc' },
          include: {
            rekomendasis: {
              orderBy: { nomor_urut: 'asc' },
              include: { status_rekomendasi: true },
            },
          },
        },
      },
    });

    if (!lhp) {
      throw new NotFoundException(`LHP dengan ID ${lhpId} tidak ditemukan`);
    }

    this.irbanScopeService.validateIrbanAccess(
      currentUser,
      lhp.irban_id,
      'READ',
    );

    const ageDays = this.calculateAgeInDays(
      lhp.tanggal_diterima_lhp,
      referenceDate,
    );
    const existingLevels = lhp.surat_peringatans.map((sp) => sp.level);

    // Kumpulkan rekomendasi outstanding (kategori BELUM_SELESAI)
    const outstanding: SpEligibilityResult['outstanding_rekomendasis'] = [];
    let totalRekomendasi = 0;

    for (const temuan of lhp.temuans) {
      for (const rekom of temuan.rekomendasis) {
        totalRekomendasi++;
        if (
          rekom.status_rekomendasi &&
          rekom.status_rekomendasi.kategori === KategoriStatusEnum.BELUM_SELESAI
        ) {
          outstanding.push({
            id: rekom.id,
            temuan_id: temuan.id,
            nomor_urut: rekom.nomor_urut,
            uraian: rekom.uraian,
            nilai_rekomendasi: rekom.nilai_rekomendasi
              ? Number(rekom.nilai_rekomendasi)
              : null,
            status_nama: rekom.status_rekomendasi.nama,
            status_kategori: rekom.status_rekomendasi.kategori,
          });
        }
      }
    }

    // Jika LHP sudah ditandai selesai (closed) atau semua rekomendasi sudah SELESAI, tidak ada SP yang eligible
    let eligibleLevel: SpLevelEnum | null = null;
    if (lhp.closed_at === null && outstanding.length > 0) {
      eligibleLevel = this.determineEligibleLevel(ageDays, existingLevels);
    }

    const unitKerja = await this.simpegAdapter.findUnitKerjaById(
      lhp.simpeg_unit_kerja_id,
    );

    return {
      lhp_id: lhp.id,
      nomor_lhp: lhp.nomor_lhp,
      irban_id: lhp.irban_id,
      simpeg_unit_kerja_id: lhp.simpeg_unit_kerja_id,
      unit_kerja_nama: unitKerja
        ? unitKerja.unit_kerja
        : lhp.simpeg_unit_kerja_id,
      tanggal_lhp: lhp.tanggal_lhp,
      tanggal_diterima_lhp: lhp.tanggal_diterima_lhp,
      age_days: ageDays,
      is_closed: lhp.closed_at !== null,
      total_rekomendasi: totalRekomendasi,
      pending_rekomendasi_count: outstanding.length,
      outstanding_rekomendasis: outstanding,
      existing_sp_levels: existingLevels,
      eligible_level: eligibleLevel,
      is_due: eligibleLevel !== null,
    };
  }

  /**
   * Menampilkan seluruh LHP yang jatuh tempo SP (Due / Overdue) ter-scope Irban
   */
  async findDueLhps(
    currentUser: AuthenticatedUser,
    requestedIrbanId?: string,
    referenceDate: Date = new Date(),
  ): Promise<SpEligibilityResult[]> {
    const effectiveIrbanId = this.irbanScopeService.resolveEffectiveIrbanId(
      currentUser,
      requestedIrbanId,
    );

    const where: Prisma.LhpWhereInput = {
      closed_at: null, // Hanya LHP yang masih terbuka
    };

    if (effectiveIrbanId) {
      where.irban_id = effectiveIrbanId;
    }

    // Ambil LHP yang berpotensi SP (tanggal_diterima_lhp <= referenceDate - 30 hari)
    const thirtyDaysAgo = new Date(referenceDate);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    where.tanggal_diterima_lhp = { lte: thirtyDaysAgo };

    const lhps = await this.prisma.lhp.findMany({
      where,
      orderBy: { tanggal_diterima_lhp: 'asc' },
      select: { id: true },
    });

    const results: SpEligibilityResult[] = [];
    for (const item of lhps) {
      const evalResult = await this.evaluateLhp(
        item.id,
        currentUser,
        referenceDate,
      );
      if (evalResult.is_due) {
        results.push(evalResult);
      }
    }

    return results;
  }
}
