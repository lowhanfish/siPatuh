import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SimpegAdapter } from '../external/simpeg/simpeg.adapter';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { AssignUnitKerjaDto } from './dto/assign-unit-kerja.dto';

@Injectable()
export class UnitKerjaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly simpegAdapter: SimpegAdapter,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Mengambil daftar Unit Kerja dari SIMPEG (unit_induk=1) dan melengkapinya dengan status mapping Irban
   */
  async browseSimpegUnitKerja(search?: string) {
    const simpegUnits = await this.simpegAdapter.findUnitKerjaInduk(search);
    if (simpegUnits.length === 0) {
      return [];
    }

    const unitIds = simpegUnits.map((u) => u.id);
    const mappings = await this.prisma.irbanUnitKerja.findMany({
      where: { simpeg_unit_kerja_id: { in: unitIds } },
      include: {
        irban: { select: { id: true, kode: true, nama: true } },
      },
    });

    const mappingMap = new Map(
      mappings.map((m) => [m.simpeg_unit_kerja_id, m]),
    );

    return simpegUnits.map((unit) => {
      const mapping = mappingMap.get(unit.id);
      return {
        ...unit,
        is_assigned: !!mapping,
        mapping_id: mapping ? mapping.id : null,
        assigned_irban: mapping ? mapping.irban : null,
      };
    });
  }

  /**
   * Menampilkan semua mapping aktif Unit Kerja ke Irban
   */
  async findMappings(irbanId?: string) {
    const where: Prisma.IrbanUnitKerjaWhereInput = {};
    if (irbanId) {
      where.irban_id = irbanId;
    }

    const mappings = await this.prisma.irbanUnitKerja.findMany({
      where,
      include: {
        irban: { select: { id: true, kode: true, nama: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    // Perkaya data dengan nama unit kerja dari SIMPEG
    const simpegUnits = await this.simpegAdapter.findUnitKerjaInduk();
    const unitNameMap = new Map(simpegUnits.map((u) => [u.id, u.unit_kerja]));

    return mappings.map((m) => ({
      ...m,
      unit_kerja_nama:
        unitNameMap.get(m.simpeg_unit_kerja_id) || m.simpeg_unit_kerja_id,
    }));
  }

  /**
   * Menugaskan atau memindahkan Unit Kerja ke wilayah Irban tertentu (Super Admin)
   */
  async assignUnitKerja(
    dto: AssignUnitKerjaDto,
    currentUser: AuthenticatedUser,
  ) {
    // 1. Verifikasi keberadaan Irban di SIPATUH
    const irban = await this.prisma.irban.findUnique({
      where: { id: dto.irban_id },
    });
    if (!irban) {
      throw new NotFoundException(
        `Irban dengan ID ${dto.irban_id} tidak ditemukan`,
      );
    }

    // 2. Verifikasi unit kerja di database SIMPEG
    const simpegUnit = await this.simpegAdapter.findUnitKerjaById(
      dto.simpeg_unit_kerja_id,
    );
    if (!simpegUnit) {
      throw new BadRequestException(
        `Unit Kerja dengan ID ${dto.simpeg_unit_kerja_id} tidak valid di SIMPEG atau bukan unit induk`,
      );
    }

    // 3. Upsert mapping (1 OPD aktif tepat berada pada 1 Irban)
    const existing = await this.prisma.irbanUnitKerja.findUnique({
      where: { simpeg_unit_kerja_id: dto.simpeg_unit_kerja_id },
    });

    let result;
    if (existing) {
      result = await this.prisma.irbanUnitKerja.update({
        where: { id: existing.id },
        data: { irban_id: dto.irban_id },
        include: { irban: true },
      });
    } else {
      result = await this.prisma.irbanUnitKerja.create({
        data: {
          irban_id: dto.irban_id,
          simpeg_unit_kerja_id: dto.simpeg_unit_kerja_id,
        },
        include: { irban: true },
      });
    }

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'ASSIGN_UNIT_KERJA_IRBAN',
      entity: 'IrbanUnitKerja',
      entity_id: result.id,
      metadata: {
        simpeg_unit_kerja_id: dto.simpeg_unit_kerja_id,
        unit_kerja_nama: simpegUnit.unit_kerja,
        irban_id_before: existing ? existing.irban_id : null,
        irban_id_after: dto.irban_id,
      },
    });

    return result;
  }

  /**
   * Menghapus penugasan unit kerja dari Irban (Super Admin)
   */
  async unassignUnitKerja(id: string, currentUser: AuthenticatedUser) {
    const existing = await this.prisma.irbanUnitKerja.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Mapping dengan ID ${id} tidak ditemukan`);
    }

    await this.prisma.irbanUnitKerja.delete({ where: { id } });

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'UNASSIGN_UNIT_KERJA_IRBAN',
      entity: 'IrbanUnitKerja',
      entity_id: id,
      metadata: { deleted: existing },
    });

    return { success: true, message: 'Mapping Unit Kerja berhasil dihapus' };
  }
}
