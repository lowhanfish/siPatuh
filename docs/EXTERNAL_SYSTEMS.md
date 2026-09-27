# SIPATUH - External Systems Integration

Dokumen ini memetakan seluruh sistem eksternal yang terhubung dengan SIPATUH, memisahkan secara tegas antara **Fakta Terverifikasi** vs **Hal yang Belum Diketahui (Unknowns)** guna mencegah asumsi palsu (*anti-hallucination*).

---

## 1. Database SIMPEG (Sistem Informasi Kepegawaian)
* **Kategori**: Database MySQL Eksternal (Read-Only).
* **Hak Akses**: **READ ONLY**. Dilarang keras melakukan INSERT, UPDATE, DELETE, atau migrasi skema.

### 1.1 Fakta Terverifikasi dari Database Riil
* Database berada pada host/server MySQL lokal yang sama dengan database SIPATUH (`simpeg`).
* Struktur tabel yang telah diinspeksi secara langsung:
  1. `simpeg.instansi`:
     * Kolom: `id` (Primary Key).
  2. `simpeg.unit_kerja`:
     * `id`: `varchar(25)` (String identifier, bukan integer).
     * `unit_kerja`: `varchar(150)` (Nama OPD/Dinas/Badan/Kecamatan).
     * `instansi`: `varchar(25)` (Foreign key mengarah ke `simpeg.instansi.id`).
     * `unit_induk`: `tinyint(1)` (1 = unit kerja induk/OPD).
     * `status`: `tinyint(1)` (1 = unit kerja aktif).
* **Aturan Bisnis Filter Unit Kerja**:
  * Unit kerja yang menjadi target pemeriksaan LHP di SIPATUH **HANYA** yang memiliki `unit_induk = 1` dan `status = 1` (tingkat dinas, badan, kecamatan, atau setara).
  * Unit kerja cabang/seksi (`unit_induk != 1`) diabaikan dari daftar target LHP.

---

## 2. Database EGOV (Single Identity / Akun Pemerintahan)
* **Kategori**: Database MySQL Eksternal (Read-Only).
* **Hak Akses**: **READ ONLY**. Dilarang keras melakukan INSERT, UPDATE, DELETE, atau migrasi skema.

### 2.1 Fakta Terverifikasi dari Database Riil
* Database berada pada host/server MySQL lokal yang sama dengan database SIPATUH (`egov`).
* **Tabel Pengguna**: `egov.users` (berisi 6.417+ pengguna riil).
* **Struktur Kolom Kredensial & Identitas**:
  * `id`: `varchar(35)` (Primary Key).
  * `username`: `varchar(20)` (Username pengguna).
  * `nama_nip`: `varchar(25)` (Menyimpan NIP pengguna untuk pencocokan NIP).
  * `password`: `text` (Password hash).
  * `email`: `text` (Email pengguna).
  * `hp`: `varchar(15)` (Nomor ponsel).
  * `unit_kerja`: `text` (Nama unit kerja saat pendaftaran).
* **Algoritma Hashing Kata Sandi**:
  * Menggunakan **Bcrypt** dengan format `$2a$12$` (panjang 60 karakter).
  * Dapat divalidasi langsung menggunakan pustaka standar `bcrypt` / `bcryptjs` tanpa perlu modifikasi database eksternal.
* **Aturan Bisnis**:
  * SIPATUH **TIDAK PERNAH** menyalin atau menyimpan password EGOV ke database lokal.
  * Pengguna yang terdaftar di EGOV harus diaktifkan secara manual di tabel lokal `User` SIPATUH oleh Super Admin sebelum dapat masuk ke sistem.

---

## 3. Layanan TTE Wrapper (`tte_api`)
* **Kategori**: Layanan REST API Eksternal (Server-to-Server).
* **Repositori Acuan**: `https://github.com/lowhanfish/tte_api`

### 3.1 Fakta Terverifikasi dari Kode Wrapper
* Wrapper dibangun dengan Node.js / Express.
* Menghubungkan aplikasi dengan endpoint eSign Pemerintah Kabupaten Konawe Selatan (BSrE).
* **Kontrak JSON Request**:
  * `TOKEN`: Token autentikasi rahasia wrapper (disimpan di backend SIPATUH via `TTE_API_TOKEN`).
  * `nik`: NIK pemilik sertifikat elektronik.
  * `passphrase`: Kata sandi kunci privat sertifikat elektronik.
  * `tagTTDX`: String penanda/anchor koordinat visual tanda tangan pada dokumen PDF.
  * `filebase64`: Berkas PDF dalam format base64.
  * `judul`: String judul surat (dikirim untuk kompatibilitas wrapper).
  * `nomor`: String nomor surat (dikirim untuk kompatibilitas wrapper).
* **Format Response Sukses**:
  ```json
  {
    "status": 200,
    "filename": "...pdf",
    "base64": "data:application/pdf;base64,..."
  }
  ```
* **Aturan Keamanan SIPATUH**:
  * Dilarang mencatat `TOKEN`, `passphrase`, `nik` penuh, atau data `filebase64` ke dalam log, database, maupun error tracking.
  * Backend SIPATUH wajib men-decode base64 dan menyimpan file PDF signed secara terproteksi di `backend/uploads/surat-peringatan/signed/`.
