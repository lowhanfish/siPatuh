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
import { CreateTemuanDto, UpdateTemuanDto } from './dto/temuan.dto';

@Injectable()
export class TemuanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly irbanScopeService: IrbanScopeService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Membuat temuan baru di bawah LHP dengan nomor urut berurutan aman
   */
  async create(
    lhpId: string,
    dto: CreateTemuanDto,
    currentUser: AuthenticatedUser,
  ) {
    this.irbanScopeService.assertCanMutate(currentUser);

    const lhp = await this.prisma.lhp.findUnique({
      where: { id: lhpId },
    });
    if (!lhp) {
      throw new NotFoundException(`LHP dengan ID ${lhpId} tidak ditemukan`);
    }

    this.irbanScopeService.validateIrbanAccess(
      currentUser,
      lhp.irban_id,
      'WRITE',
    );

    if (lhp.closed_at !== null) {
      throw new BadRequestException(
        'LHP sudah ditandai selesai (closed). Tidak dapat menambah temuan baru.',
      );
    }

    // Nomor urut otomatis (1..n)
    const lastTemuan = await this.prisma.temuan.findFirst({
      where: { lhp_id: lhpId },
      orderBy: { nomor_urut: 'desc' },
      select: { nomor_urut: true },
    });
    const nextNomorUrut = lastTemuan ? lastTemuan.nomor_urut + 1 : 1;

    const temuan = await this.prisma.temuan.create({
      data: {
        lhp_id: lhpId,
        nomor_urut: nextNomorUrut,
        judul: dto.judul.trim(),
        uraian: dto.uraian.trim(),
        nilai_temuan:
          dto.nilai_temuan !== undefined && dto.nilai_temuan !== null
            ? new Prisma.Decimal(dto.nilai_temuan)
            : null,
      },
    });

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'CREATE_TEMUAN',
      entity: 'Temuan',
      entity_id: temuan.id,
      metadata: {
        lhp_id: lhpId,
        nomor_urut: temuan.nomor_urut,
        judul: temuan.judul,
      },
    });

    return temuan;
  }

  async findByLhpId(lhpId: string, currentUser: AuthenticatedUser) {
    const lhp = await this.prisma.lhp.findUnique({
      where: { id: lhpId },
    });
    if (!lhp) {
      throw new NotFoundException(`LHP dengan ID ${lhpId} tidak ditemukan`);
    }

    this.irbanScopeService.validateIrbanAccess(
      currentUser,
      lhp.irban_id,
      'READ',
    );

    return this.prisma.temuan.findMany({
      where: { lhp_id: lhpId },
      orderBy: { nomor_urut: 'asc' },
      include: {
        rekomendasis: {
          orderBy: { nomor_urut: 'asc' },
          include: {
            status_rekomendasi: true,
            _count: { select: { tindak_lanjuts: true } },
          },
        },
      },
    });
  }

  async findById(id: string, currentUser: AuthenticatedUser) {
    const temuan = await this.prisma.temuan.findUnique({
      where: { id },
      include: {
        lhp: {
          select: {
            id: true,
            nomor_lhp: true,
            irban_id: true,
            closed_at: true,
          },
        },
        rekomendasis: {
          orderBy: { nomor_urut: 'asc' },
          include: { status_rekomendasi: true },
        },
      },
    });
    if (!temuan) {
      throw new NotFoundException(`Temuan dengan ID ${id} tidak ditemukan`);
    }

    this.irbanScopeService.validateIrbanAccess(
      currentUser,
      temuan.lhp.irban_id,
      'READ',
    );

    return temuan;
  }

  async update(
    id: string,
    dto: UpdateTemuanDto,
    currentUser: AuthenticatedUser,
  ) {
    this.irbanScopeService.assertCanMutate(currentUser);

    const temuan = await this.findById(id, currentUser);
    if (temuan.lhp.closed_at !== null) {
      throw new BadRequestException(
        'LHP terkait sudah ditandai selesai (closed). Tidak dapat mengubah temuan.',
      );
    }

    this.irbanScopeService.validateIrbanAccess(
      currentUser,
      temuan.lhp.irban_id,
      'WRITE',
    );

    const updated = await this.prisma.temuan.update({
      where: { id },
      data: {
        judul: dto.judul !== undefined ? dto.judul.trim() : temuan.judul,
        uraian: dto.uraian !== undefined ? dto.uraian.trim() : temuan.uraian,
        nilai_temuan:
          dto.nilai_temuan !== undefined
            ? dto.nilai_temuan !== null
              ? new Prisma.Decimal(dto.nilai_temuan)
              : null
            : temuan.nilai_temuan,
      },
    });

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'UPDATE_TEMUAN',
      entity: 'Temuan',
      entity_id: id,
      metadata: {
        before: { judul: temuan.judul, nilai_temuan: temuan.nilai_temuan },
        after: { judul: updated.judul, nilai_temuan: updated.nilai_temuan },
      },
    });

    return updated;
  }

  async delete(id: string, currentUser: AuthenticatedUser) {
    this.irbanScopeService.assertCanMutate(currentUser);

    const temuan = await this.findById(id, currentUser);
    if (temuan.lhp.closed_at !== null) {
      throw new BadRequestException(
        'LHP terkait sudah ditandai selesai (closed). Tidak dapat menghapus temuan.',
      );
    }

    this.irbanScopeService.validateIrbanAccess(
      currentUser,
      temuan.lhp.irban_id,
      'WRITE',
    );

    await this.prisma.temuan.delete({ where: { id } });

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'DELETE_TEMUAN',
      entity: 'Temuan',
      entity_id: id,
      metadata: { judul: temuan.judul },
    });

    return { success: true, message: 'Temuan berhasil dihapus' };
  }
}
