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
   * Mengambil daftar Instansi / OPD Induk (66 entitas) dari SIMPEG dan melengkapinya dengan status mapping Irban
   */
  async browseSimpegUnitKerja(search?: string) {
    const instansis = await this.simpegAdapter.findAllInstansi(search);
    if (instansis.length === 0) {
      return [];
    }

    const instansiIds = instansis.map((i) => i.id);
    const mappings = await this.prisma.irbanUnitKerja.findMany({
      where: { simpeg_unit_kerja_id: { in: instansiIds } },
      include: {
        irban: { select: { id: true, kode: true, nama: true } },
      },
    });

    const mappingMap = new Map(
      mappings.map((m) => [m.simpeg_unit_kerja_id, m]),
    );

    return instansis.map((ins) => {
      const mapping = mappingMap.get(ins.id);
      return {
        id: ins.id,
        unit_kerja: ins.instansi,
        instansi: ins.instansi,
        instansi_id: ins.id,
        ref_instansi: ins.instansi,
        sub_unit_count: ins.sub_unit_count || 0,
        is_assigned: !!mapping,
        mapping_id: mapping ? mapping.id : null,
        assigned_irban: mapping ? mapping.irban : null,
      };
    });
  }

  /**
   * Autocomplete pencarian Unit Kerja beserta Instansi induknya untuk sasaran audit LHP
   */
  async searchUnitKerja(search?: string, limit = 50) {
    const units = await this.simpegAdapter.searchUnitKerjaWithInstansi(
      search,
      limit,
    );
    if (units.length === 0) {
      return [];
    }

    // Ambil mapping Irban untuk seluruh instansi terkait
    const instansiIds = Array.from(new Set(units.map((u) => u.instansi)));
    const mappings = await this.prisma.irbanUnitKerja.findMany({
      where: { simpeg_unit_kerja_id: { in: instansiIds } },
      include: {
        irban: { select: { id: true, kode: true, nama: true } },
      },
    });

    const mappingMap = new Map(
      mappings.map((m) => [m.simpeg_unit_kerja_id, m.irban]),
    );

    return units.map((u) => ({
      id: u.id,
      unit_kerja: u.unit_kerja,
      instansi_id: u.instansi,
      ref_instansi: u.ref_instansi || u.instansi,
      unit_induk: u.unit_induk,
      assigned_irban: mappingMap.get(u.instansi) || null,
      is_assigned: mappingMap.has(u.instansi),
    }));
  }

  /**
   * Menampilkan semua mapping aktif Unit Kerja / Instansi ke Irban
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

    // Perkaya data dengan nama instansi dari SIMPEG
    const instansis = await this.simpegAdapter.findAllInstansi();
    const instansiMap = new Map(instansis.map((i) => [i.id, i.instansi]));

    return mappings.map((m) => ({
      ...m,
      unit_kerja_nama:
        instansiMap.get(m.simpeg_unit_kerja_id) || m.simpeg_unit_kerja_id,
    }));
  }

  /**
   * Menugaskan atau memindahkan Instansi / Unit Kerja ke wilayah Irban tertentu (Super Admin)
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

    // 2. Verifikasi instansi atau unit kerja di database SIMPEG
    const instansi = await this.simpegAdapter.findInstansiById(
      dto.simpeg_unit_kerja_id,
    );
    const unitKerja = instansi
      ? null
      : await this.simpegAdapter.findUnitKerjaById(dto.simpeg_unit_kerja_id);

    if (!instansi && !unitKerja) {
      throw new BadRequestException(
        `Unit Kerja / Instansi dengan ID ${dto.simpeg_unit_kerja_id} tidak valid di SIMPEG`,
      );
    }

    const entityName = instansi ? instansi.instansi : unitKerja!.unit_kerja;

    // 3. Upsert mapping (1 Instansi/OPD aktif tepat berada pada 1 Irban)
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
        unit_kerja_nama: entityName,
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
