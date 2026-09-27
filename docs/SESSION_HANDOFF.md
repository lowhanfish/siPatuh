# SESSION_HANDOFF

## Active checkpoint
B05 - Authentication

## Completed in this session
- **Checkpoint B05 (Authentication)**:
  - Menginstal dependensi autentikasi `@nestjs/jwt` (^11.0.0), `bcryptjs`, dan `@types/bcryptjs`.
  - Mengimplementasikan query verifikasi kredensial riil pada `EgovAdapter`:
    - Pencocokan identitas via `username` atau NIP (`nama_nip`) terhadap tabel riil `egov.users`.
    - Verifikasi hash password menggunakan algoritma **Bcrypt** (`$2a$12$`).
    - Password polos maupun hash tidak pernah disalin atau disimpan ke database SIPATUH.
  - Membangun `AuthService`:
    - Validasi kredensial EGOV.
    - Pengecekan pendaftaran dan status keaktifan user lokal SIPATUH (`is_active = true`).
    - Menolak user EGOV yang belum diaktifkan oleh Super Admin dengan pesan informatif.
    - Penerbitan pasangan token JWT: `access_token` (15 menit) dan `refresh_token` (7 hari).
    - Penanganan cookie terproteksi: `httpOnly: true`, `secure: isProduction`, `sameSite: lax/strict`, `path: '/'`.
    - Rotasi refresh token dan endpoint pembatalan sesi / pembersihan cookie (`logout`).
  - Membangun `JwtAuthGuard`:
    - Membaca token dari httpOnly cookie `access_token` (prioritas utama) atau fallback header `Authorization: Bearer <token>`.
    - Memvalidasi token type `access` dan menginjeksikan identitas ke `req.user`.
  - Membangun `AuthController` dengan endpoint RESTful `/api/v1/auth`:
    - `POST /api/v1/auth/login`
    - `POST /api/v1/auth/refresh`
    - `POST /api/v1/auth/logout`
    - `GET /api/v1/auth/me` (dilindungi `JwtAuthGuard`)
  - Menulis unit tests komprehensif (`auth.service.spec.ts`, `egov.adapter.spec.ts`) dan e2e tests (`auth.e2e-spec.ts`).

## Files changed
- `backend/package.json` & `package-lock.json`: Menambahkan `@nestjs/jwt`, `bcryptjs`, `@types/bcryptjs`.
- `backend/src/external/interfaces/egov.interface.ts`: Kontrak antarmuka `EgovUserRecord` dengan kolom riil EGOV.
- `backend/src/external/egov/egov.adapter.ts`: Implementasi verifikasi Bcrypt terhadap `egov.users`.
- `backend/src/external/egov/egov.adapter.spec.ts`: Unit test untuk `EgovAdapter`.
- `backend/src/auth/dto/login.dto.ts`: DTO login dengan validasi class-validator.
- `backend/src/auth/interfaces/jwt-payload.interface.ts`: Interface JwtPayload dan AuthenticatedUser.
- `backend/src/auth/auth.service.ts`: Core auth service (login, refresh, logout, profile).
- `backend/src/auth/auth.service.spec.ts`: Unit test untuk AuthService.
- `backend/src/auth/guards/jwt-auth.guard.ts`: Guard autentikasi JWT cookie & bearer.
- `backend/src/auth/auth.controller.ts`: Controller untuk endpoint auth.
- `backend/src/auth/auth.module.ts`: Modul auth NestJS.
- `backend/test/auth.e2e-spec.ts`: E2E test suite untuk flow auth.
- `docs/SESSION_HANDOFF.md`: Pembaruan status handoff checkpoint B05.

## Decisions made
- Token disimpan murni di secure `httpOnly` cookie untuk mencegah serangan XSS di sisi frontend.
- Kredensial password dari EGOV tidak pernah disalin, dipersist, atau dicatat ke log aplikasi SIPATUH.
- Rotasi refresh token otomatis dilakukan pada setiap pemanggilan `POST /auth/refresh`.

## Tests / verification
- `npm run lint` (backend) -> PASS (0 error, 0 warning)
- `npm run build` (backend) -> PASS (Build NestJS sukses)
- `npm test` (backend) -> PASS (6 test suites, 23 unit tests passed)
- `npm run test:e2e` (backend) -> PASS (2 test suites, 6 e2e tests passed)

## Known issues / blockers
- Tidak ada blocker untuk B06 (RBAC & Irban Scope).
- URL dan TOKEN produksi/staging untuk TTE API wrapper belum diatur pada environment riil (dibutuhkan nanti saat Checkpoint B17).

## External schema facts verified
- EGOV: Database kredensial pengguna riil terhubung (`egov`). Tabel `users` terkonfirmasi berisi 6.417 pengguna dengan kolom `id (varchar(35))`, `username (varchar(20))`, `nama_nip (varchar(25))`, dan `password (text)` berformat Bcrypt `$2a$12$`.
- SIMPEG: Database riil terhubung (`simpeg`). Tabel `unit_kerja` terkonfirmasi dengan kolom `id (varchar(25))`, `unit_kerja`, `instansi`, `unit_induk = 1`, dan `status = 1`.
- TTE: Endpoint REST wrapper `lowhanfish/tte_api` menerima parameter JSON `TOKEN`, `nik`, `passphrase`, `tagTTDX`, `filebase64`, `judul`, `nomor`.

## Next checkpoint
- B06 - RBAC & Irban Scope
- Preconditions: Checkpoint B05 selesai, login EGOV dan token cookie httpOnly siap, build dan tests backend lulus.

## Do not forget
- No writes to EGOV/SIMPEG
- No secrets in repo/logs
- Admin Irban scope enforced in backend
