// Isi panduan publik diringkas dari docs/PANDUAN_PENGGUNA.md.
// Gambar disimpan di public/panduan dan diambil dari aplikasi berisi data uji.

export type GuideRole = "SUPER_ADMIN" | "ADMIN_IRBAN" | "BUPATI";

export type GuideImage = {
  src: string;
  alt: string;
  caption: string;
};

export type GuideStep = {
  id: string;
  title: string;
  summary: string;
  path?: string;
  roles: GuideRole[];
  instructions: string[];
  notes?: { tone: "info" | "warning"; text: string }[];
  images: GuideImage[];
};

export const guideRoles: Record<
  GuideRole,
  { label: string; title: string; scope: string; duties: string[] }
> = {
  SUPER_ADMIN: {
    label: "Super Admin",
    title: "Inspektur Daerah",
    scope: "Seluruh wilayah Irban I sampai Irban V",
    duties: [
      "Memantau Dashboard Pimpinan dan Dashboard Irban",
      "Mengelola LHP, temuan, rekomendasi, dan tindak lanjut",
      "Membuka kembali LHP yang sudah ditutup",
      "Menandatangani Surat Peringatan secara elektronik (TTE)",
      "Mengelola pengguna, unit kerja, pejabat, dan master data",
    ],
  },
  ADMIN_IRBAN: {
    label: "Admin Irban",
    title: "Petugas wilayah Irban",
    scope: "Hanya unit kerja binaan Irban yang ditugaskan",
    duties: [
      "Mencatat LHP, temuan, dan rekomendasi",
      "Menginput dokumen tindak lanjut dari OPD",
      "Melakukan verifikasi manual dan menutup LHP",
      "Menyiapkan draft Surat Peringatan",
      "Menyusun laporan wilayah sendiri",
    ],
  },
  BUPATI: {
    label: "Bupati",
    title: "Pimpinan daerah",
    scope: "Seluruh wilayah, hanya membaca",
    duties: [
      "Memantau capaian di Dashboard Pimpinan",
      "Membandingkan kinerja antar-Irban",
      "Membaca dan mengekspor laporan pengawasan",
    ],
  },
};

export const guideSteps: GuideStep[] = [
  {
    id: "login",
    title: "Masuk ke SIPATUH",
    summary:
      "Akun SIPATUH memakai Single Identity EGOV Kabupaten Konawe Selatan. Tidak ada pendaftaran mandiri: akun diaktifkan oleh Super Admin Inspektorat.",
    path: "/login",
    roles: ["SUPER_ADMIN", "ADMIN_IRBAN", "BUPATI"],
    instructions: [
      "Buka alamat SIPATUH, lalu pilih Masuk ke SIPATUH di beranda.",
      "Isi NIP (18 digit) atau username EGOV pada kolom pertama.",
      "Isi password EGOV, lalu tekan Masuk ke SIPATUH.",
      "Admin Irban diarahkan ke Dashboard Irban; Inspektur dan Bupati diarahkan ke Dashboard Pimpinan.",
      "Selesai bekerja, tekan Keluar di pojok kanan atas, terutama di komputer bersama.",
    ],
    notes: [
      {
        tone: "info",
        text: "Jika muncul pesan akun belum terdaftar, akun EGOV Anda belum diaktifkan. Hubungi administrator Inspektorat.",
      },
    ],
    images: [
      {
        src: "/panduan/01-login.webp",
        alt: "Halaman masuk SIPATUH dengan kolom NIP atau username dan password EGOV",
        caption: "Halaman masuk: gunakan NIP atau username beserta password EGOV.",
      },
    ],
  },
  {
    id: "lhp",
    title: "Mencatat Laporan Hasil Pemeriksaan (LHP)",
    summary:
      "Menu LHP adalah pusat kerja pengawasan. Setiap LHP menyimpan nomor dokumen, OPD terperiksa, jenis pemeriksaan, dan tanggal diterima OPD sebagai dasar hitung batas waktu.",
    path: "/lhp",
    roles: ["SUPER_ADMIN", "ADMIN_IRBAN"],
    instructions: [
      "Buka menu LHP di bilah samping. Gunakan filter tahun, status, jenis pemeriksaan, dan pencarian untuk menemukan dokumen.",
      "Tekan Tambah LHP untuk membuka formulir pendaftaran.",
      "Isi nomor LHP, OPD terperiksa, jenis pemeriksaan, tanggal penerbitan, dan tanggal diterima LHP oleh OPD.",
      "Lengkapi periode pemeriksaan, keterangan, dan unggah berkas PDF LHP bila tersedia.",
      "Simpan. Ubah data lewat ikon pensil selama LHP belum ditutup.",
    ],
    notes: [
      {
        tone: "warning",
        text: "Tanggal diterima LHP oleh OPD menjadi dasar batas waktu 60 hari dan jadwal Surat Peringatan. Isi sesuai tanda terima resmi.",
      },
    ],
    images: [
      {
        src: "/panduan/02-lhp-daftar.webp",
        alt: "Daftar LHP dengan filter tahun, status, dan pencarian",
        caption: "Daftar LHP beserta filter dan tombol Tambah LHP.",
      },
      {
        src: "/panduan/03-lhp-form.webp",
        alt: "Formulir tambah LHP dalam keadaan kosong",
        caption: "Formulir pendaftaran LHP baru.",
      },
    ],
  },
  {
    id: "temuan-rekomendasi",
    title: "Menambahkan Temuan & Rekomendasi",
    summary:
      "Satu LHP berisi satu atau lebih temuan, dan setiap temuan memuat satu atau lebih rekomendasi yang wajib ditindaklanjuti OPD.",
    path: "/lhp → detail LHP",
    roles: ["SUPER_ADMIN", "ADMIN_IRBAN"],
    instructions: [
      "Buka detail LHP dengan menekan nomor LHP pada daftar.",
      "Tekan Tambah Temuan, isi judul, uraian kondisi, dan nilai finansial bila ada, lalu simpan.",
      "Pada kartu temuan, tekan Tambah Rekomendasi. Isi uraian instruksi, status awal, dan nilai kewajiban pengembalian bila ada.",
      "Rekomendasi tampil bernomor (misalnya 1.1, 1.2) lengkap dengan status dan nilai finansialnya.",
      "Setelah semua rekomendasi berkategori selesai, tekan Tandai Selesai untuk menutup LHP. Hanya Inspektur yang dapat membuka kembali LHP tertutup dengan alasan tertulis.",
    ],
    images: [
      {
        src: "/panduan/04-lhp-detail.webp",
        alt: "Detail LHP yang menampilkan daftar temuan dan rekomendasi",
        caption: "Detail LHP: temuan dan rekomendasi tersusun bertingkat.",
      },
    ],
  },
  {
    id: "tindak-lanjut",
    title: "Tindak Lanjut & Verifikasi",
    summary:
      "OPD tidak memiliki akun. Dokumen tindak lanjut diserahkan ke Inspektorat lalu dicatat oleh Admin Irban. Setiap entri tersimpan berurutan dan tidak pernah ditimpa.",
    roles: ["SUPER_ADMIN", "ADMIN_IRBAN"],
    instructions: [
      "Pada detail LHP, tekan Tindak Lanjut & Verifikasi di kartu rekomendasi. Panel tindak lanjut terbuka dari sisi kanan.",
      "Tekan Input Tindak Lanjut. Isi tanggal dokumen diterima, uraian tindak lanjut, dan nilai setoran kas daerah bila ada.",
      "Unggah bukti (PDF, JPG, atau PNG, maksimal 5 MB), lalu simpan.",
      "Setelah bukti ditelaah, tekan Verifikasi Dokumen. Pilih status baru (Sesuai, Belum Sesuai, atau Tidak Dapat Ditindaklanjuti) dan tulis catatan pertimbangan.",
      "Riwayat pencatat, berkas bukti, verifikator, dan perubahan status tampil di linimasa sebagai jejak audit.",
    ],
    notes: [
      {
        tone: "warning",
        text: "Pelunasan finansial 100% tidak otomatis menyelesaikan rekomendasi. Status hanya berubah melalui verifikasi manual.",
      },
    ],
    images: [
      {
        src: "/panduan/05-tindak-lanjut.webp",
        alt: "Panel tindak lanjut dengan kartu akuntabilitas finansial dan linimasa",
        caption: "Panel tindak lanjut: rekomendasi, akuntabilitas finansial, dan linimasa.",
      },
    ],
  },
  {
    id: "surat-peringatan",
    title: "Surat Peringatan & Tanda Tangan Elektronik",
    summary:
      "Batas tindak lanjut adalah 60 hari kalender sejak LHP diterima OPD. SP1 dapat terbit pada hari ke-30, SP2 pada hari ke-45, dan SP3 pada hari ke-60 selama masih ada rekomendasi belum selesai.",
    path: "/surat-peringatan",
    roles: ["SUPER_ADMIN", "ADMIN_IRBAN"],
    instructions: [
      "Buka menu Surat Peringatan, lalu tab Jatuh Tempo untuk melihat LHP yang layak diberi SP.",
      "Tekan Buat SP. Level surat ditentukan sistem; isi nomor surat yang unik dan tanggal surat.",
      "Periksa pejabat penerima dan daftar rekomendasi tertunggak, lalu terbitkan draft. Daftar ini dikunci ke dalam naskah surat.",
      "Di tab Daftar SP, pratinjau draft PDF untuk memeriksa isi surat.",
      "Inspektur menekan Tanda Tangan Elektronik, mengisi NIK dan passphrase BSrE, lalu menandatangani. Surat berstatus SIGNED siap diunduh dan dikirim ke OPD.",
    ],
    notes: [
      {
        tone: "info",
        text: "TTE hanya dapat dilakukan Super Admin (Inspektur). Passphrase tidak pernah disimpan oleh SIPATUH.",
      },
      {
        tone: "warning",
        text: "Surat yang sudah SIGNED bersifat permanen: tidak dapat diubah, dihapus, atau ditandatangani ulang.",
      },
    ],
    images: [
      {
        src: "/panduan/06-sp-jatuh-tempo.webp",
        alt: "Tab Jatuh Tempo berisi LHP yang layak diberi Surat Peringatan",
        caption: "Tab Jatuh Tempo: LHP yang sudah melewati batas SP1, SP2, atau SP3.",
      },
      {
        src: "/panduan/07-sp-daftar.webp",
        alt: "Daftar Surat Peringatan yang sudah diterbitkan beserta statusnya",
        caption: "Daftar SP: draft siap ditandatangani dan surat yang sudah SIGNED.",
      },
      {
        src: "/panduan/08-sp-tte.webp",
        alt: "Formulir tanda tangan elektronik dengan kolom NIK dan passphrase kosong",
        caption: "Formulir TTE: NIK dan passphrase diisi sendiri oleh Inspektur.",
      },
    ],
  },
  {
    id: "dashboard",
    title: "Memantau Dashboard",
    summary:
      "Dashboard Irban memandu kerja harian wilayah, sedangkan Dashboard Pimpinan menyajikan capaian tingkat kabupaten untuk Inspektur dan Bupati.",
    path: "/dashboard",
    roles: ["SUPER_ADMIN", "ADMIN_IRBAN", "BUPATI"],
    instructions: [
      "Dashboard Pimpinan memuat total LHP, temuan, capaian penyelesaian rekomendasi, jumlah SP, dan pemulihan kerugian daerah.",
      "Gunakan filter tahun untuk membandingkan kinerja dari tahun ke tahun.",
      "Grafik antar-Irban dan tabel lima OPD dengan tunggakan terbanyak menjadi bahan rapat koordinasi.",
      "Dashboard Irban menampilkan statistik wilayah, sebaran status rekomendasi, peringatan LHP jatuh tempo, dan LHP terbaru.",
    ],
    images: [
      {
        src: "/panduan/09-dashboard-pimpinan.webp",
        alt: "Dashboard Pimpinan dengan kartu ringkasan dan grafik capaian",
        caption: "Dashboard Pimpinan untuk Inspektur dan Bupati.",
      },
      {
        src: "/panduan/10-dashboard-irban.webp",
        alt: "Dashboard Irban dengan statistik wilayah dan peringatan jatuh tempo",
        caption: "Dashboard Irban untuk kerja harian wilayah.",
      },
    ],
  },
  {
    id: "laporan",
    title: "Laporan & Ekspor Data",
    summary:
      "Menu Laporan menyusun rekap kinerja per perangkat daerah dan dapat diekspor. Admin Irban otomatis hanya melihat wilayahnya sendiri.",
    path: "/laporan",
    roles: ["SUPER_ADMIN", "ADMIN_IRBAN", "BUPATI"],
    instructions: [
      "Atur filter tahun, wilayah Irban, OPD, jenis pemeriksaan, dan status rekomendasi, lalu terapkan.",
      "Baca matriks per OPD: jumlah LHP, temuan, rekomendasi selesai dan belum, persentase, serta nilai finansial.",
      "Tekan judul kolom untuk mengurutkan, atau gunakan pencarian untuk menemukan OPD.",
      "Tekan Ekspor Excel untuk berkas CSV, atau Ekspor PDF untuk laporan landscape siap cetak.",
    ],
    images: [
      {
        src: "/panduan/11-laporan.webp",
        alt: "Halaman laporan dengan panel filter dan matriks kinerja per OPD",
        caption: "Laporan: filter, matriks per OPD, dan tombol ekspor.",
      },
    ],
  },
];

export const guideFaq: { question: string; answer: string }[] = [
  {
    question: "Mengapa muncul pesan akun belum terdaftar di SIPATUH?",
    answer:
      "Akun EGOV Anda sudah ada tetapi belum diaktifkan di SIPATUH. Hubungi administrator Inspektorat untuk aktivasi, penetapan peran, dan wilayah Irban.",
  },
  {
    question: "Mengapa OPD tidak punya akun untuk mengunggah sendiri?",
    answer:
      "OPD bukan pengguna SIPATUH. Dokumen diterima resmi oleh Inspektorat agar setiap berkas melalui penerimaan dan pemeriksaan awal oleh Admin Irban.",
  },
  {
    question: "Setoran sudah 100%, mengapa rekomendasi belum selesai?",
    answer:
      "Status tidak berubah otomatis. Verifikator harus memeriksa bukti setor lalu melakukan verifikasi manual dan memilih status Sesuai.",
  },
  {
    question: "Mengapa tombol Tandai Selesai tidak aktif?",
    answer:
      "LHP hanya bisa ditutup bila seluruh rekomendasinya berkategori selesai, misalnya Sesuai atau Tidak Dapat Ditindaklanjuti.",
  },
  {
    question: "Mengapa penandatanganan TTE gagal?",
    answer:
      "Periksa passphrase (huruf besar dan kecil), pastikan NIK sesuai pemilik sertifikat BSrE, dan pastikan server terhubung ke layanan eSign daerah.",
  },
  {
    question: "Berkas bukti gagal diunggah?",
    answer:
      "Pastikan berkas berformat PDF, JPG, atau PNG dengan ukuran paling besar 5 MB. Kompres berkas terlebih dahulu bila terlalu besar.",
  },
];
