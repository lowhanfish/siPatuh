import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import {
  CreateJenisPemeriksaanDto,
  UpdateJenisPemeriksaanDto,
  CreateStatusRekomendasiDto,
  UpdateStatusRekomendasiDto,
  CreateSuratTemplateDto,
  UpdateSuratTemplateDto,
} from './dto/master-data.dto';

@Injectable()
export class MasterDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ==========================================
  // 1. JENIS PEMERIKSAAN
  // ==========================================

  async findAllJenisPemeriksaan(activeOnly = false) {
    const where = activeOnly ? { is_active: true } : {};
    return this.prisma.jenisPemeriksaan.findMany({
      where,
      orderBy: { nama: 'asc' },
    });
  }

  async findJenisPemeriksaanById(id: string) {
    const record = await this.prisma.jenisPemeriksaan.findUnique({
      where: { id },
    });
    if (!record) {
      throw new NotFoundException(
        `Jenis Pemeriksaan dengan ID ${id} tidak ditemukan`,
      );
    }
    return record;
  }

  async createJenisPemeriksaan(
    dto: CreateJenisPemeriksaanDto,
    currentUser: AuthenticatedUser,
  ) {
    const existing = await this.prisma.jenisPemeriksaan.findUnique({
      where: { nama: dto.nama.trim() },
    });
    if (existing) {
      throw new ConflictException(
        `Jenis Pemeriksaan dengan nama "${dto.nama}" sudah ada`,
      );
    }

    const created = await this.prisma.jenisPemeriksaan.create({
      data: {
        nama: dto.nama.trim(),
        is_active: true,
      },
    });

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'CREATE_JENIS_PEMERIKSAAN',
      entity: 'JenisPemeriksaan',
      entity_id: created.id,
      metadata: { nama: created.nama },
    });

    return created;
  }

  async updateJenisPemeriksaan(
    id: string,
    dto: UpdateJenisPemeriksaanDto,
    currentUser: AuthenticatedUser,
  ) {
    const existing = await this.findJenisPemeriksaanById(id);

    if (dto.nama && dto.nama.trim() !== existing.nama) {
      const duplicate = await this.prisma.jenisPemeriksaan.findUnique({
        where: { nama: dto.nama.trim() },
      });
      if (duplicate) {
        throw new ConflictException(
          `Jenis Pemeriksaan dengan nama "${dto.nama}" sudah ada`,
        );
      }
    }

    const updated = await this.prisma.jenisPemeriksaan.update({
      where: { id },
      data: {
        nama: dto.nama !== undefined ? dto.nama.trim() : existing.nama,
        is_active:
          dto.is_active !== undefined ? dto.is_active : existing.is_active,
      },
    });

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'UPDATE_JENIS_PEMERIKSAAN',
      entity: 'JenisPemeriksaan',
      entity_id: id,
      metadata: { before: existing, after: updated },
    });

    return updated;
  }

  // ==========================================
  // 2. STATUS REKOMENDASI
  // ==========================================

  async findAllStatusRekomendasi(activeOnly = false) {
    const where = activeOnly ? { is_active: true } : {};
    return this.prisma.statusRekomendasi.findMany({
      where,
      orderBy: [{ urutan: 'asc' }, { nama: 'asc' }],
    });
  }

  async findStatusRekomendasiById(id: string) {
    const record = await this.prisma.statusRekomendasi.findUnique({
      where: { id },
    });
    if (!record) {
      throw new NotFoundException(
        `Status Rekomendasi dengan ID ${id} tidak ditemukan`,
      );
    }
    return record;
  }

  async createStatusRekomendasi(
    dto: CreateStatusRekomendasiDto,
    currentUser: AuthenticatedUser,
  ) {
    const existing = await this.prisma.statusRekomendasi.findUnique({
      where: { nama: dto.nama.trim() },
    });
    if (existing) {
      throw new ConflictException(
        `Status Rekomendasi dengan nama "${dto.nama}" sudah ada`,
      );
    }

    const created = await this.prisma.statusRekomendasi.create({
      data: {
        nama: dto.nama.trim(),
        kategori: dto.kategori,
        urutan: dto.urutan ?? 1,
        is_active: true,
      },
    });

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'CREATE_STATUS_REKOMENDASI',
      entity: 'StatusRekomendasi',
      entity_id: created.id,
      metadata: {
        nama: created.nama,
        kategori: created.kategori,
        urutan: created.urutan,
      },
    });

    return created;
  }

  async updateStatusRekomendasi(
    id: string,
    dto: UpdateStatusRekomendasiDto,
    currentUser: AuthenticatedUser,
  ) {
    const existing = await this.findStatusRekomendasiById(id);

    if (dto.nama && dto.nama.trim() !== existing.nama) {
      const duplicate = await this.prisma.statusRekomendasi.findUnique({
        where: { nama: dto.nama.trim() },
      });
      if (duplicate) {
        throw new ConflictException(
          `Status Rekomendasi dengan nama "${dto.nama}" sudah ada`,
        );
      }
    }

    const updated = await this.prisma.statusRekomendasi.update({
      where: { id },
      data: {
        nama: dto.nama !== undefined ? dto.nama.trim() : existing.nama,
        kategori: dto.kategori ?? existing.kategori,
        urutan: dto.urutan !== undefined ? dto.urutan : existing.urutan,
        is_active:
          dto.is_active !== undefined ? dto.is_active : existing.is_active,
      },
    });

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'UPDATE_STATUS_REKOMENDASI',
      entity: 'StatusRekomendasi',
      entity_id: id,
      metadata: { before: existing, after: updated },
    });

    return updated;
  }

  // ==========================================
  // 3. SURAT TEMPLATE (VERSIONED)
  // ==========================================

  async findAllSuratTemplates(jenisSurat?: string) {
    const where: Prisma.SuratTemplateWhereInput = {};
    if (jenisSurat) {
      where.jenis_surat = jenisSurat.toUpperCase();
    }

    return this.prisma.suratTemplate.findMany({
      where,
      orderBy: [{ jenis_surat: 'asc' }, { versi: 'desc' }],
    });
  }

  async findSuratTemplateById(id: string) {
    const record = await this.prisma.suratTemplate.findUnique({
      where: { id },
    });
    if (!record) {
      throw new NotFoundException(
        `Template Surat dengan ID ${id} tidak ditemukan`,
      );
    }
    return record;
  }

  async findActiveTemplateByJenis(jenisSurat: string) {
    const template = await this.prisma.suratTemplate.findFirst({
      where: {
        jenis_surat: jenisSurat.toUpperCase(),
        is_active: true,
      },
      orderBy: { versi: 'desc' },
    });

    if (!template) {
      throw new NotFoundException(
        `Template aktif untuk jenis surat ${jenisSurat} tidak ditemukan`,
      );
    }

    return template;
  }

  async createSuratTemplate(
    dto: CreateSuratTemplateDto,
    currentUser: AuthenticatedUser,
  ) {
    const jenis = dto.jenis_surat.toUpperCase();

    // Cari versi terakhir untuk jenis surat ini
    const lastVersion = await this.prisma.suratTemplate.findFirst({
      where: { jenis_surat: jenis },
      orderBy: { versi: 'desc' },
    });

    const nextVersion = lastVersion ? lastVersion.versi + 1 : 1;

    // Nonaktifkan versi sebelumnya jika template baru akan menjadi aktif
    if (lastVersion) {
      await this.prisma.suratTemplate.updateMany({
        where: { jenis_surat: jenis },
        data: { is_active: false },
      });
    }

    const created = await this.prisma.suratTemplate.create({
      data: {
        jenis_surat: jenis,
        judul: dto.judul.trim(),
        konten_html: dto.konten_html,
        versi: nextVersion,
        is_active: true,
      },
    });

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'CREATE_SURAT_TEMPLATE',
      entity: 'SuratTemplate',
      entity_id: created.id,
      metadata: {
        jenis_surat: created.jenis_surat,
        judul: created.judul,
        versi: created.versi,
      },
    });

    return created;
  }

  /**
   * Jika konten HTML berubah, sistem membuat versi baru secara otomatis
   * agar surat peringatan historis tidak terdampak perubahan konten masa depan (non-retroaktif).
   */
  async updateSuratTemplate(
    id: string,
    dto: UpdateSuratTemplateDto,
    currentUser: AuthenticatedUser,
  ) {
    const existing = await this.findSuratTemplateById(id);

    // Jika konten HTML diubah, buat versi baru
    if (dto.konten_html && dto.konten_html !== existing.konten_html) {
      return this.createSuratTemplate(
        {
          jenis_surat: existing.jenis_surat,
          judul: dto.judul || existing.judul,
          konten_html: dto.konten_html,
        },
        currentUser,
      );
    }

    // Jika hanya judul atau status aktif yang diubah
    const updated = await this.prisma.suratTemplate.update({
      where: { id },
      data: {
        judul: dto.judul !== undefined ? dto.judul.trim() : existing.judul,
        is_active:
          dto.is_active !== undefined ? dto.is_active : existing.is_active,
      },
    });

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'UPDATE_SURAT_TEMPLATE_METADATA',
      entity: 'SuratTemplate',
      entity_id: id,
      metadata: { before: existing, after: updated },
    });

    return updated;
  }
}
