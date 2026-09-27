# SIPATUH - API Contract Specification

Seluruh endpoint backend menggunakan basis URL `/api/v1` dan mengembalikan respons berformat JSON yang konsisten.

## 1. Standar Format Respons

### Respons Berhasil (Success)
```json
{
  "success": true,
  "data": {},
  "message": "Operasi berhasil"
}
```

### Respons Gagal (Error)
```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validasi gagal: nomor_lhp wajib diisi",
  "timestamp": "2026-09-27T10:00:00.000Z"
}
```

---

## 2. Rincian Endpoint

### 2.1 Autentikasi (`/auth`)
* `POST /api/v1/auth/login`
  * Body: `{ "identifier": "username_atau_nip", "password": "password_egov" }`
  * Respons: Set `access_token` & `refresh_token` pada `httpOnly` secure cookies. Mengembalikan data profil `{ id, nama, role, irban_id }`.
* `POST /api/v1/auth/refresh`
  * Membaca refresh cookie yang valid, menerbitkan pasangan access token baru.
* `POST /api/v1/auth/logout`
  * Membersihkan httpOnly cookies.
* `GET /api/v1/auth/me`
  * Mengembalikan data pengguna terotentikasi saat ini.

### 2.2 Manajemen Pengguna & Irban (`/users`, `/irban`)
* `GET /api/v1/users` (SUPER_ADMIN)
* `POST /api/v1/users/activate` (SUPER_ADMIN)
  * Body: `{ "egov_user_id": "...", "nip": "...", "nama": "...", "role": "ADMIN_IRBAN", "irban_id": "..." }`
* `PATCH /api/v1/users/:id/status` (SUPER_ADMIN): Aktifkan / nonaktifkan user.
* `GET /api/v1/irban`: Daftar 5 Irban.

### 2.3 SIMPEG Read-Only & Pemetaan Wilayah (`/simpeg`, `/irban-unit-kerja`)
* `GET /api/v1/simpeg/unit-kerja`
  * Query: `?search=...&limit=...` (Menampilkan unit kerja dengan `unit_induk = 1`).
* `GET /api/v1/irban-unit-kerja`: Daftar pemetaan unit kerja ke Irban.
* `POST /api/v1/irban-unit-kerja` (SUPER_ADMIN)
  * Body: `{ "irban_id": "...", "simpeg_unit_kerja_id": 123 }`
* `GET /api/v1/pejabat-unit-kerja/:simpegUnitKerjaId`
* `POST /api/v1/pejabat-unit-kerja` (SUPER_ADMIN)
  * Body: `{ "simpeg_unit_kerja_id": 123, "nip": "...", "nama": "...", "jabatan": "...", "jenis_penugasan": "PLT", "tanggal_mulai": "2026-01-01" }`

### 2.4 Master Data (`/master`)
* `GET /api/v1/master/jenis-pemeriksaan` & `POST /api/v1/master/jenis-pemeriksaan` (SUPER_ADMIN)
* `GET /api/v1/master/status-rekomendasi` & `POST /api/v1/master/status-rekomendasi` (SUPER_ADMIN)
* `GET /api/v1/master/surat-template` & `PUT /api/v1/master/surat-template/:id` (SUPER_ADMIN)

### 2.5 Laporan Hasil Pemeriksaan (`/lhp`)
* `GET /api/v1/lhp`
  * Query: `?tahun=2026&irban_id=...&unit_kerja_id=...&jenis_pemeriksaan_id=...&page=1&limit=10`
  * *Catatan*: Untuk `ADMIN_IRBAN`, filter `irban_id` selalu dipaksa sesuai irban dari sesi.
* `POST /api/v1/lhp` (ADMIN_IRBAN, SUPER_ADMIN)
  * Multipart / JSON: `{ "nomor_lhp": "...", "tanggal_lhp": "...", "tanggal_diterima_lhp": "...", "simpeg_unit_kerja_id": 123, "jenis_pemeriksaan_id": "..." }`
* `GET /api/v1/lhp/:id`
* `PUT /api/v1/lhp/:id`
* `POST /api/v1/lhp/:id/close` (ADMIN_IRBAN pemegang wilayah / SUPER_ADMIN)
* `POST /api/v1/lhp/:id/reopen` (Hanya SUPER_ADMIN)
  * Body: `{ "reason": "Alasan wajib pembukaan kembali..." }`

### 2.6 Temuan & Rekomendasi (`/temuan`, `/rekomendasi`)
* `POST /api/v1/lhp/:lhpId/temuan`
  * Body: `{ "judul": "...", "uraian": "...", "nilai_temuan": 15000000 }`
* `POST /api/v1/temuan/:temuanId/rekomendasi`
  * Body: `{ "uraian": "...", "nilai_rekomendasi": 15000000, "status_rekomendasi_id": "..." }`
* `PATCH /api/v1/rekomendasi/:id/status` (Khusus update status langsung jika diperlukan)

### 2.7 Tindak Lanjut & Verifikasi (`/tindak-lanjut`, `/verifikasi`)
* `GET /api/v1/rekomendasi/:rekomendasiId/tindak-lanjut`
* `POST /api/v1/rekomendasi/:rekomendasiId/tindak-lanjut`
  * Multipart: `tanggal_diterima`, `uraian`, `nilai_tindak_lanjut`, `files[]`
* `POST /api/v1/tindak-lanjut/:tlId/verifikasi`
  * Multipart / JSON: `{ "catatan": "Catatan evaluasi wajib", "status_rekomendasi_id": "...", "files[]": ... }`

### 2.8 Surat Peringatan & TTE (`/surat-peringatan`)
* `GET /api/v1/surat-peringatan/due`
  * Daftar LHP yang jatuh tempo SP1 ($\ge$ 30 hari), SP2 ($\ge$ 45 hari), SP3 ($\ge$ 60 hari) dan masih memiliki rekomendasi belum selesai.
* `POST /api/v1/surat-peringatan`
  * Body: `{ "lhp_id": "...", "level": "SP1", "nomor_surat": "...", "tanggal_surat": "...", "pejabat_id": "..." }`
  * Meng-generate draft PDF unsigned dan menyimpannya di direktori uploads draft.
* `GET /api/v1/surat-peringatan/:id/draft` (Download draft PDF)
* `POST /api/v1/surat-peringatan/:id/sign-tte`
  * Body: `{ "nik": "...", "passphrase": "..." }`
  * Melakukan panggilan aman ke wrapper `tte_api`, menyimpan berkas signed, dan menandai surat menjadi immutable.
* `GET /api/v1/surat-peringatan/:id/signed` (Download PDF yang telah ditandatangani)

### 2.9 Dashboard & Laporan (`/dashboard`, `/reports`)
* `GET /api/v1/dashboard/irban` (Statistik khusus Irban pengguna yang login)
* `GET /api/v1/dashboard/pimpinan` (Statistik komprehensif 5 Irban untuk SUPER_ADMIN & BUPATI)
* `GET /api/v1/reports/tindak-lanjut`
* `GET /api/v1/reports/export/excel`
* `GET /api/v1/reports/export/pdf`

### 2.10 Manajemen Berkas Terproteksi (`/files`)
* `GET /api/v1/files/:fileId/download`
  * Memvalidasi sesi dan hak akses Irban sebelum mengalirkan (*streaming*) isi berkas ke client.
