import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mysql, { Pool } from 'mysql2/promise';
import {
  ISimpegAdapter,
  SimpegBiodataProfile,
  SimpegUnitKerja,
} from '../interfaces/simpeg.interface';

@Injectable()
export class SimpegAdapter implements ISimpegAdapter, OnModuleDestroy {
  private readonly logger = new Logger(SimpegAdapter.name);
  private pool: Pool | null = null;

  constructor(private readonly configService: ConfigService) {}

  private getPool(): Pool {
    if (!this.pool) {
      const url = this.configService.get<string>('SIMPEG_DATABASE_URL');
      if (!url) {
        throw new Error('Konfigurasi SIMPEG_DATABASE_URL tidak ditemukan');
      }
      this.pool = mysql.createPool({
        uri: url,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        connectTimeout: 5000,
      });
    }
    return this.pool;
  }

  // Method ini memungkinkan injeksi pool untuk pengujian / mock
  setPool(pool: Pool): void {
    this.pool = pool;
  }

  /**
   * Mengambil satu biodata representatif untuk NIP.
   * SIMPEG memiliki sebagian NIP ganda, sehingga record berstatus Aktif
   * diprioritaskan lalu diurutkan secara deterministik berdasarkan primary key.
   */
  async findBiodataByNip(
    nip: string,
  ): Promise<SimpegBiodataProfile | null> {
    const normalizedNip = nip.trim();
    if (!normalizedNip) return null;

    try {
      const pool = this.getPool();
      const [rows] = await pool.query(
        `SELECT
           b.nip,
           b.nama,
           b.email,
           TRIM(CONCAT_WS(' ', NULLIF(b.gelar_depan, ''), b.nama)) AS nama_lengkap,
           TRIM(CONCAT_WS(', ',
             TRIM(CONCAT_WS(' ', NULLIF(b.gelar_depan, ''), b.nama)),
             NULLIF(b.gelar_belakang, '')
           )) AS nama_lengkap_gelar,
           b.unit_kerja AS unit_kerja_id,
           uk.unit_kerja,
           uk.unit_induk,
           uk.instansi AS instansi_id,
           i.instansi,
           b.jabatan AS jabatan_id,
           j.jabatan
         FROM biodata b
         LEFT JOIN unit_kerja uk ON b.unit_kerja = uk.id
         LEFT JOIN instansi i ON uk.instansi = i.id
         LEFT JOIN jabatan j ON b.jabatan = j._id
         WHERE b.nip = ?
         ORDER BY
           CASE WHEN b.KEDUDUKAN_HUKUM_ID = 1 THEN 0 ELSE 1 END,
           CASE WHEN b.unit_kerja IS NULL THEN 1 ELSE 0 END,
           CASE WHEN b.jabatan IS NULL THEN 1 ELSE 0 END,
           b.id ASC
         LIMIT 1`,
        [normalizedNip],
      );
      const list = rows as Array<Record<string, unknown>>;
      if (list.length === 0) return null;

      const row = list[0];
      return {
        nip: String(row.nip),
        nama: row.nama ? String(row.nama) : null,
        nama_lengkap: String(row.nama_lengkap || row.nama || normalizedNip),
        nama_lengkap_gelar: String(
          row.nama_lengkap_gelar || row.nama_lengkap || row.nama || normalizedNip,
        ),
        email: row.email ? String(row.email) : null,
        unit_kerja_id: row.unit_kerja_id ? String(row.unit_kerja_id) : null,
        unit_kerja: row.unit_kerja ? String(row.unit_kerja) : null,
        unit_induk:
          row.unit_induk === null || row.unit_induk === undefined
            ? null
            : Number(row.unit_induk),
        instansi_id: row.instansi_id ? String(row.instansi_id) : null,
        instansi: row.instansi ? String(row.instansi) : null,
        jabatan_id: row.jabatan_id ? String(row.jabatan_id) : null,
        jabatan: row.jabatan ? String(row.jabatan) : null,
      };
    } catch (err) {
      this.logger.error(
        `Gagal membaca biodata SIMPEG untuk NIP: ${(err as Error).message}`,
      );
      throw new Error('Gagal mengambil biodata dari sistem kepegawaian (SIMPEG)');
    }
  }

  /**
   * Mengambil daftar Unit Kerja sasaran LHP (wajib unit_induk = 1).
   * Hanya menggunakan field yang telah terverifikasi: id, unit_kerja, instansi, unit_induk.
   */
  async findUnitKerjaInduk(search?: string): Promise<SimpegUnitKerja[]> {
    try {
      const pool = this.getPool();
      let query =
        'SELECT id, unit_kerja, instansi, unit_induk FROM unit_kerja WHERE unit_induk = 1';
      const params: (string | number)[] = [];

      if (search && search.trim() !== '') {
        query += ' AND unit_kerja LIKE ?';
        params.push(`%${search.trim()}%`);
      }

      query += ' ORDER BY unit_kerja ASC';

      const [rows] = await pool.query(query, params);
      return (rows as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id),
        unit_kerja: String(row.unit_kerja),
        instansi: String(row.instansi),
        unit_induk: Number(row.unit_induk),
        status: row.status !== undefined ? Number(row.status) : undefined,
      }));
    } catch (err) {
      this.logger.error(`Gagal membaca data SIMPEG: ${(err as Error).message}`);
      throw new Error(
        'Gagal mengambil data unit kerja dari sistem kepegawaian (SIMPEG)',
      );
    }
  }

  /**
   * Mengambil satu Unit Kerja berdasarkan ID dengan filter unit_induk = 1.
   */
  async findUnitKerjaById(id: string): Promise<SimpegUnitKerja | null> {
    try {
      const pool = this.getPool();
      const query =
        'SELECT id, unit_kerja, instansi, unit_induk, status FROM unit_kerja WHERE id = ? AND unit_induk = 1 LIMIT 1';
      const [rows] = await pool.query(query, [id]);
      const list = rows as Array<Record<string, unknown>>;
      if (!list || list.length === 0) {
        return null;
      }
      const row = list[0];
      return {
        id: String(row.id),
        unit_kerja: String(row.unit_kerja),
        instansi: String(row.instansi),
        unit_induk: Number(row.unit_induk),
        status: row.status !== undefined ? Number(row.status) : undefined,
      };
    } catch (err) {
      this.logger.error(
        `Gagal membaca unit kerja SIMPEG id=${id}: ${(err as Error).message}`,
      );
      throw new Error(
        'Gagal mengambil detail unit kerja dari sistem kepegawaian (SIMPEG)',
      );
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
