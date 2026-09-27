import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mysql, { Pool } from 'mysql2/promise';
import {
  ISimpegAdapter,
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
