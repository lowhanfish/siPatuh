# SESSION_HANDOFF

## Active checkpoint
B15 - SP Due Engine (Completed) -> Next: B16 - Surat Peringatan & PDF

## Completed in this session
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
- `backend/src/temuan/`: `dto/temuan.dto.ts`, `temuan.service.ts`, `temuan.controller.ts`, `temuan.module.ts`, `temuan.service.spec.ts`.
- `backend/src/rekomendasi/`: `dto/rekomendasi.dto.ts`, `rekomendasi.service.ts`, `rekomendasi.controller.ts`, `rekomendasi.module.ts`, `rekomendasi.service.spec.ts`.
- `backend/src/tindak-lanjut/`: `dto/tindak-lanjut.dto.ts`, `tindak-lanjut.service.ts`, `tindak-lanjut.controller.ts`, `tindak-lanjut.module.ts`, `tindak-lanjut.service.spec.ts`.
- `backend/src/verifikasi/`: `dto/create-verifikasi.dto.ts`, `verifikasi.service.ts`, `verifikasi.controller.ts`, `verifikasi.module.ts`, `verifikasi.service.spec.ts`.
- `backend/src/surat-peringatan/`: `sp-due.service.ts`, `surat-peringatan.controller.ts`, `surat-peringatan.module.ts`, `sp-due.service.spec.ts`.
- `backend/src/lhp/`: `dto/close-reopen-lhp.dto.ts`, update `lhp.service.ts`, `lhp.controller.ts`, `lhp.service.spec.ts`.
- `backend/src/app.module.ts`: Pendaftaran modul `TemuanModule`, `RekomendasiModule`, `TindakLanjutModule`, `VerifikasiModule`, `SuratPeringatanModule`.
- `docs/SESSION_HANDOFF.md`: Update handoff B11 s.d. B15.
- `docs/API_CONTRACT.md`: Update rincian endpoint B11 s.d. B15.

## Decisions made
- Scope Irban selalu dipaksakan dari token JWT backend pada `IrbanScopeService.resolveEffectiveIrbanId()` sehingga manipulasi parameter query client diabaikan total untuk `ADMIN_IRBAN`.
- Setiap record LHP menyimpan snapshot `irban_id` saat dibuat, menjamin integritas histori pemeriksaan meskipun penugasan unit kerja ke Irban berubah di kemudian hari.
- Penutupan LHP menggunakan kolom `closed_at` dan `closed_by` (bukan enum lifecycle), sehingga kondisi LHP tetap dapat dibaca secara alami dari status rekomendasi. Reopen LHP dilindungi hanya untuk `SUPER_ADMIN` dengan alasan wajib.
- Hard delete LHP dilarang jika sudah memiliki surat peringatan bertandatangan digital (TTE).
- 100% pelunasan finansial pada tindak lanjut tidak mengubah status rekomendasi menjadi "Selesai/Sesuai" secara otomatis. Penentuan status sepenuhnya wewenang verifikator manusia (inspektur).
- Kalkulasi SP Due engine strictly menggunakan `tanggal_diterima_lhp` dalam hari kalender murni.

## Tests / verification
- `npm run lint` (backend) -> PASS (0 error, 0 warning)
- `npm run build` (backend) -> PASS (NestJS production build berhasil tanpa error)
- `npm test` (backend) -> PASS (18 test suites, 96 unit tests passed)
- `npm run test:e2e` (backend) -> PASS (2 test suites, 6 e2e tests passed)

## Known issues / blockers
- Tidak ada blocker untuk Checkpoint B16.
- TTE staging/production URL & TOKEN wrapper akan dikonfigurasi saat Checkpoint B17.

## External schema facts verified
- EGOV: Read-only `egov.users` (username, nama_nip, email, unit_kerja).
- SIMPEG: Read-only `simpeg.unit_kerja` (id, unit_kerja, instansi, unit_induk=1).
- Database SIPATUH: Prisma client in sync, seed master data Irban, Jenis Pemeriksaan, Status Rekomendasi, dan Template Surat aktif.

## Next checkpoint
- **B16 - Surat Peringatan & PDF**
- Preconditions: Checkpoint B15 selesai, SP Due engine aktif, template surat master data tersedia, PDF generator engine siap dikonfigurasi.

## Do not forget
- No writes to EGOV/SIMPEG
- No secrets in repo/logs
- Admin Irban scope enforced in backend
