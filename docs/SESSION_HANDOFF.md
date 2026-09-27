# SESSION_HANDOFF

## Active checkpoint
00 - Grounding & Persistent Context

## Completed in this session
- Menelaah secara mendalam dokumen acuan: `SIPATUH_Blueprint_Petunjuk_Aplikasi.pdf` dan `SIPATUH_Prompt_Checkpoint_Codex.pdf`.
- Menginspeksi struktur repositori aktual (`/backend` dengan starter NestJS 11, `/frontend` dengan starter Next.js 16).
- Membentuk direktori `/docs` di root repositori sebagai sumber kebenaran persisten (*persistent context*).
- Menulis dokumen arsitektur dan bisnis:
  - `docs/PROJECT_CONTEXT.md`
  - `docs/DECISIONS.md`
  - `docs/ARCHITECTURE.md`
  - `docs/DATA_MODEL.md`
  - `docs/API_CONTRACT.md`
  - `docs/EXTERNAL_SYSTEMS.md`
  - `docs/SESSION_HANDOFF.md`
- Mengonfirmasi fakta eksternal vs unknowns untuk SIMPEG, EGOV, dan TTE Wrapper.
- Menetapkan batasan ketat: tidak ada write/migrasi ke database eksternal, tidak ada penyimpanan secret/passphrase, dan penegakan Irban scope di level backend.

## Files changed
- `docs/PROJECT_CONTEXT.md`: Menguraikan latar belakang proyek, peran (SUPER_ADMIN, ADMIN_IRBAN, BUPATI), aturan bisnis utama, dan batasan cakupan V1.
- `docs/DECISIONS.md`: Mencatat ADR-01 hingga ADR-08 terkait arsitektur multi-database, token httpOnly cookie, model non-enum LHP, dan integrasi TTE.
- `docs/ARCHITECTURE.md`: Menyusun diagram arsitektur sistem, pembagian lapisan Next.js frontend, NestJS backend, uploads terproteksi, dan multi-database.
- `docs/DATA_MODEL.md`: Mendefinisikan spesifikasi model Prisma untuk seluruh entitas lokal SIPATUH berserta relasi dan indeksnya.
- `docs/API_CONTRACT.md`: Mendokumentasikan spesifikasi REST API `/api/v1` lengkap untuk otentikasi, master data, LHP, temuan, rekomendasi, tindak lanjut, verifikasi, surat peringatan, dan dashboard.
- `docs/EXTERNAL_SYSTEMS.md`: Memetakan fakta terverifikasi dan item yang belum diketahui (*unknowns*) dari SIMPEG, EGOV, dan TTE API wrapper.
- `docs/SESSION_HANDOFF.md`: Dokumen handoff status checkpoint saat ini dan persiapan untuk langkah berikutnya.

## Decisions made
- Database `egov` dan `simpeg` diperlakukan murni sebagai READ-ONLY tanpa pembuatan migrasi atau skema Prisma langsung.
- Tidak membangun fitur bisnis baru sebelum fondasi arsitektur selesai.
- Penegakan isolasi wilayah Irban wajib dilakukan pada backend query dengan mengambil `irban_id` dari sesi authenticated, bukan dari client payload.

## Tests / verification
- `find_by_name /docs`: Memastikan 7 berkas dokumentasi berhasil dibuat dan terisi lengkap.
- Inspeksi struktur package backend dan frontend berhasil dikonfirmasi.

## Known issues / blockers
- Tabel dan skema credential riil di database EGOV belum diinspeksi secara langsung; memerlukan koneksi read-only untuk memverifikasi nama tabel pengguna, kolom identifier, dan algoritma hash password.
- Kolom penanda aktif/nonaktif pada `simpeg.unit_kerja` belum diketahui secara pasti; saat ini hanya berpatokan pada filter `unit_induk = 1`.
- URL dan TOKEN produksi/staging untuk TTE API wrapper belum diatur pada environment riil.

## External schema facts verified
- EGOV: Database kredensial pengguna, verifikasi hash tanpa menyalin password ke SIPATUH (detail tabel akan diinspeksi di B04).
- SIMPEG: Tabel `simpeg.instansi` (`id`), `simpeg.unit_kerja` (`id`, `unit_kerja`, `instansi`, `unit_induk = 1`).
- TTE: Endpoint REST wrapper `lowhanfish/tte_api` menerima parameter JSON `TOKEN`, `nik`, `passphrase`, `tagTTDX`, `filebase64`, `judul`, `nomor`.

## Next checkpoint
- B01 - Bootstrap Backend
- Preconditions: Checkpoint 00 selesai, dokumen kontekstual di `/docs` telah siap dan konsisten.

## Do not forget
- No writes to EGOV/SIMPEG
- No secrets in repo/logs
- Admin Irban scope enforced in backend
