import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { KategoriStatusEnum, Prisma, SpLevelEnum } from '@prisma/client';
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
import { TteClient } from '../external/tte/tte.client';
import {
  CreateSuratPeringatanDto,
  QuerySuratPeringatanDto,
  SignSuratPeringatanDto,
  UpdateSuratPeringatanDto,
} from './dto/create-surat-peringatan.dto';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

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
   * Menandatangani Surat Peringatan secara elektronik melalui integrasi TTE BSrE
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

    // 2. Lock concurrency in-memory untuk mencegah double-click signing
    if (this.signingLocks.has(id)) {
      throw new ConflictException(
        'Proses penandatanganan TTE sedang berlangsung untuk surat ini. Harap tunggu.',
      );
    }

    this.signingLocks.add(id);

    try {
      // 3. Muat berkas draft PDF fisik
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

      // 4. Kirim ke wrapper TTE (tanpa mencatat password/passphrase/token ke log)
      const tteResult = await this.tteClient.signPdf({
        judul: `Surat Peringatan ${sp.level}`,
        nomor: sp.nomor_surat,
        nik: dto.nik.trim(),
        passphrase: dto.passphrase,
        pdfBuffer: draftBuffer,
      });

      // 5. Simpan berkas signed PDF fisik ke uploads/surat-peringatan/signed/
      const signedFileName = `${crypto.randomUUID()}.pdf`;
      const signedRelativePath = `surat-peringatan/signed/${signedFileName}`;
      const signedAbsolutePath = path.join(this.getSignedDir(), signedFileName);
      fs.writeFileSync(signedAbsolutePath, tteResult.signedPdfBuffer);

      // 6. Update database record secara atomic
      const signedAt = new Date();
      const updatedSp = await this.prisma.suratPeringatan.update({
        where: { id },
        data: {
          signed_at: signedAt,
          signed_by: currentUser.id,
          signed_path: signedRelativePath,
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

      // 7. Audit Log aman (BEBAS SECRET)
      await this.auditService.log({
        actor_id: currentUser.id,
        actor_role: currentUser.role,
        action: 'TTE_SIGN_SUCCESS',
        entity: 'SuratPeringatan',
        entity_id: id,
        metadata: {
          nomor_surat: sp.nomor_surat,
          level: sp.level,
          signed_at: signedAt.toISOString(),
          signer_id: currentUser.id,
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
    } catch (error) {
      await this.auditService.log({
        actor_id: currentUser.id,
        actor_role: currentUser.role,
        action: 'TTE_SIGN_FAILED',
        entity: 'SuratPeringatan',
        entity_id: id,
        metadata: {
          nomor_surat: sp.nomor_surat,
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
