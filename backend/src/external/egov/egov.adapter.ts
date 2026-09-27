import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mysql, { Pool } from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { IEgovAdapter, EgovUserRecord } from '../interfaces/egov.interface';

@Injectable()
export class EgovAdapter implements IEgovAdapter, OnModuleDestroy {
  private readonly logger = new Logger(EgovAdapter.name);
  private pool: Pool | null = null;

  constructor(private readonly configService: ConfigService) {}

  private getPool(): Pool {
    if (!this.pool) {
      const url = this.configService.get<string>('EGOV_DATABASE_URL');
      if (!url) {
        throw new Error('Konfigurasi EGOV_DATABASE_URL tidak ditemukan');
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
   * Helper untuk menginspeksi tabel dan skema EGOV riil secara murni read-only.
   */
  async inspectSchema(): Promise<
    Array<{ TABLE_NAME: string; COLUMN_NAME: string; DATA_TYPE: string }>
  > {
    try {
      const pool = this.getPool();
      const [rows] = await pool.query(
        `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         ORDER BY TABLE_NAME, ORDINAL_POSITION`,
      );
      return rows as Array<{
        TABLE_NAME: string;
        COLUMN_NAME: string;
        DATA_TYPE: string;
      }>;
    } catch (err) {
      this.logger.error(
        `Gagal menginspeksi skema EGOV: ${(err as Error).message}`,
      );
      throw new Error(
        'Koneksi ke database EGOV belum siap atau skema belum dapat dibaca.',
      );
    }
  }

  /**
   * Mencari entitas pengguna EGOV berdasarkan identifier (NIP atau Username).
   * Kolom pencocokan terverifikasi: username atau nama_nip.
   */
  async findUserByIdentifier(
    identifier: string,
  ): Promise<EgovUserRecord | null> {
    const trimmed = identifier ? identifier.trim() : '';
    if (!trimmed) {
      return null;
    }

    try {
      const pool = this.getPool();
      const query =
        'SELECT id, username, nama_nip, password, email, unit_kerja FROM users WHERE username = ? OR nama_nip = ? LIMIT 1';
      const [rows] = await pool.query(query, [trimmed, trimmed]);
      const list = rows as Array<Record<string, unknown>>;

      if (!list || list.length === 0) {
        return null;
      }

      const row = list[0] as {
        id: string | number;
        username: string;
        nama_nip?: string | null;
        password?: string | null;
        email?: string | null;
        unit_kerja?: string | null;
      };

      return {
        id: String(row.id),
        username: String(row.username),
        nip: row.nama_nip ? String(row.nama_nip) : null,
        nama: String(row.username), // Snapshot dasar nama/username
        email: row.email ? String(row.email) : null,
        unit_kerja: row.unit_kerja ? String(row.unit_kerja) : null,
        passwordHash: row.password ? String(row.password) : undefined,
        isActive: true,
      };
    } catch (err) {
      this.logger.error(
        `Error mencari pengguna EGOV: ${(err as Error).message}`,
      );
      throw new Error('Gagal memvalidasi kredensial ke sistem EGOV');
    }
  }

  /**
   * Mencari user EGOV berdasarkan ID riil (primary key di egov.users).
   */
  async findUserById(id: string): Promise<EgovUserRecord | null> {
    if (!id) return null;

    try {
      const pool = this.getPool();
      const query =
        'SELECT id, username, nama_nip, email, unit_kerja FROM users WHERE id = ? LIMIT 1';
      const [rows] = await pool.query(query, [id]);
      const list = rows as Array<Record<string, unknown>>;

      if (!list || list.length === 0) {
        return null;
      }

      const row = list[0] as {
        id: string | number;
        username: string;
        nama_nip?: string | null;
        email?: string | null;
        unit_kerja?: string | null;
      };

      return {
        id: String(row.id),
        username: String(row.username),
        nip: row.nama_nip ? String(row.nama_nip) : null,
        nama: String(row.username),
        email: row.email ? String(row.email) : null,
        unit_kerja: row.unit_kerja ? String(row.unit_kerja) : null,
        isActive: true,
      };
    } catch (err) {
      this.logger.error(
        `Error mencari pengguna EGOV by ID: ${(err as Error).message}`,
      );
      throw new Error('Gagal membaca data dari database EGOV');
    }
  }

  /**
   * Mencari daftar pengguna EGOV untuk aktivasi user SIPATUH oleh Super Admin.
   * Pencarian mencakup username atau NIP (nama_nip).
   */
  async searchUsers(query: string, limit = 20): Promise<EgovUserRecord[]> {
    const trimmed = query ? query.trim() : '';
    if (!trimmed) {
      return [];
    }

    try {
      const pool = this.getPool();
      const searchTerm = `%${trimmed}%`;
      const sql =
        'SELECT id, username, nama_nip, email, unit_kerja FROM users WHERE username LIKE ? OR nama_nip LIKE ? ORDER BY username ASC LIMIT ?';
      const [rows] = await pool.query(sql, [
        searchTerm,
        searchTerm,
        Math.min(limit, 50),
      ]);
      const list = rows as Array<{
        id: string | number;
        username: string;
        nama_nip?: string | null;
        email?: string | null;
        unit_kerja?: string | null;
      }>;

      return list.map((row) => ({
        id: String(row.id),
        username: String(row.username),
        nip: row.nama_nip ? String(row.nama_nip) : null,
        nama: String(row.username),
        email: row.email ? String(row.email) : null,
        unit_kerja: row.unit_kerja ? String(row.unit_kerja) : null,
        isActive: true,
      }));
    } catch (err) {
      this.logger.error(`Error search users EGOV: ${(err as Error).message}`);
      throw new Error('Gagal mencari data pengguna EGOV');
    }
  }

  /**
   * Memvalidasi kecocokan password polos terhadap password hash dari EGOV menggunakan Bcrypt.
   * Mengembalikan data pengguna bersih (tanpa passwordHash).
   * Password TIDAK PERNAH disimpan ke SIPATUH.
   */
  async verifyCredentials(
    identifier: string,
    plainPassword: string,
  ): Promise<EgovUserRecord | null> {
    if (!identifier || !plainPassword) {
      return null;
    }

    const user = await this.findUserByIdentifier(identifier);
    if (!user || !user.passwordHash) {
      return null;
    }

    try {
      const isMatch = await bcrypt.compare(plainPassword, user.passwordHash);
      if (!isMatch) {
        return null;
      }

      // Bersihkan hash password dari objek yang dikembalikan
      return {
        id: user.id,
        username: user.username,
        nip: user.nip,
        nama: user.nama,
        email: user.email,
        unit_kerja: user.unit_kerja,
        isActive: user.isActive,
      };
    } catch (err) {
      this.logger.error(
        `Error saat verifikasi Bcrypt hash: ${(err as Error).message}`,
      );
      return null;
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
