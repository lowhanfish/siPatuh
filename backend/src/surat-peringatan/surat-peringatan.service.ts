import {
  Injectable,
  NotFoundException,
  BadRequestException,
  BadGatewayException,
  ConflictException,
  GatewayTimeoutException,
  HttpException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  KategoriStatusEnum,
  Prisma,
  SpLevelEnum,
  type SuratPeringatan,
} from '@prisma/client';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { IrbanScopeService } from '../irban/irban-scope.service';
import { PejabatService } from '../irban/pejabat.service';
import { SimpegAdapter } from '../external/simpeg/simpeg.adapter';
import { AuditService } from '../audit/audit.service';
import { FilesService } from '../files/files.service';
import { SpDueEngineService } from './sp-due.service';
import { SpPdfGeneratorService } from './sp-pdf.service';
import {
  TteClient,
  TteConfigError,
  TteGatewayError,
} from '../external/tte/tte.client';
import {
  CreateSuratPeringatanDto,
  QuerySuratPeringatanDto,
  SignSuratPeringatanDto,
  UpdateSuratPeringatanDto,
} from './dto/create-surat-peringatan.dto';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

/** Status `sending` tanpa kabar selama ini dianggap macet dan boleh diklaim ulang. */
const TTE_SENDING_STALE_MS = 5 * 60 * 1000;

@Injectable()
export class SuratPeringatanService {
  private readonly signingLocks = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly irbanScopeService: IrbanScopeService,
    private readonly pejabatService: PejabatService,
    private readonly simpegAdapter: SimpegAdapter,
    private readonly auditService: AuditService,
    private readonly filesService: FilesService,
    private readonly spDueEngine: SpDueEngineService,
    private readonly pdfGenerator: SpPdfGeneratorService,
    private readonly tteClient: TteClient,
  ) {}

  /**
   * Helper path absolut direktori draft
   */
  private getDraftDir(): string {
    const draftDir = path.join(
      this.filesService.getUploadsRoot(),
      'surat-peringatan',
      'draft',
    );
    if (!fs.existsSync(draftDir)) {
      fs.mkdirSync(draftDir, { recursive: true });
    }
    return draftDir;
  }

  /**
   * Helper path absolut direktori signed
   */
  private getSignedDir(): string {
    const signedDir = path.join(
      this.filesService.getUploadsRoot(),
      'surat-peringatan',
      'signed',
    );
    if (!fs.existsSync(signedDir)) {
      fs.mkdirSync(signedDir, { recursive: true });
    }
    return signedDir;
  }

  /**
   * Menerbitkan Surat Peringatan baru (SP1/SP2/SP3) dengan snapshot dan draft PDF
   */
  async create(dto: CreateSuratPeringatanDto, currentUser: AuthenticatedUser) {
    this.irbanScopeService.assertCanMutate(currentUser);

    // 1. Validasi keberadaan LHP
    const lhp = await this.prisma.lhp.findUnique({
      where: { id: dto.lhp_id },
      include: {
        surat_peringatans: true,
      },
    });

    if (!lhp) {
      throw new NotFoundException(
        `LHP dengan ID ${dto.lhp_id} tidak ditemukan`,
      );
    }

    // 2. Proteksi wilayah Irban
    this.irbanScopeService.validateIrbanAccess(currentUser, lhp.irban_id);

    // 3. LHP tidak boleh sudah ditutup
    if (lhp.closed_at) {
      throw new BadRequestException(
        'LHP telah ditutup dan dinyatakan selesai. Tidak dapat menerbitkan Surat Peringatan.',
      );
    }

    // 4. Periksa apakah level surat ini sudah pernah diterbitkan (1 level per LHP)
    const existingSameLevel = lhp.surat_peringatans.find(
      (sp) => sp.level === dto.level,
    );
    if (existingSameLevel) {
      throw new ConflictException(
        `Surat Peringatan ${dto.level} sudah pernah dibuat untuk LHP ini (Nomor: ${existingSameLevel.nomor_surat})`,
      );
    }

    // 5. Validasi keunikan nomor surat
    const existingNomor = await this.prisma.suratPeringatan.findUnique({
      where: { nomor_surat: dto.nomor_surat.trim() },
    });
    if (existingNomor) {
      throw new ConflictException(
        `Nomor surat "${dto.nomor_surat}" sudah digunakan oleh surat lain`,
      );
    }

    // 6. Validasi urutan penerbitan level (SP2 butuh SP1, SP3 butuh SP2)
    const issuedLevels = lhp.surat_peringatans.map((sp) => sp.level);
    if (
      dto.level === SpLevelEnum.SP2 &&
      !issuedLevels.includes(SpLevelEnum.SP1)
    ) {
      throw new BadRequestException(
        'Surat Peringatan Pertama (SP1) harus diterbitkan terlebih dahulu sebelum SP2',
      );
    }
    if (
      dto.level === SpLevelEnum.SP3 &&
      !issuedLevels.includes(SpLevelEnum.SP2)
    ) {
      throw new BadRequestException(
        'Surat Peringatan Kedua (SP2) harus diterbitkan terlebih dahulu sebelum SP3',
      );
    }

    // 7. Validasi batas umur LHP (hari kalender sejak tanggal_diterima_lhp)
    const targetDate = new Date(dto.tanggal_surat);
    const ageDays = this.spDueEngine.calculateAgeInDays(
      lhp.tanggal_diterima_lhp,
      targetDate,
    );

    const minDays =
      dto.level === SpLevelEnum.SP1
        ? 30
        : dto.level === SpLevelEnum.SP2
          ? 45
          : 60;
    if (ageDays < minDays) {
      throw new BadRequestException(
        `Usia LHP (${ageDays} hari sejak diterima) belum memenuhi syarat batas waktu minimal untuk ${dto.level} (${minDays} hari)`,
      );
    }

    // 8. Snapshot Pejabat Penerima
    let recipientNip = '-';
    let recipientNama = 'Kepala Perangkat Daerah';
    let recipientJabatan = 'Kepala Perangkat Daerah';

    if (dto.pejabat_id) {
      const selectedPejabat = await this.pejabatService.findById(
        dto.pejabat_id,
      );
      recipientNip = selectedPejabat.nip;
      recipientNama = selectedPejabat.nama;
      recipientJabatan = selectedPejabat.jabatan;
    } else {
      const resolution = await this.pejabatService.resolveRecipient(
        lhp.simpeg_unit_kerja_id,
      );
      if (resolution.primary_candidate) {
        recipientNip = resolution.primary_candidate.nip;
        recipientNama = resolution.primary_candidate.nama;
        recipientJabatan = resolution.primary_candidate.jabatan;
      } else {
        const opdSimpeg = await this.simpegAdapter.findUnitKerjaById(
          lhp.simpeg_unit_kerja_id,
        );
        if (opdSimpeg) {
          recipientNama = `Kepala ${opdSimpeg.unit_kerja}`;
          recipientJabatan = `Kepala ${opdSimpeg.unit_kerja}`;
        }
      }
    }

    // 9. Snapshot Rekomendasi Outstanding (Kategori BELUM_SELESAI)
    const outstandingRekomendasis = await this.prisma.rekomendasi.findMany({
      where: {
        temuan: { lhp_id: lhp.id },
        status_rekomendasi: { kategori: KategoriStatusEnum.BELUM_SELESAI },
      },
      include: {
        temuan: true,
        status_rekomendasi: true,
      },
      orderBy: [{ temuan: { nomor_urut: 'asc' } }, { nomor_urut: 'asc' }],
    });

    if (outstandingRekomendasis.length === 0) {
      throw new BadRequestException(
        'Tidak ada rekomendasi yang berkategori Belum Selesai pada LHP ini. Eskalasi Surat Peringatan dihentikan.',
      );
    }

    // 10. Ambil Unit Kerja dari SIMPEG
    const opd = await this.simpegAdapter.findUnitKerjaById(
      lhp.simpeg_unit_kerja_id,
    );
    const unitKerjaNama = opd?.unit_kerja || 'Perangkat Daerah';

    // 11. Ambil Template Surat
    let templateKonten: string | undefined;
    let templateVersion = 1;

    if (dto.template_id) {
      const customTpl = await this.prisma.suratTemplate.findUnique({
        where: { id: dto.template_id },
      });
      if (customTpl) {
        templateKonten = customTpl.konten_html;
        templateVersion = customTpl.versi;
      }
    } else {
      const activeTpl = await this.prisma.suratTemplate.findFirst({
        where: { jenis_surat: dto.level, is_active: true },
        orderBy: { versi: 'desc' },
      });
      if (activeTpl) {
        templateKonten = activeTpl.konten_html;
        templateVersion = activeTpl.versi;
      }
    }

    // 12. Render PDF Draft
    const pdfItems = outstandingRekomendasis.map((rek, idx) => ({
      nomor: idx + 1,
      temuan: `[Temuan #${rek.temuan.nomor_urut}] ${rek.temuan.judul}`,
      rekomendasi: `[Rekomendasi #${rek.nomor_urut}] ${rek.uraian}`,
      nilai: rek.nilai_rekomendasi ? Number(rek.nilai_rekomendasi) : null,
    }));

    const pdfBuffer = await this.pdfGenerator.generateDraftPdf({
      nomor_surat: dto.nomor_surat.trim(),
      tanggal_surat: new Date(dto.tanggal_surat),
      level: dto.level,
      unit_kerja_nama: unitKerjaNama,
      recipient_nama: recipientNama,
      recipient_nip: recipientNip,
      recipient_jabatan: recipientJabatan,
      nomor_lhp: lhp.nomor_lhp,
      tanggal_lhp: lhp.tanggal_lhp,
      tanggal_diterima_lhp: lhp.tanggal_diterima_lhp,
      konten_template: templateKonten,
      items: pdfItems,
    });

    // Simpan berkas fisik draft
    const draftFileName = `${crypto.randomUUID()}.pdf`;
    const draftRelativePath = `surat-peringatan/draft/${draftFileName}`;
    const draftAbsolutePath = path.join(this.getDraftDir(), draftFileName);
    fs.writeFileSync(draftAbsolutePath, pdfBuffer);

    // 13. Transaksi Prisma: Simpan SuratPeringatan dan SuratPeringatanItem
    const createdSp = await this.prisma.$transaction(async (tx) => {
      const sp = await tx.suratPeringatan.create({
        data: {
          lhp_id: lhp.id,
          level: dto.level,
          nomor_surat: dto.nomor_surat.trim(),
          tanggal_surat: new Date(dto.tanggal_surat),
          simpeg_unit_kerja_id: lhp.simpeg_unit_kerja_id,
          recipient_nip: recipientNip,
          recipient_nama: recipientNama,
          recipient_jabatan: recipientJabatan,
          template_version: templateVersion,
          draft_path: draftRelativePath,
        },
      });

      const itemsData = outstandingRekomendasis.map((rek) => ({
        surat_peringatan_id: sp.id,
        rekomendasi_id: rek.id,
        uraian_snapshot: `[Temuan #${rek.temuan.nomor_urut}] ${rek.temuan.judul} - [Rekomendasi #${rek.nomor_urut}] ${rek.uraian}`,
        nilai_rekomendasi_snapshot: rek.nilai_rekomendasi,
      }));

      await tx.suratPeringatanItem.createMany({
        data: itemsData,
      });

      return tx.suratPeringatan.findUnique({
        where: { id: sp.id },
        include: {
          items: true,
          lhp: {
            select: {
              id: true,
              nomor_lhp: true,
              irban_id: true,
              simpeg_unit_kerja_id: true,
            },
          },
        },
      });
    });

    // 14. Audit Log
    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'CREATE_SURAT_PERINGATAN',
      entity: 'SuratPeringatan',
      entity_id: createdSp!.id,
      metadata: {
        lhp_id: lhp.id,
        nomor_lhp: lhp.nomor_lhp,
        level: dto.level,
        nomor_surat: dto.nomor_surat,
        outstanding_count: outstandingRekomendasis.length,
        recipient_nama: recipientNama,
      },
    });

    return {
      ...createdSp,
      unit_kerja_nama: unitKerjaNama,
    };
  }

  /**
   * Regenerate PDF draft Surat Peringatan sebelum ditandatangani
   */
  async regenerateDraft(id: string, currentUser: AuthenticatedUser) {
    this.irbanScopeService.assertCanMutate(currentUser);

    const sp = await this.prisma.suratPeringatan.findUnique({
      where: { id },
      include: {
        lhp: true,
        items: {
          include: {
            rekomendasi: {
              include: { temuan: true },
            },
          },
        },
      },
    });

    if (!sp) {
      throw new NotFoundException(
        `Surat Peringatan dengan ID ${id} tidak ditemukan`,
      );
    }

    this.irbanScopeService.validateIrbanAccess(currentUser, sp.lhp.irban_id);

    // KUNCI IMUTABILITAS: Jika sudah signed, dilarang generate ulang draft
    if (sp.signed_at || sp.signed_path) {
      throw new BadRequestException(
        'Surat Peringatan ini telah ditandatangani secara digital (TTE) dan berstatus immutable. PDF draft tidak dapat diubah.',
      );
    }
    this.assertNoPendingTte(sp);

    // Ambil template aktif
    const activeTpl = await this.prisma.suratTemplate.findFirst({
      where: { jenis_surat: sp.level, is_active: true },
      orderBy: { versi: 'desc' },
    });

    const opd = await this.simpegAdapter.findUnitKerjaById(
      sp.simpeg_unit_kerja_id,
    );
    const unitKerjaNama = opd?.unit_kerja || 'Perangkat Daerah';

    const pdfItems = sp.items.map((item, idx) => ({
      nomor: idx + 1,
      temuan: item.rekomendasi
        ? `[Temuan #${item.rekomendasi.temuan.nomor_urut}] ${item.rekomendasi.temuan.judul}`
        : item.uraian_snapshot,
      rekomendasi: item.rekomendasi
        ? `[Rekomendasi #${item.rekomendasi.nomor_urut}] ${item.rekomendasi.uraian}`
        : item.uraian_snapshot,
      nilai: item.nilai_rekomendasi_snapshot
        ? Number(item.nilai_rekomendasi_snapshot)
        : null,
    }));

    const pdfBuffer = await this.pdfGenerator.generateDraftPdf({
      nomor_surat: sp.nomor_surat,
      tanggal_surat: sp.tanggal_surat,
      level: sp.level,
      unit_kerja_nama: unitKerjaNama,
      recipient_nama: sp.recipient_nama,
      recipient_nip: sp.recipient_nip,
      recipient_jabatan: sp.recipient_jabatan,
      nomor_lhp: sp.lhp.nomor_lhp,
      tanggal_lhp: sp.lhp.tanggal_lhp,
      tanggal_diterima_lhp: sp.lhp.tanggal_diterima_lhp,
      konten_template: activeTpl?.konten_html,
      items: pdfItems,
    });

    // Simpan file draft baru
    const draftFileName = `${crypto.randomUUID()}.pdf`;
    const draftRelativePath = `surat-peringatan/draft/${draftFileName}`;
    const draftAbsolutePath = path.join(this.getDraftDir(), draftFileName);
    fs.writeFileSync(draftAbsolutePath, pdfBuffer);

    // Hapus draft lama jika ada
    if (sp.draft_path) {
      const oldPath = path.join(
        this.filesService.getUploadsRoot(),
        sp.draft_path,
      );
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch {
          // ignore cleanup error
        }
      }
    }

    const updated = await this.prisma.suratPeringatan.update({
      where: { id },
      data: {
        draft_path: draftRelativePath,
        template_version: activeTpl?.versi || sp.template_version,
      },
      include: {
        items: true,
        lhp: {
          select: {
            id: true,
            nomor_lhp: true,
            irban_id: true,
            simpeg_unit_kerja_id: true,
          },
        },
      },
    });

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'REGENERATE_DRAFT_SURAT_PERINGATAN',
      entity: 'SuratPeringatan',
      entity_id: id,
      metadata: {
        nomor_surat: sp.nomor_surat,
        level: sp.level,
        new_draft_path: draftRelativePath,
      },
    });

    return {
      ...updated,
      unit_kerja_nama: unitKerjaNama,
    };
  }

  /**
   * Mengubah metadata draft surat peringatan sebelum signed
   */
  async update(
    id: string,
    dto: UpdateSuratPeringatanDto,
    currentUser: AuthenticatedUser,
  ) {
    this.irbanScopeService.assertCanMutate(currentUser);

    const sp = await this.prisma.suratPeringatan.findUnique({
      where: { id },
      include: { lhp: true },
    });

    if (!sp) {
      throw new NotFoundException(
        `Surat Peringatan dengan ID ${id} tidak ditemukan`,
      );
    }

    this.irbanScopeService.validateIrbanAccess(currentUser, sp.lhp.irban_id);

    if (sp.signed_at || sp.signed_path) {
      throw new BadRequestException(
        'Surat Peringatan yang telah ditandatangani (TTE) bersifat permanen (immutable) dan tidak dapat diubah.',
      );
    }
    this.assertNoPendingTte(sp);

    if (dto.nomor_surat && dto.nomor_surat.trim() !== sp.nomor_surat) {
      const existingNomor = await this.prisma.suratPeringatan.findUnique({
        where: { nomor_surat: dto.nomor_surat.trim() },
      });
      if (existingNomor && existingNomor.id !== id) {
        throw new ConflictException(
          `Nomor surat "${dto.nomor_surat}" sudah digunakan`,
        );
      }
    }

    let recipientNip = sp.recipient_nip;
    let recipientNama = sp.recipient_nama;
    let recipientJabatan = sp.recipient_jabatan;

    if (dto.pejabat_id) {
      const pej = await this.pejabatService.findById(dto.pejabat_id);
      recipientNip = pej.nip;
      recipientNama = pej.nama;
      recipientJabatan = pej.jabatan;
    }

    await this.prisma.suratPeringatan.update({
      where: { id },
      data: {
        nomor_surat: dto.nomor_surat ? dto.nomor_surat.trim() : sp.nomor_surat,
        tanggal_surat: dto.tanggal_surat
          ? new Date(dto.tanggal_surat)
          : sp.tanggal_surat,
        recipient_nip: recipientNip,
        recipient_nama: recipientNama,
        recipient_jabatan: recipientJabatan,
      },
    });

    return this.regenerateDraft(id, currentUser);
  }

  /**
   * Menghapus Surat Peringatan (HANYA jika belum ditandatangani secara digital)
   */
  async delete(id: string, currentUser: AuthenticatedUser) {
    this.irbanScopeService.assertCanMutate(currentUser);

    const sp = await this.prisma.suratPeringatan.findUnique({
      where: { id },
      include: { lhp: true },
    });

    if (!sp) {
      throw new NotFoundException(
        `Surat Peringatan dengan ID ${id} tidak ditemukan`,
      );
    }

    this.irbanScopeService.validateIrbanAccess(currentUser, sp.lhp.irban_id);

    // IMUTABILITAS: Dilarang keras menghapus surat bertandatangan TTE
    if (sp.signed_at || sp.signed_path) {
      throw new BadRequestException(
        'Surat Peringatan yang telah ditandatangani secara digital (TTE) dilarang dihapus (immutable legal document).',
      );
    }
    this.assertNoPendingTte(sp);

    // Hapus fisik draft jika ada
    if (sp.draft_path) {
      const p = path.join(this.filesService.getUploadsRoot(), sp.draft_path);
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch {
          // ignore cleanup error
        }
      }
    }

    await this.prisma.suratPeringatan.delete({
      where: { id },
    });

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'DELETE_SURAT_PERINGATAN',
      entity: 'SuratPeringatan',
      entity_id: id,
      metadata: {
        nomor_surat: sp.nomor_surat,
        level: sp.level,
        lhp_id: sp.lhp_id,
      },
    });

    return {
      success: true,
      message: `Surat Peringatan ${sp.nomor_surat} berhasil dihapus.`,
    };
  }

  /**
   * Mendapatkan daftar Surat Peringatan dengan filter dan scoping Irban
   */
  async findAll(
    query: QuerySuratPeringatanDto,
    currentUser: AuthenticatedUser,
  ) {
    const effectiveIrbanId = this.irbanScopeService.resolveEffectiveIrbanId(
      currentUser,
      query.irban_id,
    );

    const where: Prisma.SuratPeringatanWhereInput = {};

    if (query.lhp_id) {
      where.lhp_id = query.lhp_id;
    }

    if (query.level) {
      where.level = query.level;
    }

    if (effectiveIrbanId) {
      where.lhp = {
        irban_id: effectiveIrbanId,
      };
    }

    if (query.tahun) {
      const thn = parseInt(query.tahun, 10);
      if (!isNaN(thn)) {
        const start = new Date(`${thn}-01-01T00:00:00.000Z`);
        const end = new Date(`${thn + 1}-01-01T00:00:00.000Z`);
        where.tanggal_surat = { gte: start, lt: end };
      }
    }

    const items = await this.prisma.suratPeringatan.findMany({
      where,
      include: {
        lhp: {
          select: {
            id: true,
            nomor_lhp: true,
            irban_id: true,
            simpeg_unit_kerja_id: true,
            tanggal_lhp: true,
            tanggal_diterima_lhp: true,
            closed_at: true,
          },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Populate nama OPD dari SIMPEG
    const unitKerjaIds = Array.from(
      new Set(items.map((i) => i.simpeg_unit_kerja_id)),
    );
    const unitKerjaMap = new Map<string, string>();
    for (const ukId of unitKerjaIds) {
      const opd = await this.simpegAdapter.findUnitKerjaById(ukId);
      if (opd) {
        unitKerjaMap.set(ukId, opd.unit_kerja);
      }
    }

    return items.map((i) => ({
      ...i,
      unit_kerja_nama:
        unitKerjaMap.get(i.simpeg_unit_kerja_id) || 'Perangkat Daerah',
      items_count: i._count.items,
    }));
  }

  /**
   * Detail Surat Peringatan lengkap dengan snapshot items
   */
  async findById(id: string, currentUser: AuthenticatedUser) {
    const sp = await this.prisma.suratPeringatan.findUnique({
      where: { id },
      include: {
        lhp: {
          include: {
            irban: true,
            jenis_pemeriksaan: true,
          },
        },
        items: true,
      },
    });

    if (!sp) {
      throw new NotFoundException(
        `Surat Peringatan dengan ID ${id} tidak ditemukan`,
      );
    }

    this.irbanScopeService.validateIrbanAccess(currentUser, sp.lhp.irban_id);

    const opd = await this.simpegAdapter.findUnitKerjaById(
      sp.simpeg_unit_kerja_id,
    );

    return {
      ...sp,
      unit_kerja_nama: opd?.unit_kerja || 'Perangkat Daerah',
    };
  }

  /**
   * Mengambil file stream draft PDF
   */
  async getDraftFileStream(id: string, currentUser: AuthenticatedUser) {
    const sp = await this.findById(id, currentUser);

    if (!sp.draft_path) {
      throw new NotFoundException('Berkas PDF draft belum digenerate');
    }

    const fullPath = path.join(
      this.filesService.getUploadsRoot(),
      sp.draft_path,
    );
    if (!fs.existsSync(fullPath)) {
      // Regenerate on the fly if physical file missing
      const regenerated = await this.regenerateDraft(id, currentUser);
      const newPath = path.join(
        this.filesService.getUploadsRoot(),
        regenerated.draft_path!,
      );
      const stat = fs.statSync(newPath);
      return {
        stream: fs.createReadStream(newPath),
        filename: `Draft_${sp.level}_${sp.nomor_surat.replace(/[/\\]/g, '_')}.pdf`,
        size: stat.size,
      };
    }

    const stat = fs.statSync(fullPath);
    return {
      stream: fs.createReadStream(fullPath),
      filename: `Draft_${sp.level}_${sp.nomor_surat.replace(/[/\\]/g, '_')}.pdf`,
      size: stat.size,
    };
  }

  /**
   * Menandatangani Surat Peringatan secara elektronik melalui API Gateway
   * Esign Konsel (TTE BSrE).
   *
   * Aturan idempotensi mengikuti panduan gateway:
   * - Satu operasi = satu Idempotency-Key yang disimpan SEBELUM request dikirim.
   * - Timeout / status `unknown` tidak memicu tanda tangan ulang dengan key baru.
   *   Percobaan berikutnya memeriksa status (jika ada request_id) atau mengirim
   *   ulang dengan key dan isi yang sama.
   * - Status `failed` boleh dicoba lagi dengan key baru setelah penyebab
   *   diperbaiki (mis. passphrase diketik ulang).
   */
  async signTte(
    id: string,
    dto: SignSuratPeringatanDto,
    currentUser: AuthenticatedUser,
  ) {
    this.irbanScopeService.assertCanMutate(currentUser);

    const sp = await this.prisma.suratPeringatan.findUnique({
      where: { id },
      include: {
        lhp: true,
      },
    });

    if (!sp) {
      throw new NotFoundException(
        `Surat Peringatan dengan ID ${id} tidak ditemukan`,
      );
    }

    this.irbanScopeService.validateIrbanAccess(currentUser, sp.lhp.irban_id);

    // 1. Cek imutabilitas: jika sudah signed, dilarang tanda tangan ulang
    if (sp.signed_at || sp.signed_path) {
      throw new ConflictException(
        'Surat Peringatan ini sudah ditandatangani secara elektronik (TTE)',
      );
    }

    // 2. Lock in-memory untuk klik ganda pada instance yang sama
    if (this.signingLocks.has(id)) {
      throw new ConflictException(
        'Proses penandatanganan TTE sedang berlangsung untuk surat ini. Harap tunggu.',
      );
    }

    this.signingLocks.add(id);

    let idempotencyKey: string | null = null;
    try {
      // 3. Transaksi sebelumnya belum tuntas: periksa status, jangan tanda tangan ulang
      if (sp.tte_request_id && sp.tte_status && sp.tte_status !== 'failed') {
        const resumed = await this.resumeTteTransaction(
          sp,
          sp.tte_request_id,
          currentUser,
        );
        if (resumed) return resumed;
        // Status akhirnya `failed`: lanjut ke percobaan baru dengan key baru.
        sp.tte_request_id = null;
        sp.tte_status = 'failed';
      }

      // 4. Tentukan Idempotency-Key. Pakai ulang key lama hanya bila hasil
      //    percobaan sebelumnya belum pasti dan belum ada request_id.
      const reuseKey =
        Boolean(sp.tte_idempotency_key) &&
        !sp.tte_request_id &&
        (sp.tte_status === 'unknown' || sp.tte_status === 'sending');
      idempotencyKey = reuseKey ? sp.tte_idempotency_key! : crypto.randomUUID();

      // 5. Muat berkas draft PDF fisik
      let draftPath = sp.draft_path;
      let fullDraftPath = draftPath
        ? path.join(this.filesService.getUploadsRoot(), draftPath)
        : null;

      if (!fullDraftPath || !fs.existsSync(fullDraftPath)) {
        const regenerated = await this.regenerateDraft(id, currentUser);
        draftPath = regenerated.draft_path;
        fullDraftPath = path.join(
          this.filesService.getUploadsRoot(),
          draftPath!,
        );
      }

      const draftBuffer = fs.readFileSync(fullDraftPath);

      // 6. Klaim operasi di database (aman lintas instance) dan simpan key
      //    SEBELUM request dikirim ke gateway.
      const staleBefore = new Date(Date.now() - TTE_SENDING_STALE_MS);
      const claimed = await this.prisma.suratPeringatan.updateMany({
        where: {
          id,
          signed_at: null,
          OR: [
            { tte_status: null },
            { tte_status: { not: 'sending' } },
            { tte_attempted_at: null },
            { tte_attempted_at: { lt: staleBefore } },
          ],
        },
        data: {
          tte_status: 'sending',
          tte_idempotency_key: idempotencyKey,
          tte_request_id: null,
          tte_error_code: null,
          tte_attempted_at: new Date(),
        },
      });
      if (claimed.count === 0) {
        throw new ConflictException(
          'Proses penandatanganan TTE sedang berlangsung untuk surat ini. Harap tunggu.',
        );
      }

      // 7. Kirim ke gateway TTE (passphrase/token tidak pernah dicatat ke log)
      let tteResult: Awaited<ReturnType<TteClient['signPdf']>>;
      try {
        tteResult = await this.tteClient.signPdf({
          nomor: sp.nomor_surat,
          nik: dto.nik.trim(),
          passphrase: dto.passphrase,
          idempotencyKey,
          pdfBuffer: draftBuffer,
          filename: `${sp.level}_${sp.nomor_surat.replace(/[^A-Za-z0-9._-]/g, '_')}.pdf`,
        });
      } catch (error) {
        await this.recordTteFailure(id, error, idempotencyKey);
        throw this.toTteHttpException(error);
      }

      // 8. Simpan PDF hasil dan tandai surat signed
      return await this.finalizeSignedSp(
        sp,
        tteResult.signedPdfBuffer,
        tteResult.requestId,
        currentUser,
      );
    } catch (error) {
      await this.auditService.log({
        actor_id: currentUser.id,
        actor_role: currentUser.role,
        action: 'TTE_SIGN_FAILED',
        entity: 'SuratPeringatan',
        entity_id: id,
        metadata: {
          nomor_surat: sp.nomor_surat,
          idempotency_key: idempotencyKey,
          tte_code:
            error instanceof TteGatewayError ? error.details.code : undefined,
          tte_request_id:
            error instanceof TteGatewayError
              ? error.details.requestId
              : undefined,
          error_message:
            error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw error;
    } finally {
      this.signingLocks.delete(id);
    }
  }

  /**
   * Periksa transaksi gateway yang belum tuntas. Mengembalikan surat signed bila
   * transaksi ternyata berhasil, `null` bila gagal (boleh dicoba lagi), atau
   * melempar ConflictException bila masih diproses / belum pasti.
   */
  private async resumeTteTransaction(
    sp: SuratPeringatan,
    requestId: string,
    currentUser: AuthenticatedUser,
  ) {
    let status: Awaited<ReturnType<TteClient['getStatus']>>;
    try {
      status = await this.tteClient.getStatus(requestId);
    } catch (error) {
      throw this.toTteHttpException(error);
    }

    if (status.status === 'succeeded') {
      let signedBuffer: Buffer;
      try {
        signedBuffer = await this.tteClient.downloadDocument(requestId);
      } catch (error) {
        if (error instanceof TteGatewayError && error.httpStatus === 410) {
          throw new ConflictException(
            `Dokumen sudah ditandatangani di gateway TTE (ID transaksi ${requestId}), tetapi masa simpan PDF hasil telah berakhir. Hubungi admin gateway TTE; jangan menandatangani ulang.`,
          );
        }
        throw this.toTteHttpException(error);
      }
      return this.finalizeSignedSp(sp, signedBuffer, requestId, currentUser);
    }

    if (status.status === 'failed') {
      await this.prisma.suratPeringatan.update({
        where: { id: sp.id },
        data: {
          tte_status: 'failed',
          tte_error_code: status.error_code ?? null,
          tte_idempotency_key: null,
        },
      });
      return null;
    }

    await this.prisma.suratPeringatan.update({
      where: { id: sp.id },
      data: { tte_status: status.status },
    });

    if (status.status === 'sending') {
      throw new ConflictException(
        `Penandatanganan masih diproses gateway TTE (ID transaksi ${requestId}). Coba periksa lagi beberapa saat lagi.`,
      );
    }
    throw new ConflictException(
      `Hasil penandatanganan belum pasti (ID transaksi ${requestId}). Minta admin gateway TTE memeriksa transaksi ini sebelum menandatangani ulang.`,
    );
  }

  private async finalizeSignedSp(
    sp: SuratPeringatan,
    signedPdfBuffer: Buffer,
    requestId: string | null,
    currentUser: AuthenticatedUser,
  ) {
    // Simpan berkas signed PDF fisik ke uploads/surat-peringatan/signed/
    const signedFileName = `${crypto.randomUUID()}.pdf`;
    const signedRelativePath = `surat-peringatan/signed/${signedFileName}`;
    const signedAbsolutePath = path.join(this.getSignedDir(), signedFileName);
    fs.writeFileSync(signedAbsolutePath, signedPdfBuffer);

    const signedAt = new Date();
    const updatedSp = await this.prisma.suratPeringatan.update({
      where: { id: sp.id },
      data: {
        signed_at: signedAt,
        signed_by: currentUser.id,
        signed_path: signedRelativePath,
        tte_status: 'succeeded',
        tte_request_id: requestId ?? sp.tte_request_id,
        tte_error_code: null,
      },
      include: {
        items: true,
        lhp: {
          select: {
            id: true,
            nomor_lhp: true,
            irban_id: true,
            simpeg_unit_kerja_id: true,
          },
        },
      },
    });

    // Audit Log aman (BEBAS SECRET)
    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'TTE_SIGN_SUCCESS',
      entity: 'SuratPeringatan',
      entity_id: sp.id,
      metadata: {
        nomor_surat: sp.nomor_surat,
        level: sp.level,
        signed_at: signedAt.toISOString(),
        signer_id: currentUser.id,
        tte_request_id: requestId,
      },
    });

    const opd = await this.simpegAdapter.findUnitKerjaById(
      sp.simpeg_unit_kerja_id,
    );

    return {
      ...updatedSp,
      unit_kerja_nama: opd?.unit_kerja || 'Perangkat Daerah',
      status: 'SIGNED',
    };
  }

  /** Catat hasil percobaan yang tidak berhasil tanpa menyimpan secret. */
  private async recordTteFailure(
    id: string,
    error: unknown,
    idempotencyKey: string,
  ) {
    let data: Prisma.SuratPeringatanUpdateInput;

    if (error instanceof TteConfigError) {
      // Tidak ada request yang dikirim.
      data = { tte_status: null, tte_idempotency_key: null };
    } else if (error instanceof TteGatewayError) {
      const { code, requestId, txStatus } = error.details;
      const uncertain =
        error.isTransportFailure ||
        error.httpStatus === 409 ||
        (error.httpStatus !== null && error.httpStatus >= 500) ||
        txStatus === 'unknown' ||
        txStatus === 'sending';

      data = uncertain
        ? {
            tte_status: txStatus === 'sending' ? 'sending' : 'unknown',
            tte_idempotency_key: idempotencyKey,
            tte_request_id: requestId ?? null,
            tte_error_code: code ?? null,
          }
        : {
            tte_status: 'failed',
            tte_idempotency_key: null,
            tte_request_id: requestId ?? null,
            tte_error_code: code ?? null,
          };
    } else {
      // Kesalahan tak terduga: anggap belum pasti, pertahankan key.
      data = { tte_status: 'unknown', tte_idempotency_key: idempotencyKey };
    }

    try {
      await this.prisma.suratPeringatan.update({ where: { id }, data });
    } catch {
      // Jangan menutupi error asli dari gateway.
    }
  }

  private toTteHttpException(error: unknown): Error {
    if (error instanceof HttpException) return error;
    if (error instanceof TteConfigError) {
      return new BadRequestException(error.message);
    }
    if (!(error instanceof TteGatewayError)) {
      return new BadGatewayException(
        'Terjadi kesalahan saat memproses tanda tangan elektronik',
      );
    }

    const ref = error.details.requestId
      ? ` (ID transaksi ${error.details.requestId})`
      : '';

    if (error.isTransportFailure) {
      return new GatewayTimeoutException(
        `${error.message}. Hasil penandatanganan belum pasti; klik Tandatangani lagi untuk memeriksa ulang dengan operasi yang sama.`,
      );
    }
    switch (error.httpStatus) {
      case 422:
        return new UnprocessableEntityException(error.message);
      case 409:
        return new ConflictException(
          `${error.message}${ref}. Operasi ini sudah tercatat di gateway TTE; hubungi admin gateway sebelum menandatangani ulang.`,
        );
      case 401:
      case 403:
        return new BadGatewayException(
          `Akses SIPATUH ke gateway TTE ditolak: ${error.message}. Hubungi admin gateway TTE.`,
        );
      case 429:
        return new ServiceUnavailableException(
          `Batas pemakaian gateway TTE tercapai: ${error.message}${
            error.details.retryAfterSeconds
              ? ` Coba lagi dalam ${error.details.retryAfterSeconds} detik.`
              : ''
          }`,
        );
      default:
        return new BadGatewayException(`${error.message}${ref}`);
    }
  }

  /** Draft tidak boleh berubah selama transaksi TTE belum tuntas. */
  private assertNoPendingTte(sp: Pick<SuratPeringatan, 'tte_status'>) {
    if (sp.tte_status === 'sending' || sp.tte_status === 'unknown') {
      throw new ConflictException(
        'Penandatanganan TTE untuk surat ini belum tuntas. Selesaikan atau periksa status TTE terlebih dahulu sebelum mengubah surat.',
      );
    }
  }

  /**
   * Mengambil file stream signed PDF yang telah di-TTE
   */
  async getSignedFileStream(id: string, currentUser: AuthenticatedUser) {
    const sp = await this.findById(id, currentUser);

    if (!sp.signed_path) {
      throw new NotFoundException(
        'Berkas PDF bertanda tangan digital (TTE) belum tersedia untuk surat ini',
      );
    }

    const fullPath = path.join(
      this.filesService.getUploadsRoot(),
      sp.signed_path,
    );
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException(
        'Berkas fisik PDF bertanda tangan tidak ditemukan di server',
      );
    }

    const stat = fs.statSync(fullPath);
    return {
      stream: fs.createReadStream(fullPath),
      filename: `Signed_${sp.level}_${sp.nomor_surat.replace(/[/\\]/g, '_')}.pdf`,
      size: stat.size,
    };
  }
}
