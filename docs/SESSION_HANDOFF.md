# SESSION_HANDOFF

## Active checkpoint
B10 - LHP (Completed) -> Next: B11 - Temuan & Rekomendasi

## Completed in this session
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
- `backend/src/audit/audit.service.ts` & `.spec.ts`: Safe audit logging dengan sanitasi otomatis data rahasia.
- `backend/src/audit/audit.module.ts`: Global module untuk AuditService.
- `backend/src/auth/decorators/roles.decorator.ts`: `@Roles()` decorator.
- `backend/src/auth/decorators/current-user.decorator.ts`: `@CurrentUser()` decorator.
- `backend/src/auth/guards/roles.guard.ts` & `.spec.ts`: RolesGuard dengan validasi RBAC.
- `backend/src/irban/irban-scope.service.ts` & `.spec.ts`: Penegakan isolasi wilayah Irban dan read-only Bupati.
- `backend/src/irban/irban.service.ts`, `irban.controller.ts`, `irban.module.ts`: Modul Irban.
- `backend/src/irban/unit-kerja.service.ts`, `unit-kerja.controller.ts`: Mapping Unit Kerja SIMPEG ke Irban.
- `backend/src/irban/pejabat.service.ts`, `pejabat.controller.ts`, `pejabat.service.spec.ts`: Manajemen pejabat unit kerja & recipient resolution logic.
- `backend/src/external/interfaces/egov.interface.ts` & `egov.adapter.ts`: Penambahan `searchUsers` dan `findUserById` read-only.
- `backend/src/users/users.service.ts`, `users.controller.ts`, `users.service.spec.ts`, `users.module.ts`: Manajemen user lokal SIPATUH dan aktivasi dari EGOV.
- `backend/src/master-data/master-data.service.ts`, `master-data.controller.ts`, `master-data.module.ts`, `master-data.service.spec.ts`: Master data jenis pemeriksaan, status rekomendasi dinamis, dan template surat terversi.
- `backend/src/files/files.service.ts`, `files.module.ts`: File storage lokal aman, MIME validation, dan Attachment tracking.
- `backend/src/lhp/lhp.service.ts`, `lhp.controller.ts`, `lhp.module.ts`, `lhp.service.spec.ts`: Manajemen LHP ter-scope Irban dan secure file upload/download.
- `backend/src/app.module.ts`: Pendaftaran modul `AuditModule`, `MasterDataModule`, `LhpModule`.
- `docs/SESSION_HANDOFF.md`: Update handoff B06 s.d. B10.

## Decisions made
- Scope Irban selalu dipaksakan dari token JWT backend pada `IrbanScopeService.resolveEffectiveIrbanId()` sehingga manipulasi parameter query client diabaikan total untuk `ADMIN_IRBAN`.
- Setiap record LHP menyimpan snapshot `irban_id` saat dibuat, menjamin integritas histori pemeriksaan meskipun penugasan unit kerja ke Irban berubah di kemudian hari.
- Penutupan LHP menggunakan kolom `closed_at` dan `closed_by` (bukan enum lifecycle), sehingga kondisi LHP tetap dapat dibaca secara alami dari status rekomendasi.
- Seluruh DTO menggunakan definite assignment assertion (`!:`) untuk kompatibilitas penuh dengan mode TypeScript `strictPropertyInitialization`.

## Tests / verification
- `npm run lint` (backend) -> PASS (0 error, 0 warning)
- `npm run build` (backend) -> PASS (NestJS production build berhasil tanpa error)
- `npm test` (backend) -> PASS (13 test suites, 64 unit tests passed)
- `npm run test:e2e` (backend) -> PASS (2 test suites, 6 e2e tests passed)

## Known issues / blockers
- Tidak ada blocker untuk Checkpoint B11.
- TTE staging/production URL & TOKEN wrapper akan dikonfigurasi saat Checkpoint B17.

## External schema facts verified
- EGOV: Read-only `egov.users` (username, nama_nip, email, unit_kerja).
- SIMPEG: Read-only `simpeg.unit_kerja` (id, unit_kerja, instansi, unit_induk=1).
- Database SIPATUH: Prisma client in sync, seed master data Irban, Jenis Pemeriksaan, Status Rekomendasi, dan Template Surat aktif.

## Next checkpoint
- **B11 - Temuan & Rekomendasi**
- Preconditions: Checkpoint B10 selesai, CRUD LHP aktif, Prisma model `Temuan` dan `Rekomendasi` siap, build & tests 100% lulus.

## Do not forget
- No writes to EGOV/SIMPEG
- No secrets in repo/logs
- Admin Irban scope enforced in backend
