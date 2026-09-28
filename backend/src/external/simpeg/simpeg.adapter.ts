import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mysql, { Pool } from 'mysql2/promise';
import {
  ISimpegAdapter,
  SimpegBiodataProfile,
  SimpegInstansi,
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
  async findBiodataByNip(nip: string): Promise<SimpegBiodataProfile | null> {
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
      const list = rows as Array<
        Record<string, string | number | null | undefined>
      >;
      if (list.length === 0) return null;

      const row = list[0];
      return {
        nip: String(row.nip ?? ''),
        nama: row.nama != null ? String(row.nama) : null,
        nama_lengkap: String(row.nama_lengkap || row.nama || normalizedNip),
        nama_lengkap_gelar: String(
          row.nama_lengkap_gelar ||
            row.nama_lengkap ||
            row.nama ||
            normalizedNip,
        ),
        email: row.email != null ? String(row.email) : null,
        unit_kerja_id:
          row.unit_kerja_id != null ? String(row.unit_kerja_id) : null,
        unit_kerja: row.unit_kerja != null ? String(row.unit_kerja) : null,
        unit_induk:
          row.unit_induk === null || row.unit_induk === undefined
            ? null
            : Number(row.unit_induk),
        instansi_id: row.instansi_id != null ? String(row.instansi_id) : null,
        instansi: row.instansi != null ? String(row.instansi) : null,
        jabatan_id: row.jabatan_id != null ? String(row.jabatan_id) : null,
        jabatan: row.jabatan != null ? String(row.jabatan) : null,
      };
    } catch (err) {
      this.logger.error(
        `Gagal membaca biodata SIMPEG untuk NIP: ${(err as Error).message}`,
      );
      throw new Error(
        'Gagal mengambil biodata dari sistem kepegawaian (SIMPEG)',
      );
    }
  }

  /**
   * Mengambil daftar seluruh Instansi / OPD Induk dari SIMPEG dengan kalkulasi jumlah sub-unit.
   */
  async findAllInstansi(search?: string): Promise<SimpegInstansi[]> {
    try {
      const pool = this.getPool();
      let query = `
        SELECT 
          i.id, 
          i.instansi, 
          i.status,
          COUNT(uk.id) AS sub_unit_count
        FROM instansi i
        LEFT JOIN unit_kerja uk ON uk.instansi = i.id
        WHERE i.status = 1
      `;
      const params: (string | number)[] = [];

      if (search && search.trim() !== '') {
        query += ' AND i.instansi LIKE ?';
        params.push(`%${search.trim()}%`);
      }

      query += ' GROUP BY i.id, i.instansi, i.status ORDER BY i.instansi ASC';

      const [rows] = await pool.query(query, params);
      const list = rows as Array<
        Record<string, string | number | null | undefined>
      >;
      return list.map((row) => ({
        id: String(row.id ?? ''),
        instansi: String(row.instansi ?? ''),
        status:
          row.status !== undefined && row.status !== null
            ? Number(row.status)
            : 1,
        sub_unit_count: Number(row.sub_unit_count || 0),
      }));
    } catch (err) {
      this.logger.error(
        `Gagal membaca data instansi SIMPEG: ${(err as Error).message}`,
      );
      throw new Error(
        'Gagal mengambil data instansi dari sistem kepegawaian (SIMPEG)',
      );
    }
  }

  /**
   * Mengambil detail satu Instansi berdasarkan ID.
   */
  async findInstansiById(id: string): Promise<SimpegInstansi | null> {
    try {
      const pool = this.getPool();
      const query = `
        SELECT 
          i.id, 
          i.instansi, 
          i.status,
          COUNT(uk.id) AS sub_unit_count
        FROM instansi i
        LEFT JOIN unit_kerja uk ON uk.instansi = i.id
        WHERE i.id = ?
        GROUP BY i.id, i.instansi, i.status
        LIMIT 1
      `;
      const [rows] = await pool.query(query, [id]);
      const list = rows as Array<
        Record<string, string | number | null | undefined>
      >;
      if (!list || list.length === 0) {
        return null;
      }
      const row = list[0];
      return {
        id: String(row.id ?? ''),
        instansi: String(row.instansi ?? ''),
        status:
          row.status !== undefined && row.status !== null
            ? Number(row.status)
            : 1,
        sub_unit_count: Number(row.sub_unit_count || 0),
      };
    } catch (err) {
      this.logger.error(
        `Gagal membaca instansi SIMPEG id=${id}: ${(err as Error).message}`,
      );
      throw new Error(
        'Gagal mengambil detail instansi dari sistem kepegawaian (SIMPEG)',
      );
    }
  }

  /**
   * Mengambil daftar Unit Kerja sasaran LHP.
   */
  async findUnitKerjaInduk(search?: string): Promise<SimpegUnitKerja[]> {
    try {
      const pool = this.getPool();
      let query = `
        SELECT 
          uk.id, 
          uk.unit_kerja, 
          uk.instansi, 
          uk.unit_induk, 
          uk.status,
          ins.instansi AS ref_instansi
        FROM unit_kerja uk
        LEFT JOIN instansi ins ON uk.instansi = ins.id
        WHERE 1 = 1
      `;
      const params: (string | number)[] = [];

      if (search && search.trim() !== '') {
        query += ' AND (uk.unit_kerja LIKE ? OR ins.instansi LIKE ?)';
        params.push(`%${search.trim()}%`, `%${search.trim()}%`);
      }

      query +=
        ' ORDER BY CASE WHEN uk.unit_induk = 1 THEN 0 ELSE 1 END, ins.instansi ASC, uk.unit_kerja ASC';

      const [rows] = await pool.query(query, params);
      const list = rows as Array<
        Record<string, string | number | null | undefined>
      >;
      return list.map((row) => ({
        id: String(row.id ?? ''),
        unit_kerja: String(row.unit_kerja ?? ''),
        instansi: String(row.instansi ?? ''),
        ref_instansi:
          row.ref_instansi != null ? String(row.ref_instansi) : null,
        unit_induk:
          row.unit_induk !== null && row.unit_induk !== undefined
            ? Number(row.unit_induk)
            : null,
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
   * Mencari Unit Kerja dengan query JOIN instansi untuk autocomplete sasaran audit LHP.
   */
  async searchUnitKerjaWithInstansi(
    search?: string,
    limit = 50,
  ): Promise<SimpegUnitKerja[]> {
    try {
      const pool = this.getPool();
      let query = `
        SELECT 
          uk.id, 
          uk.unit_kerja, 
          uk.instansi, 
          uk.unit_induk, 
          uk.status,
          ins.instansi AS ref_instansi
        FROM unit_kerja uk
        JOIN instansi ins ON uk.instansi = ins.id
        WHERE uk.status = 1
      `;
      const params: (string | number)[] = [];

      if (search && search.trim() !== '') {
        query += ' AND (uk.unit_kerja LIKE ? OR ins.instansi LIKE ?)';
        params.push(`%${search.trim()}%`, `%${search.trim()}%`);
      }

      query += `
        ORDER BY 
          CASE WHEN uk.unit_induk = 1 THEN 0 ELSE 1 END,
          ins.instansi ASC, 
          uk.unit_kerja ASC
        LIMIT ?
      `;
      params.push(limit);

      const [rows] = await pool.query(query, params);
      const list = rows as Array<
        Record<string, string | number | null | undefined>
      >;
      return list.map((row) => ({
        id: String(row.id ?? ''),
        unit_kerja: String(row.unit_kerja ?? ''),
        instansi: String(row.instansi ?? ''),
        ref_instansi:
          row.ref_instansi != null ? String(row.ref_instansi) : null,
        unit_induk:
          row.unit_induk !== null && row.unit_induk !== undefined
            ? Number(row.unit_induk)
            : null,
        status: row.status !== undefined ? Number(row.status) : undefined,
      }));
    } catch (err) {
      this.logger.error(
        `Gagal autocomplete unit kerja SIMPEG: ${(err as Error).message}`,
      );
      throw new Error('Gagal mencari unit kerja dari sistem SIMPEG');
    }
  }

  /**
   * Mengambil satu Unit Kerja berdasarkan ID dengan JOIN instansi.
   */
  async findUnitKerjaById(id: string): Promise<SimpegUnitKerja | null> {
    try {
      const pool = this.getPool();
      const query = `
        SELECT 
          uk.id, 
          uk.unit_kerja, 
          uk.instansi, 
          uk.unit_induk, 
          uk.status,
          ins.instansi AS ref_instansi
        FROM unit_kerja uk
        LEFT JOIN instansi ins ON uk.instansi = ins.id
        WHERE uk.id = ?
        LIMIT 1
      `;
      const [rows] = await pool.query(query, [id]);
      const list = rows as Array<
        Record<string, string | number | null | undefined>
      >;
      if (!list || list.length === 0) {
        return null;
      }
      const row = list[0];
      return {
        id: String(row.id ?? ''),
        unit_kerja: String(row.unit_kerja ?? ''),
        instansi: String(row.instansi ?? ''),
        ref_instansi:
          row.ref_instansi != null ? String(row.ref_instansi) : null,
        unit_induk:
          row.unit_induk === null || row.unit_induk === undefined
            ? null
            : Number(row.unit_induk),
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
