import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AttachmentTypeEnum } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface UploadedMulterFile {
  fieldname?: string;
  originalname: string;
  encoding?: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface SaveFileOptions {
  subDir:
    | 'lhp'
    | 'tindak-lanjut'
    | 'verifikasi'
    | 'surat-peringatan/draft'
    | 'surat-peringatan/signed'
    | 'exports';
  ownerType: AttachmentTypeEnum;
  ownerId: string;
  allowedMimeTypes?: string[];
  maxSizeBytes?: number;
}

@Injectable()
export class FilesService {
  private readonly uploadsRoot: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const configuredPath =
      this.configService.get<string>('UPLOAD_DESTINATION') || 'uploads';
    this.uploadsRoot = path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(process.cwd(), configuredPath);

    if (!fs.existsSync(this.uploadsRoot)) {
      fs.mkdirSync(this.uploadsRoot, { recursive: true });
    }
  }

  /**
   * Mengembalikan root direktori uploads yang aman
   */
  getUploadsRoot(): string {
    return this.uploadsRoot;
  }

  /**
   * Menyimpan buffer file ke disk lokal dan mencatat metadata ke tabel Attachment
   */
  async saveUploadedFile(file: UploadedMulterFile, options: SaveFileOptions) {
    if (!file || !file.buffer) {
      throw new BadRequestException('File tidak ditemukan dalam request');
    }

    const maxBytes = options.maxSizeBytes || 15 * 1024 * 1024; // Default 15MB
    if (file.size > maxBytes) {
      throw new BadRequestException(
        `Ukuran file (${(file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas maksimal ${(maxBytes / (1024 * 1024)).toFixed(0)} MB`,
      );
    }

    const allowedMimes = options.allowedMimeTypes || ['application/pdf'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipe file ${file.mimetype} tidak diizinkan. Tipe yang diperbolehkan: ${allowedMimes.join(', ')}`,
      );
    }

    // Target folder
    const targetDir = path.join(this.uploadsRoot, options.subDir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Nama file fisik unik
    const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    const absolutePath = path.join(targetDir, uniqueName);

    // Path traversal guard
    if (!absolutePath.startsWith(this.uploadsRoot)) {
      throw new BadRequestException('Upaya path traversal terdeteksi');
    }

    // Simpan buffer file
    await fs.promises.writeFile(absolutePath, file.buffer);

    // Relatif path yang disimpan ke DB
    const relativePath = path.join(options.subDir, uniqueName);

    // Buat record Attachment
    const attachment = await this.prisma.attachment.create({
      data: {
        owner_type: options.ownerType,
        owner_id: options.ownerId,
        original_name: file.originalname,
        stored_name: uniqueName,
        file_path: relativePath,
        mime_type: file.mimetype,
        file_size: file.size,
      },
    });

    return {
      attachment,
      relativePath,
      absolutePath,
    };
  }

  /**
   * Mengambil path absolut yang terproteksi untuk file yang tersimpan
   */
  resolveSecurePath(relativePath: string): string {
    const normalized = path
      .normalize(relativePath)
      .replace(/^(\.\.[/\\])+/, '');
    const absolutePath = path.join(this.uploadsRoot, normalized);

    if (!absolutePath.startsWith(this.uploadsRoot)) {
      throw new BadRequestException('Akses path file tidak valid');
    }

    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException('File fisik tidak ditemukan pada server');
    }

    return absolutePath;
  }

  /**
   * Menghapus file fisik jika diperlukan
   */
  async deleteFile(relativePath: string): Promise<boolean> {
    try {
      const absPath = this.resolveSecurePath(relativePath);
      if (fs.existsSync(absPath)) {
        await fs.promises.unlink(absPath);
      }
      return true;
    } catch {
      return false;
    }
  }
}
