# SESSION_HANDOFF

## Active checkpoint
F05 - User/Irban Management UI (Completed) -> Next: F06 - Unit Mapping & Pejabat UI

## Completed in this session
- **Checkpoint F05 (User/Irban Management UI)**:
  - Mengintegrasikan antarmuka Super Admin untuk pengelolaan pengguna lokal SIPATUH dan 5 wilayah kerja Irban pada rute `/pengguna`.
  - Komponen pencarian ASN read-only dari database EGOV via `/users/egov-search`, menampilkan kandidat beserta penanda akun yang sudah atau belum terdaftar di SIPATUH.
  - Form aktivasi pengguna (`ActivateUserModal`) dengan penetapan peran (`SUPER_ADMIN`, `ADMIN_IRBAN`, `BUPATI`).
  - Validasi ketat peran: role `ADMIN_IRBAN` mewajibkan penugasan tepat ke salah satu dari 5 wilayah Irban.
  - Mematuhi aturan keamanan: tidak pernah ada input kata sandi pada formulir manajemen akun; kredensial dan kata sandi sepenuhnya berada di database EGOV.
  - Tabel pengguna terdaftar (`UserListTable`) dengan filter pencarian nama/NIP/username, filter role, filter wilayah Irban, dan filter status aktif/nonaktif.
  - Aksi toggle aktif/nonaktif akun secara aman dengan modal konfirmasi dan notifikasi toast (tanpa mengubah atau menghapus data di EGOV).
  - Modal edit hak akses (`EditUserModal`) untuk memperbarui role atau memindahkan penugasan wilayah Irban.
  - Tabel dan modal pengelolaan 5 wilayah kerja Irban (`IrbanListTable` & `EditIrbanModal`) untuk memperbarui nama dan cakupan keterangan Irban.

- **Checkpoint F04 (Dashboard Admin Irban)**:
  - Mengintegrasikan halaman `/dashboard/irban` dengan endpoint `GET /api/v1/dashboard/irban` menggunakan TanStack Query.
  - Menampilkan 4 kartu statistik utama:
    - Total LHP dengan rincian open vs ditandai selesai dan akumulasi temuan.
    - Status Rekomendasi (selesai vs belum selesai) dilengkapi bar visual persentase penyelesaian.
    - Peringatan Surat Peringatan (SP Due) dengan indikator jatuh tempo SP1, SP2, dan SP3.
    - Nilai Pemulihan Kerugian Finansial Daerah (total rekomendasi, realisasi setor, dan sisa kewajiban terformat Rupiah).
  - Menampilkan kartu distribusi status rekomendasi secara dinamis dari API (`status_breakdown`), tanpa pernah meng-hardcode 4 status master sebagai satu-satunya kemungkinan di kode.
  - Menampilkan widget alert LHP yang menunggak SP beserta perhitungan hari kalender murni sejak LHP diterima dan badge level SP (SP1 $\ge 30$, SP2 $\ge 45$, SP3 $\ge 60$ hari).
  - Menampilkan tabel LHP terkini wilayah kerja Irban dengan status dan link aksi cepat.
  - Menyediakan filter tahun pengawasan (default tahun berjalan), tombol segarkan data real-time, loading skeleton (`IrbanDashboardSkeleton`), serta penanganan error dengan aksi coba lagi.
  - Memastikan angka statistik murni berasal dari kalkulasi backend, bukan komputasi parsial di client-side.

- **Checkpoint F03 (App Shell & Role Routes)**:
  - Menambahkan app shell responsif dengan sidebar desktop, header sticky, drawer mobile, identitas pengguna, dan aksi logout.
  - Menyusun konfigurasi navigasi terpusat berdasarkan role. `BUPATI` hanya melihat Dashboard Pimpinan dan Laporan; `ADMIN_IRBAN` hanya melihat modul operasional sesuai scope; `SUPER_ADMIN` melihat seluruh menu administrasi.
  - Menambahkan client-side route guard berbasis query `/auth/me`: sesi tidak valid diarahkan ke login, sedangkan akses route yang tidak sesuai role menampilkan halaman `403` yang jelas.
  - Mempertahankan backend sebagai otoritas akhir autentikasi, otorisasi role, dan scope Irban; guard frontend hanya meningkatkan UX.
  - Menambahkan default route pascalogin per role dan placeholder route eksplisit untuk checkpoint domain berikutnya tanpa mengklaim fitur bisnis sudah selesai.
  - Menambahkan fallback error pada area terproteksi serta mempertahankan halaman `404` global.

- **Checkpoint F02 (Auth Client & Refresh Wrapper)**:
  - Menambahkan typed fetch client yang selalu memakai `credentials: "include"`, menormalisasi error backend, dan hanya menerima path API internal.
  - Implementasi single-flight refresh: request paralel yang menerima `401` berbagi satu request `/auth/refresh`, lalu masing-masing mengulang request awal tepat satu kali.
  - Login/logout menonaktifkan auto-refresh agar kredensial salah atau logout tidak memicu refresh loop.
  - Menambahkan typed auth API, model role/user, TanStack Query `/auth/me`, serta mutation login/logout tanpa penyimpanan JWT di localStorage, sessionStorage, atau Zustand.
  - Menambahkan halaman login responsif dengan field NIP/username dan password EGOV, pesan error aman, serta pembersihan state password setelah submit.
  - Menambahkan validasi redirect internal untuk menolak external URL, protocol-relative URL, backslash, control character, dan loop kembali ke `/login`.
  - Halaman utama kini membaca status sesi dan menampilkan tombol masuk atau identitas pengguna/logout.

- **Checkpoint F01 (Bootstrap Frontend)**:
  - Mempertahankan frontend existing dan memakai versi aktual repo: Next.js 16 App Router, React 19, TypeScript strict, dan Tailwind CSS 4.
  - Menambahkan `QueryClientProvider` dengan default query/mutation yang konservatif serta toast host global melalui `sonner`.
  - Menambahkan Zustand store khusus UI state. Tidak ada JWT, refresh token, password, atau data sensitif yang disimpan di Zustand maupun browser storage.
  - Menambahkan konfigurasi publik `NEXT_PUBLIC_API_BASE_URL` melalui `.env.example` dan validator URL publik terpusat.
  - Menambahkan route error boundary dan halaman not-found berbahasa Indonesia.
  - Membuat struktur feature-oriented awal (`features/foundation`, `lib`, `stores`) dan halaman fondasi SIPATUH yang responsif dengan design tokens bersama.
  - Login, refresh wrapper, dan session query sengaja tidak dikerjakan karena merupakan scope F02.

- **Checkpoint B17 (TTE Integration - lowhanfish/tte_api)**:
  - `TteClient` isolated HTTP client (`backend/src/external/tte/tte.client.ts`):
    - Komunikasi aman dengan wrapper TTE API (`POST /api/sign-pdf`).
    - Validasi pre-flight berkas PDF (ukuran maksimum $\le 7$ MB).
    - Format data URI payload (`data:application/pdf;base64,...`), `tagTTDX` (`#tagTTD#`), sanitasi token/passphrase dari exception logging.
    - Dekoding base64 hasil penandatanganan dan validasi header file (`%PDF-`).
  - Endpoint Penandatanganan Elektronik & Stream (`POST /api/v1/surat-peringatan/:id/sign-tte` & `GET /api/v1/surat-peringatan/:id/signed`):
    - Concurrency lock in-memory (`signingLocks`) mencegah race condition / double-clicking sign request.
    - Verifikasi imutabilitas: penolakan penandatanganan ulang jika SP sudah ditandatangani.
    - Penyimpanan berkas tertandatangani di `uploads/surat-peringatan/signed/<uuid>.pdf`.
    - Update database secara atomic (`signed_at`, `signed_by_user_id`, `signed_path`).
    - Pencatatan Audit Trail (`TTE_SIGN_SUCCESS`, `TTE_SIGN_FAILED`).
    - Stream unduhan PDF bersertifikat BSrE aman dengan validasi otorisasi & scope Irban.
  - Unit tests: `tte.client.spec.ts` & `surat-peringatan.service.spec.ts` (100% passed).

- **Checkpoint B18 (Pelaporan & Ekspor Rekapitulasi)**:
  - `ReportsService` & `ReportsController` (`backend/src/reports/`):
    - Agregasi pengawasan multi-dimensi (`GET /api/v1/reports/summary`):
      - Rekap LHP total/open/closed, total temuan, rekomendasi total/selesai/belum selesai/persen.
      - Metrik finansial: total nilai rekomendasi, total setor, sisa kewajiban, rasio pemulihan.
      - Distribusi status rekomendasi (`status_breakdown`).
      - Matriks pemantauan per OPD (`opd_breakdown`) dengan nama unit kerja dari SIMPEG.
      - Pemaksaan filter wilayah kerja Irban bagi `ADMIN_IRBAN` dan pembatasan akses.
    - Ekspor Excel (`GET /api/v1/reports/export/excel`):
      - Format CSV standar dengan UTF-8 Byte Order Mark (`\uFEFF`) agar dapat dibuka langsung di Microsoft Excel tanpa masalah encoding.
    - Ekspor PDF Eksekutif (`GET /api/v1/reports/export/pdf`):
      - Desain dokumen PDF landscape (A4) berbasis PDFKit dengan header instansi Inspektorat Daerah, kartu ringkasan eksekutif, tabel distribusi status, dan tabel detail per OPD.
  - Unit tests: `reports.service.spec.ts` (100% passed).

- **Checkpoint B19 (Dashboard Pengawasan)**:
  - `DashboardService` & `DashboardController` (`backend/src/dashboard/`):
    - Dasbor Operasional Irban (`GET /api/v1/dashboard/irban`):
      - Ter-scope otomatis ke wilayah Irban pengguna.
      - Menampilkan metrik real-time LHP, Temuan, Rekomendasi, pemulihan keuangan, dan status breakdown.
      - Widget peringatan SP Due mengikuti batas SP1/SP2/SP3 pada 30/45/60 hari.
      - Riwayat aktivitas verifikasi dan tindak lanjut terbaru.
      - *Keamanan*: Peran `BUPATI` diblokir eksplisit (`403 Forbidden`).
    - Dasbor Eksekutif Pimpinan (`GET /api/v1/dashboard/pimpinan`):
      - Dikhususkan untuk `BUPATI` dan `SUPER_ADMIN`.
      - Rekapitulasi makro seluruh 5 wilayah Irban.
      - Rekapitulasi jumlah surat peringatan aktif berdasarkan level (SP1, SP2, SP3).
      - Komparasi performa dan tingkat penyelesaian rekomendasi antar-Irban (Irban I s.d. V).
      - Top 5 OPD dengan rekomendasi tertunggak terbanyak.
  - Unit tests: `dashboard.service.spec.ts` (100% passed).

- **Checkpoint B20 (Backend Hardening & Final Tests)**:
  - Rate Limiting / DDoS Protection:
    - `@nestjs/throttler` terpasang global (100 req / menit per IP).
    - Throttling ketat pada rute sensitif: `POST /auth/login` (10 req/menit), `POST /auth/refresh` (20 req/menit), dan `POST /surat-peringatan/:id/sign-tte` (10 req/menit).
  - Pengamanan Data & Zero-Secret Leakage:
    - Verifikasi eliminasi seluruh logging kata sandi, passphrase, token JWT, token TTE, dan NIK lengkap.
    - Database eksternal `egov` dan `simpeg` strictly read-only tanpa hak write/migration.
  - Pengujian Komprehensif:
    - 23 Unit Test Suites: 135 tests passed 100%.
    - 3 E2E Test Suites: 13 tests passed 100% (mencakup Auth, App/Health, dan Guard Protection pada Reports/Dashboard/TTE).
    - ESLint: 0 errors, 0 warnings.
    - NestJS Production Build: Success.

- **Checkpoint B11 (Temuan & Rekomendasi)**:
  - CRUD Temuan (`/api/v1/lhp/:lhpId/temuan`, `/api/v1/temuan/:id`):
    - Penomoran urut otomatis per LHP (`nomor_temuan` 1..n).
    - Nilai temuan opsional `nilai_rekomendasi` desimal `Decimal(15,2)`.
    - Hak akses terikat scope Irban dari parent LHP (403 jika beda Irban).
    - Mutasi ditolak jika LHP sudah ditutup (`closed_at != null`).
  - CRUD Rekomendasi (`/api/v1/temuan/:temuanId/rekomendasi`, `/api/v1/rekomendasi/:id`):
    - Penomoran urut otomatis per Temuan (`nomor_rekomendasi` 1..n).
    - Status default otomatis mengambil status master aktif berkategori `BELUM_SELESAI` (mis. "Belum Sesuai").
    - Nilai finansial rekomendasi opsional desimal `Decimal(15,2)`.
    - Unit tests: `temuan.service.spec.ts` & `rekomendasi.service.spec.ts` (100% passed).

- **Checkpoint B12 (Tindak Lanjut & Upload)**:
  - Create & List Tindak Lanjut (`/api/v1/rekomendasi/:rekomendasiId/tindak-lanjut`):
    - Riwayat tindak lanjut bersifat append-only / non-destructive iteration log.
    - Validasi tanggal `tanggal_diterima` dan deskripsi `uraian`.
    - Multi-file attachment upload (`FilesInterceptor`) tersimpan aman di `uploads/tindak-lanjut/` dengan metadata tersimpan di tabel `Attachment`.
    - Input nilai setoran/pengembalian desimal `nilai_setor`.
  - Financial Summary endpoint (`GET /api/v1/rekomendasi/:rekomendasiId/tindak-lanjut/financial-summary`):
    - Kalkulasi total setor, sisa setoran, persentase pelunasan.
    - Sesuai business rule: 100% pengembalian keuangan TIDAK mengubah status rekomendasi secara otomatis; verifikator manusia tetap menjadi penentu tunggal.
  - Unit tests: `tindak-lanjut.service.spec.ts` (100% passed).

- **Checkpoint B13 (Verifikasi)**:
  - Create Verifikasi Manual (`POST /api/v1/tindak-lanjut/:tindakLanjutId/verifikasi`):
    - Verifikasi manual 100% oleh inspektur manusia, tidak pernah auto-verifikasi.
    - Field `catatan` wajib diisi (string non-empty, spasi ditolak).
    - Menentukan `status_rekomendasi_id` baru, dieksekusi dalam transaksi Prisma atomic untuk mengupdate `rekomendasi.status_rekomendasi_id`.
    - Dukungan upload berkas bukti verifikasi opsional ke `uploads/verifikasi/`.
    - Append-only audit trail verifikasi.
  - Unit tests: `verifikasi.service.spec.ts` (100% passed).

- **Checkpoint B14 (Close/Reopen LHP & Audit)**:
  - Close LHP (`POST /api/v1/lhp/:id/close`):
    - Mengisi `closed_at` dan `closed_by`.
    - Hanya dapat dilakukan oleh `ADMIN_IRBAN` pemilik wilayah atau `SUPER_ADMIN`.
  - Reopen LHP (`POST /api/v1/lhp/:id/reopen`):
    - Eksklusif hanya untuk `SUPER_ADMIN`.
    - Field `alasan` wajib diisi dan dicatat dalam audit trail.
    - Menghapus timestamp `closed_at` dan `closed_by`.
  - Hard Delete Protection (`DELETE /api/v1/lhp/:id`):
    - Ditolak jika LHP memiliki surat peringatan ber-TTE resmi.
  - Unit tests: `lhp.service.spec.ts` mencakup pengujian close, reopen, delete protection, dan audit logging.

- **Checkpoint B15 (SP Due Engine)**:
  - SP Due Calculation Engine (`sp-due.service.ts`, `GET /api/v1/surat-peringatan/due`):
    - Menghitung umur LHP dalam hari kalender murni berdasarkan `tanggal_diterima_lhp` (BUKAN `tanggal_lhp`).
    - Rules evaluasi penalti:
      - SP1: Umur $\ge 30$ hari kalender.
      - SP2: Umur $\ge 45$ hari kalender dan telah diterbitkan SP1.
      - SP3: Umur $\ge 60$ hari kalender dan telah diterbitkan SP2.
    - Hanya mengevaluasi LHP yang masih terbuka (`closed_at == null`) dan memiliki rekomendasi aktif dengan kategori `BELUM_SELESAI`.
    - Bersifat pure calculation/preview: Query endpoint `GET /due` tidak membuat record mutasi database secara implisit.
  - Unit tests: `sp-due.service.spec.ts` (100% passed).

- **Checkpoint B06 (RBAC & Irban Scope)**:
  - `@Roles(...)` decorator dan `RolesGuard` untuk penegakan izin role (`SUPER_ADMIN`, `ADMIN_IRBAN`, `BUPATI`).
  - `@CurrentUser()` custom parameter decorator untuk mengambil identitas principal terautentikasi.
  - `IrbanScopeService`:
    - `validateIrbanAccess()`: Mencegah akses silang Irban (Admin Irban I dilarang keras mengakses resource Irban II -> 403 Forbidden).
    - `resolveEffectiveIrbanId()`: Memaksa `ADMIN_IRBAN` menggunakan `irban_id` dari session JWT (mengabaikan manipulasi filter query client).
    - `assertCanMutate()`: Memblokir mutasi dari role `BUPATI` (read-only).
  - Unit tests lulus (`roles.guard.spec.ts`, `irban-scope.service.spec.ts`).

- **Checkpoint B07 (User & Irban Management)**:
  - Irban: list, detail, update nama (`SUPER_ADMIN` only).
  - `EgovAdapter.searchUsers()`: pencarian akun ASN read-only dari database `egov.users` tanpa hak tulis.
  - `UsersService` & `UsersController`:
    - Pencarian kandidat user EGOV dan deteksi status pendaftaran di SIPATUH.
    - Aktivasi akun SIPATUH dengan validasi wajib `irban_id` untuk `ADMIN_IRBAN`.
    - Modifikasi role & assignment Irban.
    - Nonaktifkan/aktifkan user dengan proteksi mencegah bunuh diri akun Super Admin sendiri.
  - Zero write ke EGOV, password tidak disalin/disimpan.
  - Audit trail `ACTIVATE_USER`, `UPDATE_USER_ACCESS`, `TOGGLE_USER_STATUS`.
  - Unit tests lulus (`users.service.spec.ts`).

- **Checkpoint B08 (Unit Kerja Mapping & Pejabat)**:
  - Browse Unit Kerja SIMPEG (`unit_induk = 1`): `GET /api/v1/unit-kerja/simpeg` dengan penanda status mapping.
  - Mapping Irban: `IrbanUnitKerja` dengan unique constraint 1 unit kerja aktif tepat ke 1 Irban.
  - CRUD manual `PejabatUnitKerja` (DEFINITIF, PLT, PLH).
  - Pejabat Resolution Service (`resolveRecipient`): memprioritaskan PLT/PLH aktif di atas DEFINITIF, mendeteksi kebutuhan pemilihan manual jika terdapat lebih dari satu kandidat sah.
  - Audit trail `ASSIGN_UNIT_KERJA_IRBAN`, `CREATE_PEJABAT`, dll.
  - Unit tests lulus (`pejabat.service.spec.ts`).

- **Checkpoint B09 (Master Data)**:
  - CRUD dinamis `JenisPemeriksaan` (seed: Ketaatan, Kinerja, Dengan Tujuan Tertentu, Investigatif).
  - CRUD dinamis `StatusRekomendasi` dengan kategori stabil `SELESAI` vs `BELUM_SELESAI` (seed: Sesuai, Belum Sesuai, Belum Ditindaklanjuti, Tidak Dapat Ditindaklanjuti).
  - CRUD `SuratTemplate` dengan versioning otomatis (konten HTML baru otomatis menaikkan versi agar surat historis tidak retroaktif).
  - Mutasi dilindungi khusus `SUPER_ADMIN`.
  - Unit tests lulus (`master-data.service.spec.ts`).

- **Checkpoint B10 (LHP)**:
  - CRUD LHP ter-scope Irban secara ketat:
    - Create LHP memvalidasi unit kerja SIMPEG (`unit_induk = 1`) dan kepemilikan mapping Irban.
    - Admin Irban dilarang membuat LHP untuk unit kerja milik Irban lain.
    - Menyimpan snapshot `irban_id` permanen pada record LHP (kebal terhadap perubahan mapping di masa depan).
    - Field `tanggal_lhp` dan `tanggal_diterima_lhp` wajib (basis countdown peringatan).
  - Filter list LHP default tahun berjalan (`new Date().getFullYear()`) dengan dukungan query eksplisit tanpa menghilangkan histori.
  - `FilesService`: penyimpanan fisik aman di `backend/uploads/lhp/<uuid>.pdf`, validasi MIME type `application/pdf`, proteksi path traversal, dan metadata di tabel `Attachment`.
  - Download LHP PDF via stream terproteksi (`GET /api/v1/lhp/:id/file`) dengan verifikasi autentikasi dan scope Irban. Direktori `uploads/` tidak pernah diekspos sebagai static public folder.
  - Audit trail `CREATE_LHP`, `UPDATE_LHP`, `UPLOAD_LHP_FILE`, `DOWNLOAD_LHP_FILE`.
  - Unit tests lulus (`lhp.service.spec.ts`).

## Files changed
- `frontend/features/users/`: Modul Manajemen Pengguna & Irban (types, API client, hooks TanStack Query, modal aktivasi akun EGOV, modal edit hak akses, modal edit detail Irban, tabel pengguna dengan filter multivariat, tabel daftar 5 wilayah Irban, dan role badge).
- `frontend/app/(protected)/pengguna/page.tsx`: Mengganti placeholder dengan komponen `UsersManagementView`.
- `frontend/tests/users-management.test.ts`: Pengujian unit untuk validasi penetapan wilayah Irban wajib bagi Admin Irban, serialisasi parameter query filter, dan verifikasi zero-password/secret leakage pada payload.
- `frontend/features/dashboard/`: Modul Dashboard Admin Irban (types, API client, custom hook TanStack Query, kartu metrik, status breakdown dinamis, peringatan SP Due, tabel LHP terkini, loading skeleton, dan formatter Rupiah/tanggal).
- `frontend/app/(protected)/dashboard/irban/page.tsx`: Mengganti placeholder dengan komponen `IrbanDashboardView`.
- `frontend/tests/dashboard-irban.test.ts`: Pengujian unit untuk format Rupiah, format persen, format tanggal Indonesia, handling status breakdown dinamis tanpa hardcode, dan kalkulasi recovery rate kerugian daerah.
- `frontend/features/navigation/`: Konfigurasi menu/akses role, app shell responsif, loading state, halaman 403, protected guard, redirect dashboard, dan placeholder fitur.
- `frontend/app/(protected)/`: Layout terproteksi dan route awal untuk dashboard, LHP, surat peringatan, laporan, pengguna, unit kerja, serta master data.
- `frontend/features/auth/components/` & `frontend/app/login/page.tsx`: Redirect pascalogin kini mengikuti default route role dan tautan masuk aplikasi memakai tujuan yang sama.
- `frontend/app/page.tsx`, `frontend/features/foundation/`, dan `frontend/app/globals.css`: Copy status checkpoint dan token warna sidebar diselaraskan dengan app shell.
- `frontend/tests/navigation.test.ts`: Unit test visibilitas menu, akses route paling spesifik, dan default dashboard per role.
- `frontend/package.json` & `frontend/package-lock.json`: Menambahkan `lucide-react` untuk ikon navigasi.
- `frontend/lib/api-client.ts`: Fetch wrapper cookie-based, typed error, one-time retry, dan single-flight refresh.
- `frontend/features/auth/`: API auth, type user/role, hooks TanStack Query, login form, session actions, dan safe redirect.
- `frontend/app/login/page.tsx`: Halaman login SIPATUH.
- `frontend/app/page.tsx`: Status sesi dan aksi login/logout pada landing page.
- `frontend/tests/`: Unit test credentials, refresh/retry concurrency, loop prevention, dan redirect safety.
- `frontend/package.json` & `frontend/package-lock.json`: Script test dan dependency dev `tsx`; audit dependency 0 vulnerability.
- `docs/API_CONTRACT.md`: Memperjelas envelope response auth dan aturan konsumsi frontend.
- `frontend/package.json` & `frontend/package-lock.json`: Menambahkan TanStack Query, Zustand, dan Sonner.
- `frontend/.env.example` & `frontend/.gitignore`: Kontrak base URL API publik tanpa secret dan allowlist template env.
- `frontend/app/layout.tsx` & `frontend/app/providers.tsx`: Metadata SIPATUH serta provider client global.
- `frontend/app/page.tsx` & `frontend/app/globals.css`: Halaman fondasi responsif dan design tokens.
- `frontend/app/error.tsx` & `frontend/app/not-found.tsx`: Pola fallback untuk error tak terduga dan route tidak ditemukan.
- `frontend/features/foundation/components/foundation-overview.tsx`: Komponen feature-oriented pertama.
- `frontend/lib/env.ts`: Validasi konfigurasi URL API publik.
- `frontend/stores/ui-store.ts`: Store UI-only untuk navigasi responsif pada checkpoint berikutnya.
- `backend/package.json` & `backend/package-lock.json`: Penambahan `@nestjs/throttler` dependency.
- `backend/src/app.module.ts`: Registrasi ThrottlerModule, ReportsModule, DashboardModule, dan ThrottlerGuard sebagai APP_GUARD.
- `backend/src/external/`:
  - `interfaces/tte.interface.ts`: Typed interface kontrak TTE API wrapper.
  - `tte/tte.client.ts` & `tte/tte.client.spec.ts`: Client HTTP TTE terisolasi dengan validasi size, formatting payload, dan error handling.
  - `external.module.ts`: Export TteClient.
- `backend/src/surat-peringatan/`:
  - `dto/create-surat-peringatan.dto.ts`: Tambahan DTO `SignSuratPeringatanDto`.
  - `surat-peringatan.service.ts` & `surat-peringatan.service.spec.ts`: Implementasi `signTte`, in-memory concurrency locking, update atomic, dan stream signed PDF.
  - `surat-peringatan.controller.ts`: Endpoint `POST /:id/sign-tte` dan `GET /:id/signed` dengan proteksi throttle.
- `backend/src/reports/`: Modul pelaporan ringkasan pengawasan, ekspor Excel (CSV dengan BOM UTF-8), dan ekspor PDF landscape PDFKit.
- `backend/src/dashboard/`: Modul dasbor operasional Irban dan dasbor eksekutif pimpinan (Bupati) dengan agregasi data multi-Irban.
- `backend/test/reports-dashboard.e2e-spec.ts`: E2E test suite untuk pengujian guard dan proteksi akses unauthenticated pada Reports, Dashboard, dan TTE.
- `docs/SESSION_HANDOFF.md`: Update handoff Checkpoints B17 s.d. F05.
- `docs/API_CONTRACT.md`: Update rincian API contract untuk rute TTE, Reports, Dashboard, dan Hardening.

## Decisions made
- Manajemen pengguna tidak pernah memiliki form input kata sandi/kredensial; seluruh kredensial ASN sepenuhnya dikelola di sistem EGOV.
- Role `ADMIN_IRBAN` diwajibkan memilih tepat satu `irban_id` pada form aktivasi maupun edit hak akses, selaras dengan aturan backend.
- Aksi toggle status pengguna (aktif/nonaktif) dilengkapi dialog konfirmasi interaktif untuk mencegah kesalahan klik dari Super Admin.
- Data master 5 Irban ditampilkan pada tab terpisah dengan kemampuan edit nama dan cakupan keterangan tanpa mengubah kode permanen (`IRBAN_I` s.d. `IRBAN_V`).
- Seluruh angka dan metrik operasional dashboard Irban murni berasal dari payload API backend (`/api/v1/dashboard/irban`), tidak pernah dihitung ulang dari data parsial client.
- Status breakdown dirender dinamis dari `Record<string, number>` sehingga penambahan atau perubahan label status rekomendasi di tabel master tidak merusak antarmuka.
- Kartu pemulihan kerugian daerah mendukung nilai nol (`Rp 0`) atau opsional tanpa menyebabkan layout crash.
- Filter tahun menyediakan pilihan tahun berjalan hingga 3 tahun sebelumnya dengan default otomatis tahun berjalan (`new Date().getFullYear()`).
- Tombol segarkan data memanfaatkan `refetch()` TanStack Query dengan feedback indikator visual `animate-spin`.
- Route guard F03 bersifat client-side untuk UX; setiap endpoint backend tetap wajib menegakkan autentikasi, role, dan scope.
- `BUPATI` secara eksplisit hanya memiliki dua menu: Dashboard Pimpinan dan Laporan.
- Default route `SUPER_ADMIN` dan `BUPATI` adalah `/dashboard/pimpinan`; default route `ADMIN_IRBAN` adalah `/dashboard/irban`.
- Fetch wrapper menggunakan native `fetch`, bukan Axios, agar sesuai arsitektur repo dan tidak menambah lapisan interceptor. Refresh concurrency dikendalikan oleh satu promise pada level module.
- Redirect pascalogin menggunakan route default berbasis role, kecuali parameter `next` internal yang aman tersedia.
- Profil sesi hanya disimpan sebagai cache in-memory TanStack Query. Browser hanya memegang cookie `httpOnly` yang dikelola backend.
- Logout membersihkan cache sesi lokal setelah backend berhasil menghapus cookie, tanpa melakukan refetch `/auth/me` yang tidak diperlukan.
- Frontend melanjutkan versi repo aktual Next.js 16, bukan menurunkan versi ke Next.js 14 yang tercantum pada handoff lama. `docs/ARCHITECTURE.md` juga sudah menetapkan Next.js 16.
- Root layout tetap menjadi Server Component; client boundary dibatasi pada provider, toast, error boundary, dan store interaktif.
- TanStack Query menjadi pemilik server state. Zustand hanya untuk UI state dan tidak boleh menjadi tempat penyimpanan JWT/session credential.
- F01 hanya menyiapkan kontrak `NEXT_PUBLIC_API_BASE_URL`; mekanisme `credentials: include`, single-flight refresh, dan auth session dikerjakan pada F02.
- Scope Irban selalu dipaksakan dari token JWT backend pada `IrbanScopeService.resolveEffectiveIrbanId()` sehingga manipulasi parameter query client diabaikan total untuk `ADMIN_IRBAN`.
- Setiap record LHP menyimpan snapshot `irban_id` saat dibuat, menjamin integritas histori pemeriksaan meskipun penugasan unit kerja ke Irban berubah di kemudian hari.
- Penutupan LHP menggunakan kolom `closed_at` dan `closed_by` (bukan enum lifecycle), sehingga kondisi LHP tetap dapat dibaca secara alami dari status rekomendasi. Reopen LHP dilindungi hanya untuk `SUPER_ADMIN` dengan alasan wajib.
- Hard delete LHP dilarang jika sudah memiliki surat peringatan bertandatangan digital (TTE).
- 100% pelunasan finansial pada tindak lanjut tidak mengubah status rekomendasi menjadi "Selesai/Sesuai" secara otomatis. Penentuan status sepenuhnya wewenang verifikator manusia (inspektur).
- Kalkulasi SP Due engine strictly menggunakan `tanggal_diterima_lhp` dalam hari kalender murni.
- Anchor TTE disuntikkan secara dinamis ke dalam dokumen PDF menggunakan variabel konfigurasi `TTE_SIGNATURE_TAG` (`#tagTTD#`), menjamin konsistensi saat proses penandatanganan elektronik.
- In-memory lock `Set<string>` digunakan pada penandatanganan TTE untuk menangkal race condition akibat klik ganda pengguna.
- Surat peringatan yang telah bertandatangan TTE berstatus *immutable*: regenerasi draft, edit metadata, atau hapus diblokir permanen.
- Laporan CSV Excel menggunakan prefix `\uFEFF` (UTF-8 BOM) sehingga file langsung terbuka dengan rapi dan format karakter tepat di MS Excel tanpa konfigurasi delimiter manual.
- Role `BUPATI` dibatasi secara ketat hanya pada pembacaan dasbor pimpinan (`/dashboard/pimpinan`) dan laporan agregasi (`/reports`); akses ke dasbor operasional Irban langsung ditolak (`403 Forbidden`).

## Tests / verification
- `npm test` (frontend) -> PASS (20 tests: auth client/refresh, safe redirect, visibilitas menu, akses route, default route role, format Rupiah/persen/tanggal, dynamic status breakdown, validasi aktivasi Irban, query builder filter user, dan zero password leak)
- `npm run lint` (frontend) -> PASS (0 error, 0 warning)
- `npm run build` (frontend) -> PASS (Next.js production build dan TypeScript compile sukses)
- `npm run lint` (backend) -> PASS (0 error, 0 warning)
- `npm run build` (backend) -> PASS (NestJS production build berhasil tanpa error)
- `npm test` (backend) -> PASS (23 test suites, 136 unit tests passed 100%)
- `npm run test:e2e` (backend) -> PASS (3 test suites, 13 e2e tests passed 100%)

## Known issues / blockers
- Tidak ada blocker untuk melanjutkan ke F06.
- Login menggunakan akun EGOV nyata belum dieksekusi karena checkpoint ini tidak menggunakan kredensial pengguna atau memodifikasi external database. Kontrak dan perilaku client diverifikasi melalui controller backend, unit test, build, dan visual QA.
- Seluruh backend checkpoints (B01 s.d. B20) serta F01-F05 telah selesai.

## External schema facts verified
- EGOV: Read-only `egov.users` (username, nama_nip, email, unit_kerja).
- SIMPEG: Read-only `simpeg.unit_kerja` (id, unit_kerja, instansi, unit_induk=1).
- Database SIPATUH: Prisma client in sync, seed master data Irban, Jenis Pemeriksaan, Status Rekomendasi, dan Template Surat aktif.

## Next checkpoint
- **F06 - Unit Mapping & Pejabat UI**
- Implementasi antarmuka Super Admin untuk pengelolaan pembagian Unit Kerja (OPD) SIMPEG ke Irban serta administrasi pejabat unit (Kepala OPD):
  - Jelajah dan pencarian Unit Kerja SIMPEG (`unit_induk = 1`).
  - Penugasan Unit Kerja ke wilayah Irban dengan feedback pencegahan duplikasi.
  - CRUD manual pejabat unit kerja (DEFINITIF / PLT / PLH, periode masa penugasan, status aktif).
  - Tampilan resolusi penerima surat peringatan (prioritas PLT/PLH aktif, fallback definitif, manual selection bila lebih dari 1 kandidat sah).
- Preconditions terpenuhi: endpoint `/unit-kerja`, `/irban`, `/pejabat` sudah siap di backend.

## Do not forget
- No writes to EGOV/SIMPEG
- No secrets in repo/logs
- Admin Irban scope enforced in backend
- Bupati read-only executive access only
- JWT/access token/refresh token tidak boleh disimpan di localStorage, sessionStorage, atau Zustand


