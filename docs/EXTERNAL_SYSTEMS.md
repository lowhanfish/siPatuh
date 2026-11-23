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

## 3. API Gateway TTE Esign Konsel (BSrE Kab. Konawe Selatan)
* **Kategori**: Layanan REST API Eksternal (Server-to-Server).
* **Base URL**: `https://esignkonsel.konaweselatankab.go.id` (`TTE_GATEWAY_URL`). Panduan di `/admin/guide`, Swagger di `/docs`.
* **Implementasi**: `backend/src/external/tte/tte.client.ts`. Menggantikan kontrak wrapper lama (`tte_api`, JSON base64 + `TOKEN`).

### 3.1 Kontrak (dari panduan gateway, dibaca 23 November 2026)
* **Autentikasi**: OAuth2 `client_credentials`. `POST /oauth/token` dengan Basic Auth `TTE_CLIENT_ID` (`konsel_...`) / `TTE_CLIENT_SECRET` (`sign_...`), body `application/x-www-form-urlencoded` (`grant_type`, `scope`). Access token `tte_...` berlaku maks 900 detik, tanpa refresh token. SIPATUH meng-cache token sampai 30 detik sebelum `expires_in`.
* **Scope**: `gateway:read`, `sign:create`, `sign:read`, `document:download` (`TTE_SCOPE`).
* **Pembatasan opsional**: IP keluar server dan header `Origin` (`TTE_ORIGIN`) bila admin gateway membatasi URL aplikasi.
* **Signing**: `POST /api/v1/signkonsel`, `multipart/form-data` dengan tepat 4 field: `file` (PDF, maks 25 MiB), `nik` (16 digit teks), `passphrase` (maks 256), `tag_koordinat` (tepat 1 karakter, SIPATUH memakai `TTE_SIGNATURE_TAG=$`). Header wajib `Idempotency-Key` (8–128 karakter `[A-Za-z0-9._:-]`).
  * Sukses: HTTP 200, body PDF biner, header `X-Signing-Request-ID`.
  * Gagal: JSON `{ message, request_id?, status?, code?, retry_signing? }`. Contoh kode: `signer_certificate_invalid` (TTE 2021), `signer_passphrase_invalid` (TTE 2031).
* **Status**: `GET /api/v1/signkonsel/{request_id}` → `sending | succeeded | failed | unknown`.
* **Unduh ulang**: `GET /api/v1/signkonsel/{request_id}/document`. Retensi 24 jam setelah sukses, lalu HTTP 410.

### 3.2 Aturan SIPATUH
* Marker `TTE_SIGNATURE_TAG` dicetak sekali di blok tanda tangan PDF; draft ditolak bila karakter yang sama muncul di isi surat. Untuk penanda tangan lebih dari satu, gunakan marker berbeda per penanda tangan dan tanda tangani berurutan.
* Idempotency-Key disimpan di `SuratPeringatan.tte_idempotency_key` sebelum request dikirim. Timeout / 5xx / 409 / status `unknown` mempertahankan key; percobaan berikutnya memeriksa status (jika ada `tte_request_id`) atau mengirim ulang dengan key dan isi yang sama. Status `failed` membuang key sehingga percobaan berikutnya memakai key baru.
* Draft surat tidak boleh diubah, dibuat ulang, atau dihapus selama `tte_status` bernilai `sending` atau `unknown`.
* Dilarang mencatat client secret, access token, `passphrase`, `nik` penuh, atau isi PDF ke log, database, maupun error tracking.
* PDF signed disimpan di `backend/uploads/surat-peringatan/signed/`.
