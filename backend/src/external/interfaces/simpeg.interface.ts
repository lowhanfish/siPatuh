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
  instansi: string; // instansi_id
  ref_instansi?: string | null;
  unit_induk?: number | null;
  status?: number;
}

export interface SimpegInstansi {
  id: string;
  instansi: string;
  status?: number;
  sub_unit_count?: number;
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
   * Mengambil seluruh daftar Instansi / OPD Induk (66 Instansi di Pemda Kab Konawe Selatan).
   */
  findAllInstansi(search?: string): Promise<SimpegInstansi[]>;

  /**
   * Mengambil satu Instansi berdasarkan ID.
   */
  findInstansiById(id: string): Promise<SimpegInstansi | null>;

  /**
   * Mengambil daftar Unit Kerja utama yang sah sebagai target LHP.
   */
  findUnitKerjaInduk(search?: string): Promise<SimpegUnitKerja[]>;

  /**
   * Mencari Unit Kerja dengan JOIN instansi untuk autocomplete sasaran audit LHP.
   */
  searchUnitKerjaWithInstansi(
    search?: string,
    limit?: number,
  ): Promise<SimpegUnitKerja[]>;

  /**
   * Mengambil satu Unit Kerja berdasarkan ID dengan JOIN instansi.
   */
  findUnitKerjaById(id: string): Promise<SimpegUnitKerja | null>;
}
