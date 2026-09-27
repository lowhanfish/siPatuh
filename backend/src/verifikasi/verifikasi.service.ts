import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AttachmentTypeEnum } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IrbanScopeService } from '../irban/irban-scope.service';
import { FilesService, UploadedMulterFile } from '../files/files.service';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateVerifikasiDto } from './dto/create-verifikasi.dto';

@Injectable()
export class VerifikasiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly irbanScopeService: IrbanScopeService,
    private readonly filesService: FilesService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Menambahkan hasil verifikasi manual dengan catatan wajib dan update status rekomendasi secara transaksional
   */
  async create(
    tindakLanjutId: string,
    dto: CreateVerifikasiDto,
    currentUser: AuthenticatedUser,
    file?: UploadedMulterFile,
  ) {
    this.irbanScopeService.assertCanMutate(currentUser);

    if (!dto.catatan || dto.catatan.trim().length === 0) {
      throw new BadRequestException('Catatan verifikasi tidak boleh kosong');
    }

    const tl = await this.prisma.tindakLanjut.findUnique({
      where: { id: tindakLanjutId },
      include: {
        rekomendasi: {
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
        },
      },
    });

    if (!tl) {
      throw new NotFoundException(
        `Tindak lanjut dengan ID ${tindakLanjutId} tidak ditemukan`,
      );
    }

    this.irbanScopeService.validateIrbanAccess(
      currentUser,
      tl.rekomendasi.temuan.lhp.irban_id,
      'WRITE',
    );

    if (tl.rekomendasi.temuan.lhp.closed_at !== null) {
      throw new BadRequestException(
        'LHP terkait sudah ditandai selesai (closed). Tidak dapat melakukan verifikasi.',
      );
    }

    // Validasi status rekomendasi hasil verifikasi
    const statusHasil = await this.prisma.statusRekomendasi.findUnique({
      where: { id: dto.status_rekomendasi_id },
    });

    if (!statusHasil || !statusHasil.is_active) {
      throw new BadRequestException(
        'Status rekomendasi yang dipilih tidak valid atau sudah nonaktif',
      );
    }

    // Transaksi atomik: Simpan record verifikasi dan perbarui status rekomendasi terkait
    const [verifikasi, updatedRekomendasi] = await this.prisma.$transaction([
      this.prisma.verifikasi.create({
        data: {
          tindak_lanjut_id: tindakLanjutId,
          catatan: dto.catatan.trim(),
          status_rekomendasi_id: dto.status_rekomendasi_id,
          verifier_id: currentUser.id,
        },
        include: {
          verifier: {
            select: { id: true, nama: true, nip: true, role: true },
          },
          status_rekomendasi: true,
        },
      }),
      this.prisma.rekomendasi.update({
        where: { id: tl.rekomendasi_id },
        data: { status_rekomendasi_id: dto.status_rekomendasi_id },
        include: { status_rekomendasi: true },
      }),
    ]);

    // Lampiran opsional untuk catatan verifikasi
    let savedAttachment = null;
    if (file) {
      const saved = await this.filesService.saveUploadedFile(file, {
        subDir: 'verifikasi',
        ownerType: AttachmentTypeEnum.VERIFIKASI,
        ownerId: verifikasi.id,
        allowedMimeTypes: [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        maxSizeBytes: 15 * 1024 * 1024,
      });
      savedAttachment = saved.attachment;
    }

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'VERIFY_TINDAK_LANJUT',
      entity: 'Verifikasi',
      entity_id: verifikasi.id,
      metadata: {
        tindak_lanjut_id: tindakLanjutId,
        rekomendasi_id: tl.rekomendasi_id,
        status_rekomendasi_sebelum: tl.rekomendasi.status_rekomendasi_id,
        status_rekomendasi_sesudah: statusHasil.nama,
        kategori_status: statusHasil.kategori,
      },
    });

    return {
      verifikasi,
      rekomendasi_updated: updatedRekomendasi,
      attachment: savedAttachment,
    };
  }

  /**
   * Menampilkan riwayat verifikasi pada tindak lanjut
   */
  async findByTindakLanjutId(
    tindakLanjutId: string,
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

    const items = await this.prisma.verifikasi.findMany({
      where: { tindak_lanjut_id: tindakLanjutId },
      orderBy: { verified_at: 'desc' },
      include: {
        verifier: {
          select: { id: true, nama: true, nip: true, role: true },
        },
        status_rekomendasi: true,
      },
    });

    const vIds = items.map((i) => i.id);
    const attachments = await this.prisma.attachment.findMany({
      where: {
        owner_type: AttachmentTypeEnum.VERIFIKASI,
        owner_id: { in: vIds },
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
   * Mengambil file lampiran verifikasi terproteksi
   */
  async getAttachmentFile(
    verifikasiId: string,
    attachmentId: string,
    currentUser: AuthenticatedUser,
  ) {
    const verifikasi = await this.prisma.verifikasi.findUnique({
      where: { id: verifikasiId },
      include: {
        tindak_lanjut: {
          include: {
            rekomendasi: {
              include: {
                temuan: { include: { lhp: { select: { irban_id: true } } } },
              },
            },
          },
        },
      },
    });

    if (!verifikasi) {
      throw new NotFoundException('Verifikasi tidak ditemukan');
    }

    this.irbanScopeService.validateIrbanAccess(
      currentUser,
      verifikasi.tindak_lanjut.rekomendasi.temuan.lhp.irban_id,
      'READ',
    );

    const attachment = await this.prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        owner_type: AttachmentTypeEnum.VERIFIKASI,
        owner_id: verifikasiId,
      },
    });

    if (!attachment) {
      throw new NotFoundException('Lampiran berkas verifikasi tidak ditemukan');
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
