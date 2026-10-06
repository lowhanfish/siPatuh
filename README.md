# SIPATUH (Sistem Informasi Pemantauan Hasil Pemerintahan)

> **Inspektorat Daerah Kabupaten Konawe Selatan**  
> Sistem terpusat untuk memantau, mencatat, memverifikasi, dan melaporkan tindak lanjut atas Laporan Hasil Pemeriksaan (LHP) berbasis web dengan integrasi Tanda Tangan Elektronik (TTE BSrE).

---

## 📖 Dokumentasi Lengkap Pengguna

Buku panduan pengoperasian langkah demi langkah untuk seluruh peran pengguna (*Super Admin/Inspektur*, *Admin Irban*, dan *Bupati*) tersedia di:

👉 **[PANDUAN PENGOPERASIAN APLIKASI SIPATUH (User Manual)](docs/PANDUAN_PENGGUNA.md)**

---

## 🏛️ Prinsip Bisnis Fundamental

1. **OPD Bukan Pengguna Aplikasi**:
   Organisasi Perangkat Daerah (OPD) yang diperiksa tidak memiliki akun di SIPATUH. Dokumen fisik/digital hasil tindak lanjut diserahkan secara resmi oleh OPD ke Inspektorat, kemudian dicatat oleh **Admin Irban** wilayah kerja bersangkutan.
2. **Verifikasi 100% Manual oleh Manusia**:
   Sistem tidak pernah mengubah status rekomendasi menjadi *"Sesuai"* secara otomatis meskipun realisasi setoran kas daerah telah mencapai 100%. Verifikator manusia wajib menelaah keabsahan materiil dokumen dengan catatan pertimbangan tertulis.
3. **Isolasi Wilayah Kerja Irban (Irban Scoping)**:
   Kabupaten Konawe Selatan memiliki 5 Inspektur Pembantu (Irban I s.d. Irban V / Irban Khusus). Akses operasional Admin Irban diisolasi secara ketat di tingkat basis data hanya untuk wilayah binaannya.
4. **Histori Tindak Lanjut Abadi (Append-Only)**:
   Setiap iterasi tindak lanjut dan catatan verifikasi dicatat sebagai riwayat kronologis linimasa (*timeline*) tanpa menimpa data lama.
5. **Batas Waktu & Surat Peringatan Bertingkat**:
   Berdasarkan Peraturan Bupati Konawe Selatan No. 1 Tahun 2012, batas waktu tindak lanjut adalah 60 hari kalender sejak LHP diterima OPD (`tanggal_diterima_lhp`). Jadwal otomatisasi peringatan:
   - **SP1**: Umur tindak lanjut $\ge$ **30 hari kalender**.
   - **SP2**: Umur tindak lanjut $\ge$ **45 hari kalender**.
   - **SP3**: Umur tindak lanjut $\ge$ **60 hari kalender**.
6. **Validitas Hukum dengan TTE BSrE**:
   Surat Peringatan ditandatangani secara elektronik oleh Inspektur Daerah menggunakan integrasi sertifikat elektronik Balai Sertifikasi Elektronik (BSrE) BSSN. Dokumen berstatus *SIGNED* bersifat permanen dan tidak dapat diubah (*immutable*).

---

## 👥 Peran Pengguna (User Roles)

| Peran | Pengguna | Akses & Wewenang |
| :--- | :--- | :--- |
| **SUPER_ADMIN** | Inspektur Daerah & Administrator TI | Akses penuh 5 Irban, Dashboard Pimpinan, penandatanganan utama TTE BSrE, manajemen pengguna & aktivasi EGOV, pemetaan OPD SIMPEG & pejabat, master data, serta hak membuka kembali (*reopen*) LHP yang ditutup. |
| **ADMIN_IRBAN** | Tim Auditor / Pemeriksa Wilayah Irban | Operasional LHP wilayah kerja: input LHP, temuan, rekomendasi, pencatatan tindak lanjut OPD, verifikasi manual rekomendasi, penerbitan draft Surat Peringatan (SP1/SP2/SP3), dan penutupan LHP selesai. |
| **BUPATI** | Bupati Konawe Selatan | *Strictly Read-Only*: Memantau Dashboard Pimpinan (KPI makro, komparasi kinerja antar-Irban, Top 5 OPD tertunggak) dan mengunduh Laporan Pengawasan Daerah. |

---

## 🛠️ Arsitektur Teknologi

```text
Browser (Desktop/Tablet)
       │
       ▼
Frontend: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + TanStack Query + Zustand
       │
       │ (HTTPS / HTTP-only Cookies / Auto-Refresh Token)
       ▼
Backend: NestJS 11 + Prisma ORM + TypeScript
       │
       ├── MySQL Database: sipatuh (Read/Write - Data Operasional SIPATUH)
       ├── MySQL Database: egov    (Read-Only - Autentikasi & Single Identity ASN)
       ├── MySQL Database: simpeg  (Read-Only - Struktur Instansi & Unit Kerja OPD)
       └── TTE API Wrapper        (HTTPS Server-to-Server - eSign BSrE Konawe Selatan)
```

---

## 🚀 Panduan Menjalankan Sistem (Pengembang)

### 1. Prasyarat
- Node.js versi 20+ (LTS)
- MySQL Server (Database `sipatuh`, `egov`, `simpeg`)
- npm / pnpm / yarn

### 2. Konfigurasi Backend
```bash
cd backend
cp .env.example .env
# Sesuaikan kredensial basis data dan konfigurasi JWT/TTE pada file .env
npm install
npx prisma generate
npm run start:dev
```
Backend berjalan pada `http://localhost:3001` (atau port sesuai `.env`).

### 3. Konfigurasi Frontend
```bash
cd frontend
cp .env.example .env.local
# Konfigurasikan NEXT_PUBLIC_API_BASE_URL (default: http://localhost:3001/api/v1)
npm install
npm run dev
```
Frontend berjalan pada `http://localhost:3000`.

### 4. Menjalankan Pengujian (Testing)
```bash
# Pengujian Backend (136 unit tests)
cd backend && npm test

# Pengujian Frontend (54 unit tests)
cd frontend && npm test
```

---

## 📁 Struktur Repositori

```text
siPatuh/
├── backend/                  # NestJS API, Prisma ORM, Modul Bisnis & TTE Client
│   ├── src/
│   │   ├── auth/             # Autentikasi EGOV, JWT, Guards & Scoping
│   │   ├── dashboard/        # Endpoint Dashboard Pimpinan & Admin Irban
│   │   ├── external/         # Adapter EGOV, SIMPEG, dan TTE Client
│   │   ├── irban/            # Wilayah Irban, Pemetaan OPD & Pejabat
│   │   ├── lhp/              # Pengelolaan Dokumen LHP
│   │   ├── master-data/      # Jenis Pemeriksaan, Status Rekomendasi, Template Surat
│   │   ├── rekomendasi/      # Rekomendasi Pengawasan
│   │   ├── reports/          # Agregasi Laporan, Ekspor CSV & PDF Landscape
│   │   ├── surat-peringatan/ # Evaluasi Jatuh Tempo, Draft PDF, & TTE BSrE
│   │   ├── temuan/           # Temuan Hasil Audit
│   │   ├── tindak-lanjut/    # Pencatatan Tindak Lanjut OPD
│   │   ├── users/            # Pengguna Lokal & Aktivasi Akun
│   │   └── verifikasi/       # Verifikasi Manual Tim Pemeriksa
├── docs/                     # Dokumentasi Teknis & Panduan Pengguna
│   ├── API_CONTRACT.md       # Spesifikasi Kontrak API
│   ├── ARCHITECTURE.md       # Arsitektur & Keamanan Sistem
│   ├── DATA_MODEL.md         # Skema Basis Data & Relasi
│   ├── DECISIONS.md          # Catatan Keputusan Arsitektur (ADR)
│   ├── EXTERNAL_SYSTEMS.md   # Integrasi EGOV, SIMPEG, & BSrE
│   ├── PANDUAN_PENGGUNA.md   # BUKU PANDUAN PENGOPERASIAN PENGGUNA (User Manual)
│   ├── PROJECT_CONTEXT.md    # Konteks Domain & Regulasi
│   └── SESSION_HANDOFF.md    # Catatan Perjalanan Checkpoint & Status QA
└── frontend/                 # Next.js 16 App Router UI
    ├── app/                  # Rute Halaman (Protected Shell & Login)
    ├── features/             # Komponen UI Terisolasi per Fitur Domain
    ├── lib/                  # Klien API dengan Auto-Refresh Session
    └── public/               # Aset Gambar, Logo Pemkab Konsel & Inspektorat
```

---

## 📄 Lisensi & Hak Cipta
Hak Cipta © 2026 Pemerintah Kabupaten Konawe Selatan — Inspektorat Daerah.  
Seluruh hak cipta dilindungi undang-undang.
