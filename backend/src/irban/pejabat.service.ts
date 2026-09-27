import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PenugasanEnum, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SimpegAdapter } from '../external/simpeg/simpeg.adapter';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreatePejabatDto, UpdatePejabatDto } from './dto/pejabat.dto';

@Injectable()
export class PejabatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly simpegAdapter: SimpegAdapter,
  ) {}

  async findAll(simpegUnitKerjaId?: string, isActive?: boolean) {
    const where: Prisma.PejabatUnitKerjaWhereInput = {};
    if (simpegUnitKerjaId) {
      where.simpeg_unit_kerja_id = simpegUnitKerjaId;
    }
    if (typeof isActive === 'boolean') {
      where.is_active = isActive;
    }

    return this.prisma.pejabatUnitKerja.findMany({
      where,
      orderBy: [{ is_active: 'desc' }, { tanggal_mulai: 'desc' }],
    });
  }

  async findById(id: string) {
    const pejabat = await this.prisma.pejabatUnitKerja.findUnique({
      where: { id },
    });
    if (!pejabat) {
      throw new NotFoundException(`Pejabat dengan ID ${id} tidak ditemukan`);
    }
    return pejabat;
  }

  async create(dto: CreatePejabatDto, currentUser: AuthenticatedUser) {
    // 1. Verifikasi bahwa unit kerja SIMPEG valid dan berstatus unit_induk = 1
    const unitKerja = await this.simpegAdapter.findUnitKerjaById(
      dto.simpeg_unit_kerja_id,
    );
    if (!unitKerja) {
      throw new BadRequestException(
        `Unit Kerja SIMPEG ID ${dto.simpeg_unit_kerja_id} tidak valid atau bukan unit induk`,
      );
    }

    // 2. Simpan record pejabat manual
    const created = await this.prisma.pejabatUnitKerja.create({
      data: {
        simpeg_unit_kerja_id: dto.simpeg_unit_kerja_id,
        nip: dto.nip.trim(),
        nama: dto.nama.trim(),
        jabatan: dto.jabatan.trim(),
        jenis_penugasan: dto.jenis_penugasan,
        tanggal_mulai: new Date(dto.tanggal_mulai),
        tanggal_selesai: dto.tanggal_selesai
          ? new Date(dto.tanggal_selesai)
          : null,
        is_active: dto.is_active ?? true,
      },
    });

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'CREATE_PEJABAT',
      entity: 'PejabatUnitKerja',
      entity_id: created.id,
      metadata: {
        simpeg_unit_kerja_id: dto.simpeg_unit_kerja_id,
        nip: dto.nip,
        nama: dto.nama,
        jenis_penugasan: dto.jenis_penugasan,
      },
    });

    return created;
  }

  async update(
    id: string,
    dto: UpdatePejabatDto,
    currentUser: AuthenticatedUser,
  ) {
    const existing = await this.findById(id);

    const updated = await this.prisma.pejabatUnitKerja.update({
      where: { id },
      data: {
        nip: dto.nip !== undefined ? dto.nip.trim() : existing.nip,
        nama: dto.nama !== undefined ? dto.nama.trim() : existing.nama,
        jabatan:
          dto.jabatan !== undefined ? dto.jabatan.trim() : existing.jabatan,
        jenis_penugasan: dto.jenis_penugasan ?? existing.jenis_penugasan,
        tanggal_mulai: dto.tanggal_mulai
          ? new Date(dto.tanggal_mulai)
          : existing.tanggal_mulai,
        tanggal_selesai:
          dto.tanggal_selesai !== undefined
            ? dto.tanggal_selesai
              ? new Date(dto.tanggal_selesai)
              : null
            : existing.tanggal_selesai,
        is_active:
          dto.is_active !== undefined ? dto.is_active : existing.is_active,
      },
    });

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'UPDATE_PEJABAT',
      entity: 'PejabatUnitKerja',
      entity_id: id,
      metadata: {
        before: existing,
        after: updated,
      },
    });

    return updated;
  }

  async delete(id: string, currentUser: AuthenticatedUser) {
    const existing = await this.findById(id);

    await this.prisma.pejabatUnitKerja.delete({
      where: { id },
    });

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'DELETE_PEJABAT',
      entity: 'PejabatUnitKerja',
      entity_id: id,
      metadata: {
        deleted: existing,
      },
    });

    return { success: true, message: 'Pejabat berhasil dihapus' };
  }

  /**
   * Mengurai kandidat pejabat penerima surat peringatan untuk suatu Unit Kerja:
   * 1. Prioritas utama: PLT atau PLH yang aktif dan dalam rentang tanggal penugasan.
   * 2. Fallback: DEFINITIF yang aktif dan dalam rentang tanggal penugasan.
   * 3. Jika lebih dari 1 kandidat sah, flag requires_manual_selection = true.
   */
  async resolveRecipient(simpegUnitKerjaId: string) {
    const now = new Date();

    const candidates = await this.prisma.pejabatUnitKerja.findMany({
      where: {
        simpeg_unit_kerja_id: simpegUnitKerjaId,
        is_active: true,
        tanggal_mulai: { lte: now },
        OR: [{ tanggal_selesai: null }, { tanggal_selesai: { gte: now } }],
      },
      orderBy: [{ jenis_penugasan: 'asc' }, { tanggal_mulai: 'desc' }],
    });

    if (candidates.length === 0) {
      return {
        primary_candidate: null,
        all_candidates: [],
        requires_manual_selection: false,
      };
    }

    // Cari kandidat berpenugasan PLT / PLH terlebih dahulu
    const pltOrPlh = candidates.filter(
      (c) =>
        c.jenis_penugasan === PenugasanEnum.PLT ||
        c.jenis_penugasan === PenugasanEnum.PLH,
    );

    const primaryCandidate = pltOrPlh.length > 0 ? pltOrPlh[0] : candidates[0];

    return {
      primary_candidate: primaryCandidate,
      all_candidates: candidates,
      requires_manual_selection: candidates.length > 1,
    };
  }
}
