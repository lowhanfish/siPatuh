import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { AttachmentTypeEnum, RoleEnum, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SimpegAdapter } from '../external/simpeg/simpeg.adapter';
import { IrbanScopeService } from '../irban/irban-scope.service';
import { FilesService, UploadedMulterFile } from '../files/files.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateLhpDto } from './dto/create-lhp.dto';
import { UpdateLhpDto } from './dto/update-lhp.dto';
import { FilterLhpDto, LhpStatusFilterEnum } from './dto/filter-lhp.dto';

@Injectable()
export class LhpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly simpegAdapter: SimpegAdapter,
    private readonly irbanScopeService: IrbanScopeService,
    private readonly filesService: FilesService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Membuat data LHP baru ter-scope Irban secara ketat
   */
  async create(
    dto: CreateLhpDto,
    currentUser: AuthenticatedUser,
    file?: UploadedMulterFile,
  ) {
    this.irbanScopeService.assertCanMutate(currentUser);

    // 1. Verifikasi keberadaan dan keabsahan Unit Kerja di SIMPEG (unit_induk = 1)
    const unitKerja = await this.simpegAdapter.findUnitKerjaById(
      dto.simpeg_unit_kerja_id,
    );
    if (!unitKerja) {
      throw new BadRequestException(
        `Unit Kerja SIMPEG ID ${dto.simpeg_unit_kerja_id} tidak valid atau bukan unit induk`,
      );
    }

    // 2. Cek pembagian Irban untuk Unit Kerja tersebut di database SIPATUH
    const mapping = await this.prisma.irbanUnitKerja.findUnique({
      where: { simpeg_unit_kerja_id: dto.simpeg_unit_kerja_id },
      include: { irban: true },
    });

    if (!mapping) {
      throw new BadRequestException(
        `Unit Kerja "${unitKerja.unit_kerja}" belum dipetakan ke wilayah Irban manapun. Hubungi Super Admin.`,
      );
    }

    // 3. Jika user adalah ADMIN_IRBAN, pastikan unit kerja tersebut berada di bawah Irban miliknya
    if (currentUser.role === RoleEnum.ADMIN_IRBAN) {
      if (currentUser.irban_id !== mapping.irban_id) {
        throw new ForbiddenException(
          `Akses ditolak: Unit Kerja "${unitKerja.unit_kerja}" berada di bawah wewenang ${mapping.irban.nama}, bukan wilayah Irban Anda`,
        );
      }
    }

    // 4. Verifikasi jenis pemeriksaan
    const jenisPemeriksaan = await this.prisma.jenisPemeriksaan.findUnique({
      where: { id: dto.jenis_pemeriksaan_id },
    });
    if (!jenisPemeriksaan || !jenisPemeriksaan.is_active) {
      throw new BadRequestException(
        'Jenis pemeriksaan yang dipilih tidak valid atau sudah nonaktif',
      );
    }

    // 5. Cek keunikan nomor LHP
    const existingNomor = await this.prisma.lhp.findUnique({
      where: { nomor_lhp: dto.nomor_lhp.trim() },
    });
    if (existingNomor) {
      throw new ConflictException(
        `LHP dengan nomor "${dto.nomor_lhp}" sudah terdaftar`,
      );
    }

    // 6. Buat record LHP dengan SNAPSHOT irban_id kepemilikan
    const lhp = await this.prisma.lhp.create({
      data: {
        nomor_lhp: dto.nomor_lhp.trim(),
        tanggal_lhp: new Date(dto.tanggal_lhp),
        tanggal_diterima_lhp: new Date(dto.tanggal_diterima_lhp),
        tanggal_mulai_pemeriksaan: dto.tanggal_mulai_pemeriksaan
          ? new Date(dto.tanggal_mulai_pemeriksaan)
          : null,
        tanggal_selesai_pemeriksaan: dto.tanggal_selesai_pemeriksaan
          ? new Date(dto.tanggal_selesai_pemeriksaan)
          : null,
        simpeg_unit_kerja_id: dto.simpeg_unit_kerja_id,
        irban_id: mapping.irban_id, // Snapshot kepemilikan
        jenis_pemeriksaan_id: dto.jenis_pemeriksaan_id,
      },
      include: {
        irban: true,
        jenis_pemeriksaan: true,
      },
    });

    // 7. Jika ada file PDF yang diunggah saat pembuatan LHP
    let uploadedFilePath: string | null = null;
    if (file) {
      const saved = await this.filesService.saveUploadedFile(file, {
        subDir: 'lhp',
        ownerType: AttachmentTypeEnum.LHP,
        ownerId: lhp.id,
        allowedMimeTypes: ['application/pdf'],
        maxSizeBytes: 20 * 1024 * 1024, // 20 MB
      });

      uploadedFilePath = saved.relativePath;

      await this.prisma.lhp.update({
        where: { id: lhp.id },
        data: { file_path: uploadedFilePath },
      });
    }

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'CREATE_LHP',
      entity: 'Lhp',
      entity_id: lhp.id,
      metadata: {
        nomor_lhp: lhp.nomor_lhp,
        irban_id_snapshot: lhp.irban_id,
        simpeg_unit_kerja_id: lhp.simpeg_unit_kerja_id,
        unit_kerja_nama: unitKerja.unit_kerja,
        has_file: !!file,
      },
    });

    return {
      ...lhp,
      file_path: uploadedFilePath,
      unit_kerja_nama: unitKerja.unit_kerja,
    };
  }

  /**
   * Mengambil daftar LHP dengan Irban scoping dan filter tahun berjalan default
   */
  async findAll(filter: FilterLhpDto, currentUser: AuthenticatedUser) {
    const effectiveIrbanId = this.irbanScopeService.resolveEffectiveIrbanId(
      currentUser,
      filter.irban_id,
    );

    const where: Prisma.LhpWhereInput = {};

    if (effectiveIrbanId) {
      where.irban_id = effectiveIrbanId;
    }

    if (filter.jenis_pemeriksaan_id) {
      where.jenis_pemeriksaan_id = filter.jenis_pemeriksaan_id;
    }

    if (filter.status === LhpStatusFilterEnum.OPEN) {
      where.closed_at = null;
    } else if (filter.status === LhpStatusFilterEnum.CLOSED) {
      where.closed_at = { not: null };
    }

    // Default filter tahun berjalan jika tidak diset secara eksplisit
    const currentYear = new Date().getFullYear();
    const targetYear = filter.tahun !== undefined ? filter.tahun : currentYear;

    if (targetYear > 0) {
      const startOfYear = new Date(`${targetYear}-01-01T00:00:00.000Z`);
      const endOfYear = new Date(`${targetYear}-12-31T23:59:59.999Z`);
      where.tanggal_lhp = {
        gte: startOfYear,
        lte: endOfYear,
      };
    }

    if (filter.search && filter.search.trim() !== '') {
      where.nomor_lhp = { contains: filter.search.trim() };
    }

    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const limit = filter.limit && filter.limit > 0 ? filter.limit : 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.lhp.findMany({
        where,
        skip,
        take: limit,
        orderBy: { tanggal_lhp: 'desc' },
        include: {
          irban: { select: { id: true, kode: true, nama: true } },
          jenis_pemeriksaan: { select: { id: true, nama: true } },
          _count: {
            select: {
              temuans: true,
              surat_peringatans: true,
            },
          },
        },
      }),
      this.prisma.lhp.count({ where }),
    ]);

    // Ambil nama unit kerja dari SIMPEG untuk melengkapi data tampilan
    const simpegUnits = await this.simpegAdapter.findUnitKerjaInduk();
    const unitNameMap = new Map(simpegUnits.map((u) => [u.id, u.unit_kerja]));

    const enriched = items.map((item) => ({
      ...item,
      unit_kerja_nama:
        unitNameMap.get(item.simpeg_unit_kerja_id) || item.simpeg_unit_kerja_id,
      is_closed: item.closed_at !== null,
    }));

    return {
      data: enriched,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
        tahun: targetYear > 0 ? targetYear : 'ALL',
      },
    };
  }

  /**
   * Mengambil detail LHP lengkap ter-scope Irban
   */
  async findById(id: string, currentUser: AuthenticatedUser) {
    const lhp = await this.prisma.lhp.findUnique({
      where: { id },
      include: {
        irban: true,
        jenis_pemeriksaan: true,
        closed_by_user: {
          select: { id: true, egov_user_id: true, role: true },
        },
        temuans: {
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
        },
        surat_peringatans: {
          orderBy: { level: 'asc' },
          select: {
            id: true,
            level: true,
            nomor_surat: true,
            tanggal_surat: true,
            signed_at: true,
          },
        },
      },
    });

    if (!lhp) {
      throw new NotFoundException(`LHP dengan ID ${id} tidak ditemukan`);
    }

    // Validasi wewenang Irban untuk membaca
    this.irbanScopeService.validateIrbanAccess(
      currentUser,
      lhp.irban_id,
      'READ',
    );

    const unitKerja = await this.simpegAdapter.findUnitKerjaById(
      lhp.simpeg_unit_kerja_id,
    );

    return {
      ...lhp,
      unit_kerja_nama: unitKerja
        ? unitKerja.unit_kerja
        : lhp.simpeg_unit_kerja_id,
      is_closed: lhp.closed_at !== null,
    };
  }

  /**
   * Memperbarui metadata LHP (hanya jika belum ditutup/closed)
   */
  async update(id: string, dto: UpdateLhpDto, currentUser: AuthenticatedUser) {
    this.irbanScopeService.assertCanMutate(currentUser);

    const existing = await this.prisma.lhp.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`LHP dengan ID ${id} tidak ditemukan`);
    }

    // Validasi kepemilikan Irban
    this.irbanScopeService.validateIrbanAccess(
      currentUser,
      existing.irban_id,
      'WRITE',
    );

    if (existing.closed_at !== null) {
      throw new BadRequestException(
        'LHP ini sudah ditandai selesai (closed). Buka kembali (reopen) terlebih dahulu untuk memperbarui data.',
      );
    }

    if (dto.nomor_lhp && dto.nomor_lhp.trim() !== existing.nomor_lhp) {
      const duplicate = await this.prisma.lhp.findUnique({
        where: { nomor_lhp: dto.nomor_lhp.trim() },
      });
      if (duplicate) {
        throw new ConflictException(
          `Nomor LHP "${dto.nomor_lhp}" sudah digunakan`,
        );
      }
    }

    if (dto.jenis_pemeriksaan_id) {
      const jenis = await this.prisma.jenisPemeriksaan.findUnique({
        where: { id: dto.jenis_pemeriksaan_id },
      });
      if (!jenis || !jenis.is_active) {
        throw new BadRequestException('Jenis pemeriksaan tidak valid');
      }
    }

    const updated = await this.prisma.lhp.update({
      where: { id },
      data: {
        nomor_lhp: dto.nomor_lhp ? dto.nomor_lhp.trim() : existing.nomor_lhp,
        tanggal_lhp: dto.tanggal_lhp
          ? new Date(dto.tanggal_lhp)
          : existing.tanggal_lhp,
        tanggal_diterima_lhp: dto.tanggal_diterima_lhp
          ? new Date(dto.tanggal_diterima_lhp)
          : existing.tanggal_diterima_lhp,
        tanggal_mulai_pemeriksaan:
          dto.tanggal_mulai_pemeriksaan !== undefined
            ? dto.tanggal_mulai_pemeriksaan
              ? new Date(dto.tanggal_mulai_pemeriksaan)
              : null
            : existing.tanggal_mulai_pemeriksaan,
        tanggal_selesai_pemeriksaan:
          dto.tanggal_selesai_pemeriksaan !== undefined
            ? dto.tanggal_selesai_pemeriksaan
              ? new Date(dto.tanggal_selesai_pemeriksaan)
              : null
            : existing.tanggal_selesai_pemeriksaan,
        jenis_pemeriksaan_id:
          dto.jenis_pemeriksaan_id ?? existing.jenis_pemeriksaan_id,
      },
      include: {
        irban: true,
        jenis_pemeriksaan: true,
      },
    });

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'UPDATE_LHP',
      entity: 'Lhp',
      entity_id: id,
      metadata: {
        nomor_lhp: updated.nomor_lhp,
        before: {
          nomor_lhp: existing.nomor_lhp,
          tanggal_lhp: existing.tanggal_lhp,
          tanggal_diterima_lhp: existing.tanggal_diterima_lhp,
        },
      },
    });

    return updated;
  }

  /**
   * Mengunggah berkas PDF untuk LHP
   */
  async uploadFile(
    id: string,
    file: UploadedMulterFile,
    currentUser: AuthenticatedUser,
  ) {
    this.irbanScopeService.assertCanMutate(currentUser);

    const existing = await this.prisma.lhp.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`LHP dengan ID ${id} tidak ditemukan`);
    }

    this.irbanScopeService.validateIrbanAccess(
      currentUser,
      existing.irban_id,
      'WRITE',
    );

    if (existing.closed_at !== null) {
      throw new BadRequestException('LHP sudah ditandai selesai (closed)');
    }

    const saved = await this.filesService.saveUploadedFile(file, {
      subDir: 'lhp',
      ownerType: AttachmentTypeEnum.LHP,
      ownerId: existing.id,
      allowedMimeTypes: ['application/pdf'],
      maxSizeBytes: 20 * 1024 * 1024,
    });

    // Jika sebelumnya sudah ada file_path, file lama bisa dipertahankan di Attachment atau dibersihkan
    const updated = await this.prisma.lhp.update({
      where: { id },
      data: { file_path: saved.relativePath },
    });

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'UPLOAD_LHP_FILE',
      entity: 'Lhp',
      entity_id: id,
      metadata: {
        stored_name: saved.attachment.stored_name,
        original_name: saved.attachment.original_name,
        file_size: saved.attachment.file_size,
      },
    });

    return {
      message: 'Berkas LHP berhasil diunggah',
      file_path: updated.file_path,
      attachment: saved.attachment,
    };
  }

  /**
   * Mengambil path file aman untuk diunduh via endpoint terproteksi
   */
  async getFileForDownload(id: string, currentUser: AuthenticatedUser) {
    const existing = await this.prisma.lhp.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`LHP dengan ID ${id} tidak ditemukan`);
    }

    // Penegakan scope Irban saat download
    this.irbanScopeService.validateIrbanAccess(
      currentUser,
      existing.irban_id,
      'READ',
    );

    if (!existing.file_path) {
      throw new NotFoundException(
        'LHP ini tidak memiliki berkas dokumen terlampir',
      );
    }

    const absolutePath = this.filesService.resolveSecurePath(
      existing.file_path,
    );

    // Ambil original filename dari tabel Attachment jika ada
    const attachment = await this.prisma.attachment.findFirst({
      where: {
        owner_type: AttachmentTypeEnum.LHP,
        owner_id: id,
      },
      orderBy: { created_at: 'desc' },
    });

    const filename = attachment
      ? attachment.original_name
      : `LHP-${existing.nomor_lhp.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'DOWNLOAD_LHP_FILE',
      entity: 'Lhp',
      entity_id: id,
      metadata: { filename },
    });

    return {
      absolutePath,
      filename,
      mimeType: 'application/pdf',
    };
  }

  /**
   * Menandai LHP selesai (closed) oleh Admin Irban atau Super Admin
   */
  async closeLhp(id: string, currentUser: AuthenticatedUser) {
    this.irbanScopeService.assertCanMutate(currentUser);

    const lhp = await this.prisma.lhp.findUnique({
      where: { id },
      include: {
        temuans: {
          include: {
            rekomendasis: {
              include: { status_rekomendasi: true },
            },
          },
        },
      },
    });

    if (!lhp) {
      throw new NotFoundException(`LHP dengan ID ${id} tidak ditemukan`);
    }

    this.irbanScopeService.validateIrbanAccess(
      currentUser,
      lhp.irban_id,
      'WRITE',
    );

    if (lhp.closed_at !== null) {
      throw new BadRequestException(
        'LHP ini sudah dalam status selesai (closed)',
      );
    }

    // Hitung rekomendasi yang belum selesai sebagai informasi transparan
    let pendingCount = 0;
    for (const temuan of lhp.temuans) {
      for (const rekom of temuan.rekomendasis) {
        if (rekom.status_rekomendasi?.kategori === 'BELUM_SELESAI') {
          pendingCount++;
        }
      }
    }

    const closed = await this.prisma.lhp.update({
      where: { id },
      data: {
        closed_at: new Date(),
        closed_by: currentUser.id,
      },
      include: {
        closed_by_user: {
          select: { id: true, egov_user_id: true, role: true },
        },
      },
    });

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'CLOSE_LHP',
      entity: 'Lhp',
      entity_id: id,
      metadata: {
        nomor_lhp: lhp.nomor_lhp,
        pending_rekomendasi_count: pendingCount,
      },
    });

    return {
      message: 'LHP berhasil ditandai selesai',
      lhp: closed,
      pending_rekomendasi_count: pendingCount,
    };
  }

  /**
   * Membuka kembali LHP yang telah ditutup (khusus SUPER_ADMIN) dengan alasan wajib
   */
  async reopenLhp(id: string, alasan: string, currentUser: AuthenticatedUser) {
    if (currentUser.role !== RoleEnum.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Hanya Super Admin (Inspektur) yang berwenang membuka kembali LHP yang telah ditutup',
      );
    }

    if (!alasan || alasan.trim().length === 0) {
      throw new BadRequestException(
        'Alasan pembukaan kembali LHP (reopen_reason) wajib diisi',
      );
    }

    const lhp = await this.prisma.lhp.findUnique({ where: { id } });
    if (!lhp) {
      throw new NotFoundException(`LHP dengan ID ${id} tidak ditemukan`);
    }

    if (lhp.closed_at === null) {
      throw new BadRequestException(
        'LHP ini sedang aktif (tidak dalam status closed)',
      );
    }

    const reopened = await this.prisma.lhp.update({
      where: { id },
      data: {
        closed_at: null,
        closed_by: null,
        reopen_reason: alasan.trim(),
      },
    });

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'REOPEN_LHP',
      entity: 'Lhp',
      entity_id: id,
      metadata: {
        nomor_lhp: lhp.nomor_lhp,
        alasan: alasan.trim(),
        closed_at_before: lhp.closed_at,
      },
    });

    return {
      message: 'LHP berhasil dibuka kembali',
      lhp: reopened,
    };
  }

  /**
   * Hard delete LHP dibatasi aman: dilarang menghapus LHP jika telah memiliki surat TTE resmi
   */
  async deleteLhp(id: string, currentUser: AuthenticatedUser) {
    if (currentUser.role !== RoleEnum.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Hanya Super Admin yang diizinkan menghapus LHP secara permanen',
      );
    }

    const lhp = await this.prisma.lhp.findUnique({
      where: { id },
      include: {
        surat_peringatans: {
          where: { signed_at: { not: null } },
        },
      },
    });

    if (!lhp) {
      throw new NotFoundException(`LHP dengan ID ${id} tidak ditemukan`);
    }

    if (lhp.surat_peringatans.length > 0) {
      throw new BadRequestException(
        'LHP tidak dapat dihapus karena telah memiliki Surat Peringatan resmi yang ditandatangani secara elektronik (immutable)',
      );
    }

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'DELETE_LHP',
      entity: 'Lhp',
      entity_id: id,
      metadata: {
        nomor_lhp: lhp.nomor_lhp,
        simpeg_unit_kerja_id: lhp.simpeg_unit_kerja_id,
        irban_id: lhp.irban_id,
      },
    });

    await this.prisma.lhp.delete({ where: { id } });

    return { success: true, message: 'LHP berhasil dihapus secara permanen' };
  }
}
