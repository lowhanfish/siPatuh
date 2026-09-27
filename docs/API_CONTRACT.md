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
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validasi gagal: nomor_lhp wajib diisi",
  "timestamp": "2026-09-27T10:00:00.000Z"
}
```

---

## 2. Rincian Endpoint Aktual

### 2.1 Autentikasi (`/auth`)
* `POST /api/v1/auth/login`
  * Body: `{ "identifier": "username_atau_nip", "password": "password_egov" }`
  * Respons: Set `access_token` & `refresh_token` pada `httpOnly` secure cookies. Mengembalikan data profil `{ id, nama, role, irban_id }`.
* `POST /api/v1/auth/refresh`
  * Membaca refresh cookie yang valid, menerbitkan pasangan access token baru dengan rotasi token.
* `POST /api/v1/auth/logout`
  * Membersihkan httpOnly cookies.
* `GET /api/v1/auth/me`
  * Mengembalikan data pengguna terotentikasi saat ini dari token session.

### 2.2 Manajemen Pengguna & Irban (`/users`, `/irban`)
* `GET /api/v1/users/egov-search?query=...` (SUPER_ADMIN)
  * Mencari ASN dari database riil EGOV (read-only) untuk pemilihan aktivasi akun.
* `GET /api/v1/users` (SUPER_ADMIN)
  * Filter query: `?role=...&irban_id=...&is_active=...&search=...`
* `GET /api/v1/users/:id` (SUPER_ADMIN)
* `POST /api/v1/users/activate` (SUPER_ADMIN)
  * Body: `{ "egov_user_id": "...", "role": "ADMIN_IRBAN", "irban_id": "..." }`
  * Catatan: `irban_id` wajib untuk role `ADMIN_IRBAN`. Password tidak pernah disalin dari EGOV.
* `PATCH /api/v1/users/:id` (SUPER_ADMIN)
  * Body: `{ "role": "...", "irban_id": "..." }`
* `PATCH /api/v1/users/:id/status` (SUPER_ADMIN)
  * Body: `{ "is_active": true/false }`
* `GET /api/v1/irban`: Daftar 5 Irban beserta jumlah relasi user, mapping OPD, dan LHP.
* `GET /api/v1/irban/:id`: Detail Irban.
* `PATCH /api/v1/irban/:id` (SUPER_ADMIN): Memperbarui nama Irban.

### 2.3 Pemetaan Unit Kerja SIMPEG & Pejabat (`/unit-kerja`, `/pejabat`)
* `GET /api/v1/unit-kerja/simpeg?search=...`
  * Menampilkan unit kerja dari database SIMPEG dengan filter `unit_induk = 1` dan status mapping Irban terkini.
* `GET /api/v1/unit-kerja/mappings?irban_id=...`
  * Menampilkan seluruh pemetaan aktif OPD ke wilayah Irban.
* `POST /api/v1/unit-kerja/mappings` (SUPER_ADMIN)
  * Body: `{ "irban_id": "...", "simpeg_unit_kerja_id": "..." }`
  * Menugaskan / memindahkan OPD ke Irban (1 OPD aktif tepat berada pada 1 Irban).
* `DELETE /api/v1/unit-kerja/mappings/:id` (SUPER_ADMIN)
  * Menghapus penugasan OPD dari Irban.
* `GET /api/v1/pejabat?simpeg_unit_kerja_id=...&is_active=...`
  * Menampilkan daftar pejabat OPD manual.
* `GET /api/v1/pejabat/resolve-recipient/:simpeg_unit_kerja_id`
  * Mengurai kandidat pejabat penerima surat peringatan (memprioritaskan PLT/PLH aktif di atas DEFINITIF).
* `GET /api/v1/pejabat/:id`
* `POST /api/v1/pejabat` (SUPER_ADMIN, ADMIN_IRBAN)
  * Body: `{ "simpeg_unit_kerja_id": "...", "nip": "...", "nama": "...", "jabatan": "...", "jenis_penugasan": "DEFINITIF|PLT|PLH", "tanggal_mulai": "YYYY-MM-DD", "tanggal_selesai": "YYYY-MM-DD" }`
* `PATCH /api/v1/pejabat/:id` (SUPER_ADMIN, ADMIN_IRBAN)
* `DELETE /api/v1/pejabat/:id` (SUPER_ADMIN, ADMIN_IRBAN)

### 2.4 Master Data Dinamis (`/master-data`)
* `GET /api/v1/master-data/jenis-pemeriksaan?active_only=true`
* `GET /api/v1/master-data/jenis-pemeriksaan/:id`
* `POST /api/v1/master-data/jenis-pemeriksaan` (SUPER_ADMIN)
  * Body: `{ "nama": "..." }`
* `PATCH /api/v1/master-data/jenis-pemeriksaan/:id` (SUPER_ADMIN)
  * Body: `{ "nama": "...", "is_active": true/false }`
* `GET /api/v1/master-data/status-rekomendasi?active_only=true`
* `GET /api/v1/master-data/status-rekomendasi/:id`
* `POST /api/v1/master-data/status-rekomendasi` (SUPER_ADMIN)
  * Body: `{ "nama": "...", "kategori": "SELESAI|BELUM_SELESAI", "urutan": 1 }`
* `PATCH /api/v1/master-data/status-rekomendasi/:id` (SUPER_ADMIN)
* `GET /api/v1/master-data/surat-templates?jenis_surat=SP1`
* `GET /api/v1/master-data/surat-templates/:id`
* `POST /api/v1/master-data/surat-templates` (SUPER_ADMIN)
  * Body: `{ "jenis_surat": "SP1", "judul": "...", "konten_html": "..." }`
* `PATCH /api/v1/master-data/surat-templates/:id` (SUPER_ADMIN)
  * Perubahan konten HTML otomatis membuat versi baru (versioned, non-retroaktif).

### 2.5 Laporan Hasil Pemeriksaan (`/lhp`)
* `GET /api/v1/lhp`
  * Query: `?tahun=2026&jenis_pemeriksaan_id=...&status=ALL|OPEN|CLOSED&search=...&page=1&limit=10`
  * *Catatan*: Default tahun berjalan. Untuk `ADMIN_IRBAN`, filter `irban_id` selalu dikunci ke wilayah Irban pengguna.
* `POST /api/v1/lhp` (ADMIN_IRBAN, SUPER_ADMIN)
  * Form-Data / JSON: `{ "nomor_lhp": "...", "tanggal_lhp": "YYYY-MM-DD", "tanggal_diterima_lhp": "YYYY-MM-DD", "simpeg_unit_kerja_id": "...", "jenis_pemeriksaan_id": "...", "file": (optional PDF) }`
  * Snapshot `irban_id` disimpan permanen di tabel LHP.
* `GET /api/v1/lhp/:id`
  * Detail LHP lengkap dengan temuans, rekomendasis, unit kerja dari SIMPEG, dan status penutupan. Dilindungi hak akses Irban (403 jika beda Irban).
* `PATCH /api/v1/lhp/:id` (ADMIN_IRBAN pemilik / SUPER_ADMIN)
  * Update nomor, tanggal, atau jenis pemeriksaan. Ditolak jika LHP sudah ditandai selesai (`closed_at != null`).
* `POST /api/v1/lhp/:id/file` (ADMIN_IRBAN pemilik / SUPER_ADMIN)
  * Multipart upload berkas PDF LHP ke direktori uploads terproteksi.
* `GET /api/v1/lhp/:id/file`
  * Stream unduhan berkas PDF resmi terproteksi autentikasi & otorisasi Irban.

* `POST /api/v1/lhp/:id/close` (ADMIN_IRBAN pemilik / SUPER_ADMIN)
  * Menutup LHP setelah seluruh rekomendasi terselesaikan atau diputuskan. Menandai `closed_at` dan `closed_by`.
* `POST /api/v1/lhp/:id/reopen` (SUPER_ADMIN only)
  * Body: `{ "alasan": "..." }`
  * Membuka kembali LHP yang telah ditutup. Wajib menyertakan alasan pembukaan kembali untuk audit trail.
* `DELETE /api/v1/lhp/:id` (SUPER_ADMIN only)
  * Menghapus record LHP. Ditolak jika LHP sudah memiliki surat peringatan yang ditandatangani secara digital (TTE).

### 2.6 Temuan (`/temuan`, `/lhp/:lhpId/temuan`)
* `GET /api/v1/lhp/:lhpId/temuan`
  * Menampilkan seluruh temuan dari sebuah LHP terurut berdasarkan `nomor_temuan`.
* `POST /api/v1/lhp/:lhpId/temuan` (ADMIN_IRBAN, SUPER_ADMIN)
  * Body: `{ "judul": "...", "uraian": "...", "nilai_temuan": 15000000.00 (opsional) }`
  * Penomoran urut otomatis (`nomor_temuan` 1..n). Ditolak jika LHP sudah ditutup.
* `GET /api/v1/temuan/:id`
  * Menampilkan detail temuan berserta daftar rekomendasi dan parent LHP. Terikat proteksi scope Irban.
* `PATCH /api/v1/temuan/:id` (ADMIN_IRBAN pemilik / SUPER_ADMIN)
  * Update judul, uraian, atau nilai temuan.
* `DELETE /api/v1/temuan/:id` (ADMIN_IRBAN pemilik / SUPER_ADMIN)
  * Menghapus temuan beserta relasi anak cascade jika LHP belum ditutup.

### 2.7 Rekomendasi (`/rekomendasi`, `/temuan/:temuanId/rekomendasi`)
* `GET /api/v1/temuan/:temuanId/rekomendasi`
  * Menampilkan daftar rekomendasi dari sebuah temuan.
* `POST /api/v1/temuan/:temuanId/rekomendasi` (ADMIN_IRBAN, SUPER_ADMIN)
  * Body: `{ "uraian": "...", "status_rekomendasi_id": "..." (opsional, default: master BELUM_SELESAI), "nilai_rekomendasi": 5000000.00 (opsional) }`
  * Penomoran urut otomatis (`nomor_rekomendasi` 1..n). Terikat scope Irban.
* `GET /api/v1/rekomendasi/:id`
  * Detail rekomendasi lengkap dengan riwayat tindak lanjut, verifikasi, status master, dan parent temuan/LHP.
* `PATCH /api/v1/rekomendasi/:id` (ADMIN_IRBAN pemilik / SUPER_ADMIN)
  * Update uraian, status, atau nilai nominal rekomendasi.
* `DELETE /api/v1/rekomendasi/:id` (ADMIN_IRBAN pemilik / SUPER_ADMIN)
  * Menghapus rekomendasi jika LHP belum ditutup.

### 2.8 Tindak Lanjut (`/rekomendasi/:rekomendasiId/tindak-lanjut`)
* `GET /api/v1/rekomendasi/:rekomendasiId/tindak-lanjut`
  * Menampilkan riwayat iterasi tindak lanjut (non-destructive log) berserta lampiran dan hasil verifikasi.
* `POST /api/v1/rekomendasi/:rekomendasiId/tindak-lanjut` (ADMIN_IRBAN, SUPER_ADMIN)
  * Form-Data / JSON: `{ "tanggal_diterima": "YYYY-MM-DD", "uraian": "...", "nilai_tindak_lanjut": 5000000.00 (opsional), "files": [berkas bukti] (opsional) }`
  * Menginput tindak lanjut dokumen yang diserahkan OPD melalui Admin Irban.
* `GET /api/v1/rekomendasi/:rekomendasiId/tindak-lanjut/financial-summary`
  * Menghitung total nilai rekomendasi, akumulasi nilai setor, sisa kewajiban, dan persentase pengembalian.
  * Catatan: Pelunasan 100% TIDAK mengubah status rekomendasi secara otomatis; verifikator manusia tetap menjadi penentu status.
* `GET /api/v1/tindak-lanjut/:id`
  * Detail spesifik tindak lanjut berserta lampiran berkas dan verifikasi terkait.

### 2.9 Verifikasi (`/tindak-lanjut/:tindakLanjutId/verifikasi`)
* `POST /api/v1/tindak-lanjut/:tindakLanjutId/verifikasi` (ADMIN_IRBAN, SUPER_ADMIN)
  * Form-Data: `{ "status_rekomendasi_id": "...", "catatan": "Catatan hasil verifikasi fisik...", "file": (opsional bukti verifikasi) }`
  * Verifikasi manual oleh inspektur. Memperbarui `status_rekomendasi_id` pada rekomendasi induk dalam transaksi Prisma atomic. `catatan` wajib diisi.
* `GET /api/v1/tindak-lanjut/:tindakLanjutId/verifikasi`
  * Menampilkan riwayat verifikasi inspektur atas tindak lanjut terkait.

### 2.10 Surat Peringatan Due Engine (`/surat-peringatan`)
* `GET /api/v1/surat-peringatan/due`
  * Menampilkan daftar LHP yang memenuhi kriteria penerbitan Surat Peringatan (SP1, SP2, SP3) berdasarkan umur kalender sejak `tanggal_diterima_lhp`.
  * Filter query: `?jenis_sp=SP1|SP2|SP3&irban_id=...`
  * Engine bersifat preview/kalkulasi murni (tidak menulis ke database).

---

### 2.11 Domain Mendatang (Checkpoint B16 s.d. B20)
* `POST /api/v1/surat-peringatan` & PDF generation (B16)
* `POST /api/v1/surat-peringatan/:id/sign-tte` (B17)
* `GET /api/v1/reports` & export (B18)
* `GET /api/v1/dashboard/irban` & `GET /api/v1/dashboard/pimpinan` (B19)
* Backend Hardening & Final Tests (B20)

