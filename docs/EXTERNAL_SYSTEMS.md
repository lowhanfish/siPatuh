# SIPATUH - External Systems Integration

Dokumen ini memetakan seluruh sistem eksternal yang terhubung dengan SIPATUH, memisahkan secara tegas antara **Fakta Terverifikasi** vs **Hal yang Belum Diketahui (Unknowns)** guna mencegah asumsi palsu (*anti-hallucination*).

---

## 1. Database SIMPEG (Sistem Informasi Kepegawaian)
* **Kategori**: Database MySQL Eksternal (Read-Only).
* **Hak Akses**: **READ ONLY**. Dilarang keras melakukan INSERT, UPDATE, DELETE, atau migrasi skema.

### 1.1 Fakta Terverifikasi
* Database berada pada host/server MySQL yang sama dengan database SIPATUH.
* Struktur tabel yang telah dikonfirmasi:
  1. `simpeg.instansi`:
     * Kolom terverifikasi: `id` (Primary Key).
  2. `simpeg.unit_kerja`:
     * Kolom terverifikasi: `id` (Primary Key), `unit_kerja` (nama OPD/instansi), `instansi` (Foreign key mengarah ke `simpeg.instansi.id`), `unit_induk`.
* **Aturan Bisnis Filter Unit Kerja**:
  * Unit kerja yang menjadi target pemeriksaan LHP di SIPATUH **HANYA** yang memiliki `unit_induk = 1` (tingkat dinas, badan, kecamatan, atau setara).
  * Unit kerja cabang/seksi (`unit_induk != 1`) diabaikan dari daftar target LHP.

### 1.2 Hal yang Belum Diketahui / Perlu Diverifikasi Saat Koneksi Aktif
* Nama kolom penanda aktif/nonaktif pada `simpeg.unit_kerja` (apakah bernama `status`, `is_active`, `aktif`, atau tidak ada).
* *Strategi*: Sebelum kolom aktif diverifikasi pada database riil, sistem hanya memfilter berdasarkan `unit_induk = 1`.

---

## 2. Database EGOV (Single Identity / Akun Pemerintahan)
* **Kategori**: Database MySQL Eksternal (Read-Only).
* **Hak Akses**: **READ ONLY**. Dilarang keras melakukan INSERT, UPDATE, DELETE, atau migrasi skema.

### 2.1 Fakta Terverifikasi
* Database berada pada host/server MySQL yang sama dengan database SIPATUH.
* Berfungsi sebagai sumber validasi kredensial pengguna (NIP / Username dan Password).
* SIPATUH tidak menyimpan password EGOV di database lokal.
* Pengguna yang terdaftar di EGOV harus diaktifkan secara manual di database SIPATUH sebelum dapat masuk ke sistem SIPATUH.

### 2.2 Hal yang Belum Diketahui / Blocker Eksplisit
* Nama tabel pengguna di EGOV (misal: `users`, `tb_user`, `pegawai`, dll.).
* Nama kolom NIP, username, dan password hash di EGOV.
* Algoritma hashing kata sandi yang digunakan (apakah Bcrypt, Argon2, SHA256/512 + Salt, atau algoritma kustom lainnya).
* *Strategi*:
  * Pada tahap B02 dan B04, buat abstraction interface/adapter khusus (`EgovAuthAdapter`).
  * Jangan membuat skema tiruan atau query asumsi.
  * Ketika koneksi ke database riil tersedia, lakukan inspeksi struktur `egov` secara terisolasi tanpa migrasi.

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
  * `filebase64`: Berkas PDF yang akan ditandatangani dalam format Base64 (bisa berupa data URI `data:application/pdf;base64,...`).
  * `judul` & `nomor`: Tertera pada dokumentasi README wrapper. Meskipun versi `index.js` saat ini tidak membaca field ini, SIPATUH tetap mengirimkannya demi kompatibilitas ke depan.
* **Perilaku Respons Berhasil**:
  ```json
  {
    "status": 200,
    "filename": "signed_xxx.pdf",
    "base64": "data:application/pdf;base64,..."
  }
  ```
* **Keterbatasan & Catatan Keamanan**:
  * Batas payload JSON express pada wrapper saat ini adalah 10 MB. Karena encoding Base64 menambah ukuran sekitar 33%, ukuran PDF draft sebelum di-encode disarankan maksimum 7 MB (`TTE_MAX_PDF_BYTES=7000000`).
  * Repo wrapper saat ini memiliki log debug yang mencetak username, password, dan TOKEN ke console wrapper. **SIPATUH dilarang keras meniru pencatatan kredensial ini**. Backend SIPATUH harus memastikan tidak ada passphrase atau token yang dicatat ke log aplikasi SIPATUH.

### 3.2 Hal yang Belum Diketahui / Konfigurasi Dinamis
* URL staging/produksi sesungguhnya (`TTE_API_URL`).
* Nilai token otentikasi wrapper riil (`TTE_API_TOKEN`).
* String anchor penanda visual yang disepakati (`TTE_SIGNATURE_TAG`).
* *Strategi*: Seluruh nilai di atas dikonfigurasikan melalui variabel lingkungan (*environment variables*) di backend dan tidak pernah diekspos ke frontend.
