import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IrbanScopeService } from '../irban/irban-scope.service';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import {
  CreateRekomendasiDto,
  UpdateRekomendasiDto,
} from './dto/rekomendasi.dto';

@Injectable()
export class RekomendasiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly irbanScopeService: IrbanScopeService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Membuat rekomendasi baru di bawah Temuan
   */
  async create(
    temuanId: string,
    dto: CreateRekomendasiDto,
    currentUser: AuthenticatedUser,
  ) {
    this.irbanScopeService.assertCanMutate(currentUser);

    const temuan = await this.prisma.temuan.findUnique({
      where: { id: temuanId },
      include: {
        lhp: { select: { id: true, irban_id: true, closed_at: true } },
      },
    });
    if (!temuan) {
      throw new NotFoundException(
        `Temuan dengan ID ${temuanId} tidak ditemukan`,
      );
    }

    this.irbanScopeService.validateIrbanAccess(
      currentUser,
      temuan.lhp.irban_id,
      'WRITE',
    );

    if (temuan.lhp.closed_at !== null) {
      throw new BadRequestException(
        'LHP terkait sudah ditandai selesai (closed). Tidak dapat menambah rekomendasi baru.',
      );
    }

    // Validasi status rekomendasi aktif
    const status = await this.prisma.statusRekomendasi.findUnique({
      where: { id: dto.status_rekomendasi_id },
    });
    if (!status || !status.is_active) {
      throw new BadRequestException(
        'Status rekomendasi yang dipilih tidak valid atau sudah nonaktif',
      );
    }

    // Nomor urut otomatis dalam satu temuan (1..n)
    const lastRekomendasi = await this.prisma.rekomendasi.findFirst({
      where: { temuan_id: temuanId },
      orderBy: { nomor_urut: 'desc' },
      select: { nomor_urut: true },
    });
    const nextNomorUrut = lastRekomendasi ? lastRekomendasi.nomor_urut + 1 : 1;

    const rekomendasi = await this.prisma.rekomendasi.create({
      data: {
        temuan_id: temuanId,
        nomor_urut: nextNomorUrut,
        uraian: dto.uraian.trim(),
        nilai_rekomendasi:
          dto.nilai_rekomendasi !== undefined && dto.nilai_rekomendasi !== null
            ? new Prisma.Decimal(dto.nilai_rekomendasi)
            : null,
        status_rekomendasi_id: dto.status_rekomendasi_id,
      },
      include: {
        status_rekomendasi: true,
      },
    });

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'CREATE_REKOMENDASI',
      entity: 'Rekomendasi',
      entity_id: rekomendasi.id,
      metadata: {
        temuan_id: temuanId,
        nomor_urut: rekomendasi.nomor_urut,
        status_rekomendasi: status.nama,
      },
    });

    return rekomendasi;
  }

  async findByTemuanId(temuanId: string, currentUser: AuthenticatedUser) {
    const temuan = await this.prisma.temuan.findUnique({
      where: { id: temuanId },
      include: { lhp: { select: { irban_id: true } } },
    });
    if (!temuan) {
      throw new NotFoundException(
        `Temuan dengan ID ${temuanId} tidak ditemukan`,
      );
    }

    this.irbanScopeService.validateIrbanAccess(
      currentUser,
      temuan.lhp.irban_id,
      'READ',
    );

    return this.prisma.rekomendasi.findMany({
      where: { temuan_id: temuanId },
      orderBy: { nomor_urut: 'asc' },
      include: {
        status_rekomendasi: true,
        tindak_lanjuts: {
          orderBy: { tanggal_diterima: 'asc' },
          include: {
            created_by_user: {
              select: { id: true, egov_user_id: true, role: true },
            },
            verifikasis: {
              orderBy: { verified_at: 'desc' },
              include: {
                verifier: {
                  select: { id: true, egov_user_id: true, role: true },
                },
                status_rekomendasi: true,
              },
            },
          },
        },
      },
    });
  }

  async findById(id: string, currentUser: AuthenticatedUser) {
    const rekomendasi = await this.prisma.rekomendasi.findUnique({
      where: { id },
      include: {
        status_rekomendasi: true,
        temuan: {
          include: {
            lhp: {
              select: {
                id: true,
                nomor_lhp: true,
                irban_id: true,
                closed_at: true,
              },
            },
          },
        },
        tindak_lanjuts: {
          orderBy: { tanggal_diterima: 'asc' },
          include: {
            verifikasis: {
              orderBy: { verified_at: 'desc' },
              include: { status_rekomendasi: true },
            },
          },
        },
      },
    });
    if (!rekomendasi) {
      throw new NotFoundException(
        `Rekomendasi dengan ID ${id} tidak ditemukan`,
      );
    }

    this.irbanScopeService.validateIrbanAccess(
      currentUser,
      rekomendasi.temuan.lhp.irban_id,
      'READ',
    );

    return rekomendasi;
  }

  async update(
    id: string,
    dto: UpdateRekomendasiDto,
    currentUser: AuthenticatedUser,
  ) {
    this.irbanScopeService.assertCanMutate(currentUser);

    const rekomendasi = await this.findById(id, currentUser);
    if (rekomendasi.temuan.lhp.closed_at !== null) {
      throw new BadRequestException(
        'LHP terkait sudah ditandai selesai (closed). Tidak dapat mengubah rekomendasi.',
      );
    }

    this.irbanScopeService.validateIrbanAccess(
      currentUser,
      rekomendasi.temuan.lhp.irban_id,
      'WRITE',
    );

    if (dto.status_rekomendasi_id) {
      const status = await this.prisma.statusRekomendasi.findUnique({
        where: { id: dto.status_rekomendasi_id },
      });
      if (!status) {
        throw new BadRequestException('Status rekomendasi tidak valid');
      }
    }

    const updated = await this.prisma.rekomendasi.update({
      where: { id },
      data: {
        uraian:
          dto.uraian !== undefined ? dto.uraian.trim() : rekomendasi.uraian,
        nilai_rekomendasi:
          dto.nilai_rekomendasi !== undefined
            ? dto.nilai_rekomendasi !== null
              ? new Prisma.Decimal(dto.nilai_rekomendasi)
              : null
            : rekomendasi.nilai_rekomendasi,
        status_rekomendasi_id:
          dto.status_rekomendasi_id ?? rekomendasi.status_rekomendasi_id,
      },
      include: { status_rekomendasi: true },
    });

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'UPDATE_REKOMENDASI',
      entity: 'Rekomendasi',
      entity_id: id,
      metadata: {
        before: {
          uraian: rekomendasi.uraian,
          status_id: rekomendasi.status_rekomendasi_id,
        },
        after: {
          uraian: updated.uraian,
          status_id: updated.status_rekomendasi_id,
        },
      },
    });

    return updated;
  }

  async delete(id: string, currentUser: AuthenticatedUser) {
    this.irbanScopeService.assertCanMutate(currentUser);

    const rekomendasi = await this.findById(id, currentUser);
    if (rekomendasi.temuan.lhp.closed_at !== null) {
      throw new BadRequestException(
        'LHP terkait sudah ditandai selesai (closed). Tidak dapat menghapus rekomendasi.',
      );
    }

    this.irbanScopeService.validateIrbanAccess(
      currentUser,
      rekomendasi.temuan.lhp.irban_id,
      'WRITE',
    );

    await this.prisma.rekomendasi.delete({ where: { id } });

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'DELETE_REKOMENDASI',
      entity: 'Rekomendasi',
      entity_id: id,
      metadata: { uraian: rekomendasi.uraian },
    });

    return { success: true, message: 'Rekomendasi berhasil dihapus' };
  }
}
