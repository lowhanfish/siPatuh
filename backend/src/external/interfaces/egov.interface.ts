/**
 * Kontrak Interface untuk database eksternal EGOV (READ-ONLY).
 * DILARANG menambahkan method mutasi (INSERT, UPDATE, DELETE).
 * Berdasarkan inspeksi riil egov.users:
 * - id: varchar(35)
 * - username: varchar(20)
 * - nama_nip: varchar(25)
 * - password: text (Bcrypt $2a$12$)
 * - email: text
 * - unit_kerja: text
 */

export interface EgovUserRecord {
  id: string;
  username: string;
  nip?: string | null;
  nama?: string | null;
  email?: string | null;
  unit_kerja?: string | null;
  // Hash password hanya digunakan dalam adapter verifikasi di memori internal, tidak pernah diteruskan ke luar
  passwordHash?: string;
  isActive?: boolean;
}

export interface IEgovAdapter {
  /**
   * Mencari entitas pengguna berdasarkan identifier (NIP atau username).
   */
  findUserByIdentifier(identifier: string): Promise<EgovUserRecord | null>;

  /**
   * Memvalidasi kecocokan password polos terhadap password hash dari EGOV menggunakan Bcrypt.
   * Tidak boleh menyalin atau menyimpan password ke database SIPATUH.
   */
  verifyCredentials(
    identifier: string,
    plainPassword: string,
  ): Promise<EgovUserRecord | null>;
}
