/**
 * Kontrak Interface untuk database eksternal SIMPEG (READ-ONLY).
 * DILARANG menambahkan method mutasi (INSERT, UPDATE, DELETE).
 * Berdasarkan inspeksi riil simpeg.unit_kerja:
 * - id: varchar(25) (String)
 * - unit_kerja: varchar(150)
 * - instansi: varchar(25) (String)
 * - unit_induk: tinyint(1) (1 = induk)
 * - status: tinyint(1) (1 = aktif)
 */

export interface SimpegUnitKerja {
  id: string;
  unit_kerja: string;
  instansi: string;
  unit_induk: number;
  status?: number;
}

export interface SimpegInstansi {
  id: string;
  nama?: string;
}

export interface SimpegBiodataProfile {
  nip: string;
  nama: string | null;
  nama_lengkap: string;
  nama_lengkap_gelar: string;
  email: string | null;
  unit_kerja_id: string | null;
  unit_kerja: string | null;
  unit_induk: number | null;
  instansi_id: string | null;
  instansi: string | null;
  jabatan_id: string | null;
  jabatan: string | null;
}

export interface ISimpegAdapter {
  /**
   * Mengambil biodata aktif berdasarkan NIP untuk melengkapi identitas EGOV.
   */
  findBiodataByNip(nip: string): Promise<SimpegBiodataProfile | null>;

  /**
   * Mengambil daftar Unit Kerja utama yang sah sebagai target LHP (hanya unit_induk = 1).
   */
  findUnitKerjaInduk(search?: string): Promise<SimpegUnitKerja[]>;

  /**
   * Mengambil satu Unit Kerja berdasarkan ID dengan memastikan unit_induk = 1.
   */
  findUnitKerjaById(id: string): Promise<SimpegUnitKerja | null>;
}
