# SIPATUH - Project Context

## 1. Identitas Proyek
* **Nama Sistem**: SIPATUH (Sistem Informasi Pemantauan Hasil Pemerintahan)
* **Instansi**: Inspektorat Daerah Kabupaten Konawe Selatan
* **Target Lingkungan**: Internal Pemerintahan Kabupaten Konawe Selatan

## 2. Tujuan & Urgensi
SIPATUH dibangun sebagai sistem terpusat untuk memantau, mencatat, memverifikasi, dan melaporkan tindak lanjut atas Laporan Hasil Pemeriksaan (LHP) Inspektorat.
Tujuan utama:
* Mencegah data tercecer atau rekap manual yang lambat dan rawan inkonsistensi.
* Menjaga rekam jejak (*audit trail*) dan histori perubahan tindak lanjut dan verifikasi secara transparan dan akuntabel.
* Memberikan dashboard real-time untuk pemantauan oleh Admin Irban (per wilayah kerja), Inspektur (seluruh wilayah), dan Bupati (laporan ringkas eksekutif).
* Mengotomasi penghitungan umur LHP dan penerbitan Surat Peringatan (SP1, SP2, SP3) bertingkat yang terintegrasi dengan Tanda Tangan Elektronik (TTE).

## 3. Prinsip Bisnis Fundamental
1. **OPD Bukan Pengguna Aplikasi**:
   Organisasi Perangkat Daerah (OPD) yang diperiksa tidak memiliki akun di SIPATUH. Dokumen fisik/digital tindak lanjut diserahkan oleh OPD ke Inspektorat, kemudian dicatat ke sistem oleh **Admin Irban** yang membawahi OPD tersebut.
2. **Verifikasi Dilakukan Manual oleh Manusia**:
   Sistem tidak pernah mengubah status rekomendasi menjadi "Sesuai" atau "Selesai" secara otomatis. Meskipun nilai keuangan tindak lanjut sudah 100% mencukupi nilai rekomendasi, verifikasi keabsahan materiil dokumen tetap wajib dilakukan oleh verifier manusia dengan catatan tertulis.
3. **Alur Domain Utama**:
   $$\text{LHP} \longrightarrow \text{Temuan} \longrightarrow \text{Rekomendasi} \longrightarrow \text{Tindak Lanjut} \longrightarrow \text{Verifikasi}$$
4. **Isolasi Wilayah Irban (Irban Scoping)**:
   Kabupaten Konawe Selatan memiliki 5 Inspektur Pembantu (Irban). Admin Irban hanya berhak melihat dan mengelola data LHP dan rekomendasi di wilayah binaannya. Isolasi ini wajib ditegakkan di backend pada level database query/service.
5. **Histori Tindak Lanjut Abadi (Append-only)**:
   Satu rekomendasi dapat memiliki banyak dokumen/catatan tindak lanjut yang diserahkan bertahap. Rekord lama tidak boleh ditimpa (*no overwrite*), melainkan membentuk linimasa (*timeline*).
6. **Batas Waktu Tindak Lanjut & Surat Peringatan (SP)**:
   Berdasarkan Perbup Konawe Selatan No. 1 Tahun 2012, batas waktu tindak lanjut adalah 60 hari kalender sejak LHP diterima.
   * Basis perhitungan hari: `tanggal_diterima_lhp` (bukan tanggal penerbitan LHP).
   * Jadwal peringatan: SP1 ($\ge$ 30 hari), SP2 ($\ge$ 45 hari), SP3 ($\ge$ 60 hari).
   * Surat hanya dapat diterbitkan jika masih ada rekomendasi berstatus belum selesai.
   * Maksimal satu surat per level untuk satu LHP.

## 4. Peran Pengguna (Roles V1)
* **SUPER_ADMIN (Inspektur)**:
  * Akses penuh ke seluruh data 5 Irban.
  * Manajemen pengguna lokal SIPATUH dan penugasan role/Irban.
  * Manajemen master data (Jenis Pemeriksaan, Status Rekomendasi, Template Surat).
  * Hak membuka kembali (*reopen*) LHP yang telah ditandai selesai (dengan alasan wajib & tercatat audit).
  * Penandatanganan TTE utama untuk Surat Peringatan.
  * Akses Dashboard Pimpinan dan Laporan Eksekutif.
* **ADMIN_IRBAN**:
  * Terikat tepat pada 1 Irban dari 5 Irban yang ada.
  * Mengelola LHP, Temuan, Rekomendasi, Tindak Lanjut, Verifikasi, dan draft Surat Peringatan khusus wilayah Irban miliknya.
  * Menandai LHP Selesai jika seluruh rekomendasi telah tuntas.
* **BUPATI**:
  * Akses *read-only* khusus Dashboard Pimpinan dan Laporan Tindak Lanjut eksekutif.
  * Tidak memiliki akses ke fitur CRUD, mutasi data, maupun konfigurasi sistem.

## 5. Ruang Lingkup Versi 1 (V1)
* **Masuk V1**:
  * Manajemen autentikasi berbasis EGOV + sesi JWT via httpOnly cookie.
  * Sinkronisasi data unit kerja dari SIMPEG (khusus `unit_induk = 1`).
  * Mapping unit kerja ke Irban secara dinamis dengan snapshot di LHP.
  * Manajemen manual Pejabat Unit Kerja (DEFINITIF / PLT / PLH).
  * Modul LHP, Temuan, Rekomendasi (dengan nilai keuangan opsional Decimal).
  * Pencatatan Tindak Lanjut multi-file dan histori Verifikasi bertingkat.
  * Engine kelayakan Surat Peringatan (SP1/SP2/SP3) dan generator PDF unsigned.
  * Integrasi TTE via wrapper `tte_api` Konawe Selatan.
  * Laporan, Dashboard Admin Irban, Dashboard Pimpinan, serta Audit Log.
* **Di Luar V1 (Excluded)**:
  * Ruang Pesan / Chat / Diskusi internal tidak dimasukkan dalam V1.
  * Daftar Tindak Lanjut dan Matriks Tindak Lanjut digabungkan menjadi satu kesatuan modul pemantauan/laporan untuk mencegah redundansi.
