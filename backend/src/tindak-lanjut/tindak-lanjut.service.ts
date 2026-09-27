import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AttachmentTypeEnum, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IrbanScopeService } from '../irban/irban-scope.service';
import { FilesService, UploadedMulterFile } from '../files/files.service';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateTindakLanjutDto } from './dto/tindak-lanjut.dto';

@Injectable()
export class TindakLanjutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly irbanScopeService: IrbanScopeService,
    private readonly filesService: FilesService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Menambahkan iterasi tindak lanjut baru tanpa menimpa histori yang sudah ada
   */
  async create(
    rekomendasiId: string,
    dto: CreateTindakLanjutDto,
    currentUser: AuthenticatedUser,
    files?: UploadedMulterFile[],
  ) {
    this.irbanScopeService.assertCanMutate(currentUser);

    const rekomendasi = await this.prisma.rekomendasi.findUnique({
      where: { id: rekomendasiId },
      include: {
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
      },
    });

    if (!rekomendasi) {
      throw new NotFoundException(
        `Rekomendasi dengan ID ${rekomendasiId} tidak ditemukan`,
      );
    }

    this.irbanScopeService.validateIrbanAccess(
      currentUser,
      rekomendasi.temuan.lhp.irban_id,
      'WRITE',
    );

    if (rekomendasi.temuan.lhp.closed_at !== null) {
      throw new BadRequestException(
        'LHP terkait sudah ditandai selesai (closed). Tidak dapat menambah tindak lanjut baru.',
      );
    }

    // Buat record tindak lanjut baru (histori tidak pernah ditimpa)
    const tl = await this.prisma.tindakLanjut.create({
      data: {
        rekomendasi_id: rekomendasiId,
        tanggal_diterima: new Date(dto.tanggal_diterima),
        uraian: dto.uraian.trim(),
        nilai_tindak_lanjut:
          dto.nilai_tindak_lanjut !== undefined &&
          dto.nilai_tindak_lanjut !== null
            ? new Prisma.Decimal(dto.nilai_tindak_lanjut)
            : null,
        created_by: currentUser.id,
      },
      include: {
        created_by_user: {
          select: { id: true, egov_user_id: true, role: true },
        },
      },
    });

    // Simpan lampiran berkas bukti fisik jika diunggah
    const savedAttachments = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const saved = await this.filesService.saveUploadedFile(file, {
          subDir: 'tindak-lanjut',
          ownerType: AttachmentTypeEnum.TINDAK_LANJUT,
          ownerId: tl.id,
          allowedMimeTypes: [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ],
          maxSizeBytes: 20 * 1024 * 1024,
        });
        savedAttachments.push(saved.attachment);
      }
    }

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'CREATE_TINDAK_LANJUT',
      entity: 'TindakLanjut',
      entity_id: tl.id,
      metadata: {
        rekomendasi_id: rekomendasiId,
        tanggal_diterima: tl.tanggal_diterima,
        nilai_tindak_lanjut: tl.nilai_tindak_lanjut,
        files_count: savedAttachments.length,
      },
    });

    return {
      ...tl,
      attachments: savedAttachments,
    };
  }

  /**
   * Menampilkan seluruh histori iterasi tindak lanjut untuk suatu rekomendasi
   */
  async findByRekomendasiId(
    rekomendasiId: string,
    currentUser: AuthenticatedUser,
  ) {
    const rekomendasi = await this.prisma.rekomendasi.findUnique({
      where: { id: rekomendasiId },
      include: {
        temuan: {
          include: { lhp: { select: { irban_id: true } } },
        },
      },
    });

    if (!rekomendasi) {
      throw new NotFoundException(
        `Rekomendasi dengan ID ${rekomendasiId} tidak ditemukan`,
      );
    }

    this.irbanScopeService.validateIrbanAccess(
      currentUser,
      rekomendasi.temuan.lhp.irban_id,
      'READ',
    );

    const items = await this.prisma.tindakLanjut.findMany({
      where: { rekomendasi_id: rekomendasiId },
      orderBy: { tanggal_diterima: 'desc' },
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
    });

    // Ambil lampiran file untuk masing-masing tindak lanjut
    const tlIds = items.map((i) => i.id);
    const attachments = await this.prisma.attachment.findMany({
      where: {
        owner_type: AttachmentTypeEnum.TINDAK_LANJUT,
        owner_id: { in: tlIds },
      },
    });

    const attachmentMap = new Map<string, typeof attachments>();
    for (const att of attachments) {
      const list = attachmentMap.get(att.owner_id) || [];
      list.push(att);
      attachmentMap.set(att.owner_id, list);
    }

    return items.map((item) => ({
      ...item,
      attachments: attachmentMap.get(item.id) || [],
    }));
  }

  /**
   * Detail satu tindak lanjut
   */
  async findById(id: string, currentUser: AuthenticatedUser) {
    const tl = await this.prisma.tindakLanjut.findUnique({
      where: { id },
      include: {
        created_by_user: {
          select: { id: true, egov_user_id: true, role: true },
        },
        rekomendasi: {
          include: {
            temuan: {
              include: { lhp: { select: { irban_id: true } } },
            },
          },
        },
        verifikasis: {
          include: {
            verifier: {
              select: { id: true, egov_user_id: true, role: true },
            },
            status_rekomendasi: true,
          },
        },
      },
    });

    if (!tl) {
      throw new NotFoundException(
        `Tindak lanjut dengan ID ${id} tidak ditemukan`,
      );
    }

    this.irbanScopeService.validateIrbanAccess(
      currentUser,
      tl.rekomendasi.temuan.lhp.irban_id,
      'READ',
    );

    const attachments = await this.prisma.attachment.findMany({
      where: {
        owner_type: AttachmentTypeEnum.TINDAK_LANJUT,
        owner_id: id,
      },
    });

    return {
      ...tl,
      attachments,
    };
  }

  /**
   * Menghitung total nilai tindak lanjut dan sisa secara akurat (Decimal)
   * Status rekomendasi tetap ditentukan manual oleh verifier, bukan otomatis.
   */
  async getFinancialSummary(
    rekomendasiId: string,
    currentUser: AuthenticatedUser,
  ) {
    const rekomendasi = await this.prisma.rekomendasi.findUnique({
      where: { id: rekomendasiId },
      include: {
        status_rekomendasi: true,
        temuan: {
          include: { lhp: { select: { irban_id: true } } },
        },
        tindak_lanjuts: {
          select: { nilai_tindak_lanjut: true },
        },
      },
    });

    if (!rekomendasi) {
      throw new NotFoundException(
        `Rekomendasi dengan ID ${rekomendasiId} tidak ditemukan`,
      );
    }

    this.irbanScopeService.validateIrbanAccess(
      currentUser,
      rekomendasi.temuan.lhp.irban_id,
      'READ',
    );

    const nilaiRekomendasiNum = rekomendasi.nilai_rekomendasi
      ? Number(rekomendasi.nilai_rekomendasi)
      : null;

    let totalTindakLanjut = 0;
    for (const tl of rekomendasi.tindak_lanjuts) {
      if (tl.nilai_tindak_lanjut) {
        totalTindakLanjut += Number(tl.nilai_tindak_lanjut);
      }
    }

    let sisa: number | null = null;
    let persentase: number | null = null;

    if (nilaiRekomendasiNum !== null) {
      sisa = Math.max(0, nilaiRekomendasiNum - totalTindakLanjut);
      persentase =
        nilaiRekomendasiNum > 0
          ? Number(((totalTindakLanjut / nilaiRekomendasiNum) * 100).toFixed(2))
          : 0;
    }

    return {
      rekomendasi_id: rekomendasiId,
      status_saat_ini: rekomendasi.status_rekomendasi.nama,
      kategori_status: rekomendasi.status_rekomendasi.kategori,
      nilai_rekomendasi: nilaiRekomendasiNum,
      total_tindak_lanjut: totalTindakLanjut,
      sisa,
      persentase_selesai: persentase,
      catatan_kebijakan:
        'Persentase 100% tidak otomatis mengubah status menjadi "Sesuai". Status akhir tetap ditetapkan manual oleh verifier.',
    };
  }

  /**
   * Mengambil file lampiran terproteksi
   */
  async getAttachmentFile(
    tindakLanjutId: string,
    attachmentId: string,
    currentUser: AuthenticatedUser,
  ) {
    const tl = await this.prisma.tindakLanjut.findUnique({
      where: { id: tindakLanjutId },
      include: {
        rekomendasi: {
          include: {
            temuan: { include: { lhp: { select: { irban_id: true } } } },
          },
        },
      },
    });

    if (!tl) {
      throw new NotFoundException('Tindak lanjut tidak ditemukan');
    }

    this.irbanScopeService.validateIrbanAccess(
      currentUser,
      tl.rekomendasi.temuan.lhp.irban_id,
      'READ',
    );

    const attachment = await this.prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        owner_type: AttachmentTypeEnum.TINDAK_LANJUT,
        owner_id: tindakLanjutId,
      },
    });

    if (!attachment) {
      throw new NotFoundException('Lampiran berkas tidak ditemukan');
    }

    const absolutePath = this.filesService.resolveSecurePath(
      attachment.file_path,
    );

    return {
      absolutePath,
      filename: attachment.original_name,
      mimeType: attachment.mime_type,
    };
  }
}
