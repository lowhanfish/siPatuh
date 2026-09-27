# Architectural & Engineering Decisions (ADR)

Dokumen ini memuat keputusan arsitektural dan teknis yang mengikat dalam pengembangan SIPATUH. Setiap perubahan pada keputusan ini wajib didiskusikan dan dicatat secara eksplisit di sini.

---

## ADR-01: Multi-Database Boundaries & Hak Akses
* **Konteks**: Sistem beroperasi di lingkungan MySQL server yang sama dengan database EGOV dan SIMPEG.
* **Keputusan**:
  1. Database `sipatuh` adalah satu-satunya database yang berstatus **READ/WRITE** dan dikelola skemanya menggunakan Prisma ORM.
  2. Database `egov` dan `simpeg` adalah **READ-ONLY**.
  3. **Larangan Keras**: Dilarang membuat migration Prisma, DDL, maupun DML (INSERT, UPDATE, DELETE) ke database `egov` atau `simpeg`.
  4. Relasi antar-database menggunakan scalar reference ID biasa, bukan Foreign Key (FK) database silang (cross-database FK).

## ADR-02: Mekanisme Autentikasi & Penyimpanan Kredensial
* **Konteks**: Pengguna login menggunakan NIP atau username yang terdaftar di EGOV.
* **Keputusan**:
  1. SIPATUH memvalidasi hash kata sandi langsung terhadap data `egov` secara terisolasi.
  2. SIPATUH **TIDAK PERNAH** menyalin, menyimpan, maupun membuat duplikat password/hash pengguna ke dalam database `sipatuh`.
  3. Pengguna EGOV yang sah tidak otomatis memiliki akses ke SIPATUH; mereka harus didaftarkan dan diaktifkan terlebih dahulu di tabel lokal `User` SIPATUH oleh `SUPER_ADMIN`.
  4. Token sesi menggunakan JWT:
     * Access Token: durasi 15 menit, disimpan di `httpOnly secure cookie`.
     * Refresh Token: durasi 7 hari, disimpan di `httpOnly secure cookie`.
     * Browser/localStorage **TIDAK PERNAH** menyimpan JWT secara langsung guna mencegah risiko XSS.
  5. Frontend menerapkan mekanisme *single-flight auto-refresh wrapper* untuk mencegah *refresh token storm* saat terdapat banyak request paralel yang menerima status HTTP 401.

## ADR-03: Penegakan Otorisasi Wilayah (Irban Scoping) di Backend
* **Konteks**: Terdapat 5 Irban di Inspektorat Konawe Selatan. Admin Irban tidak boleh mengakses data Irban lain.
* **Keputusan**:
  1. Hak akses dan batasan Irban **WAJIB** ditegakkan di backend level controller/service/query.
  2. Nilai `irban_id` untuk pengguna dengan role `ADMIN_IRBAN` **WAJIB diambil langsung dari sesi terotentikasi (principal)**, BUKAN dari parameter request body, query parameter, atau header dari client.
  3. Menyembunyikan menu di frontend semata tidak dianggap sebagai kontrol keamanan.

## ADR-04: Model Siklus Hidup LHP Tanpa Enum Status Tunggal
* **Konteks**: Status penyelesaian LHP sering kali kompleks dan bergantung pada status masing-masing rekomendasi.
* **Keputusan**:
  1. Tidak menggunakan enum kaku `DRAFT/AKTIF/SELESAI` pada tabel LHP.
  2. Kondisi bisnis agregat dihitung dari status rekomendasi di bawahnya.
  3. Penutupan LHP dilakukan melalui tindakan manual eksplisit (*Tandai Selesai*) yang mengisi kolom `closed_at` dan `closed_by`.
  4. Pembukaan kembali LHP (*Reopen*) hanya dapat dilakukan oleh `SUPER_ADMIN` dengan mencatat alasan pembukaan kembali secara wajib ke dalam `AuditLog`.

## ADR-05: Snapshot Data Historis pada Transaksi Penting
* **Konteks**: Master data seperti struktur organisasi, pejabat unit kerja, dan template surat dapat berubah sewaktu-waktu. Dokumen hukum/audit tidak boleh berubah akibat perubahan masa depan.
* **Keputusan**:
  1. **LHP**: Menyimpan snapshot `irban_id` pada saat LHP dibuat. Jika mapping unit kerja ke Irban di masa depan berubah, LHP lama tetap tercatat pada Irban pembuatnya.
  2. **Surat Peringatan (SP)**: Menyimpan snapshot nama unit kerja, NIP penerima, nama penerima, jabatan penerima, versi template yang digunakan, serta daftar butir rekomendasi yang belum selesai saat surat di-generate.
  3. Setelah surat berhasil ditandatangani secara elektronik (TTE), PDF signed menjadi permanen (*immutable*) dan tidak dapat dimodifikasi atau di-generate ulang.

## ADR-06: Pejabat Unit Kerja & Aturan Penugasan (DEFINITIF / PLT / PLH)
* **Konteks**: Data pimpinan unit kerja (Kepala Dinas/Badan/Camat) sering kali dijabat oleh Pelaksana Tugas (PLT) atau Pelaksana Harian (PLH).
* **Keputusan**:
  1. Data pejabat unit kerja dikelola secara manual di database `sipatuh` (tidak mengambil otomatis dari SIMPEG) karena status penugasan PLT/PLH lebih dinamis.
  2. Seorang ASN dimungkinkan memiliki jabatan definitif di satu OPD dan menjadi PLT/PLH di OPD lain.
  3. Prioritas penetapan kandidat penerima surat: PLT/PLH aktif diutamakan di atas Pejabat Definitif. Jika terdapat ambiguitas, Super Admin dapat menentukan pilihan secara manual saat pembuatan surat.

## ADR-07: Nilai Keuangan Bersifat Opsional
* **Konteks**: Tidak semua temuan pemeriksaan melibatkan kerugian keuangan negara atau tuntutan ganti rugi fisik (banyak yang berupa kesalahan administratif/tata kelola).
* **Keputusan**:
  1. Kolom nilai keuangan pada `Temuan`, `Rekomendasi`, dan `TindakLanjut` bersifat *nullable* (*optional Decimal*).
  2. Jika nilai keuangan diisi, sistem menghitung sisa nilai rekomendasi secara matematis.
  3. Perhitungan nilai keuangan 100% lunas **tidak otomatis** mengubah status rekomendasi menjadi selesai; status akhir tetap ditentukan oleh putusan verifikator manusia.

## ADR-08: Keamanan & Integrasi Tanda Tangan Elektronik (TTE)
* **Konteks**: Mengintegrasikan SIPATUH dengan wrapper `tte_api` milik Kabupaten Konawe Selatan (repo `lowhanfish/tte_api`).
* **Keputusan**:
  1. Komunikasi backend-to-backend menggunakan JSON POST terisolasi.
  2. **Larangan Keras Pencatatan Rahasia**: Passphrase TTE, NIK penuh, dan token otentikasi dilarang keras dicatat ke file log, database, error tracker, maupun dikirim kembali ke frontend.
  3. Frontend meminta NIK dan Passphrase hanya pada saat modal eksekusi TTE dibuka, menggunakan field bertipe password, dan membersihkan memori setelah modal ditutup.
  4. Ukuran PDF draft divalidasi terlebih dahulu sebelum dikirim ke wrapper (rekomendasi batas maksimum: 7 MB) untuk menghindari beban JSON payload berlebih.
  5. Diterapkan mekanisme locking/idempotency agar klik ganda pada tombol tidak menghasilkan request tanda tangan ganda.
