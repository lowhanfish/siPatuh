import { PrismaClient, KategoriStatusEnum } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial master data for SIPATUH...');

  // 1. Seed 5 Irban
  const irbans = [
    { kode: 'IRBAN_1', nama: 'Inspektur Pembantu Wilayah I' },
    { kode: 'IRBAN_2', nama: 'Inspektur Pembantu Wilayah II' },
    { kode: 'IRBAN_3', nama: 'Inspektur Pembantu Wilayah III' },
    { kode: 'IRBAN_4', nama: 'Inspektur Pembantu Wilayah IV' },
    { kode: 'IRBAN_5', nama: 'Inspektur Pembantu Wilayah V' },
  ];

  for (const irban of irbans) {
    await prisma.irban.upsert({
      where: { kode: irban.kode },
      update: { nama: irban.nama },
      create: { kode: irban.kode, nama: irban.nama },
    });
  }
  console.log('✓ Irban (5 wilayah) seeded.');

  // 2. Seed Jenis Pemeriksaan
  const jenisPemeriksaans = [
    'Ketaatan',
    'Kinerja',
    'Dengan Tujuan Tertentu',
    'Investigatif',
  ];

  for (const nama of jenisPemeriksaans) {
    await prisma.jenisPemeriksaan.upsert({
      where: { nama },
      update: {},
      create: { nama, is_active: true },
    });
  }
  console.log('✓ Jenis Pemeriksaan seeded.');

  // 3. Seed Status Rekomendasi Dinamis
  const statusRekomendasis = [
    {
      nama: 'Sesuai',
      kategori: KategoriStatusEnum.SELESAI,
      urutan: 1,
    },
    {
      nama: 'Belum Sesuai',
      kategori: KategoriStatusEnum.BELUM_SELESAI,
      urutan: 2,
    },
    {
      nama: 'Belum Ditindaklanjuti',
      kategori: KategoriStatusEnum.BELUM_SELESAI,
      urutan: 3,
    },
    {
      nama: 'Tidak Dapat Ditindaklanjuti',
      kategori: KategoriStatusEnum.SELESAI,
      urutan: 4,
    },
  ];

  for (const status of statusRekomendasis) {
    await prisma.statusRekomendasi.upsert({
      where: { nama: status.nama },
      update: { kategori: status.kategori, urutan: status.urutan },
      create: {
        nama: status.nama,
        kategori: status.kategori,
        urutan: status.urutan,
        is_active: true,
      },
    });
  }
  console.log('✓ Status Rekomendasi seeded.');

  // 4. Seed Template Surat Dasar
  const templates = [
    {
      id: 'template-sp1-v1',
      jenis_surat: 'SP1',
      judul: 'Surat Peringatan Pertama (SP 1) Tindak Lanjut Hasil Pemeriksaan',
      konten_html:
        '<p>Sehubungan dengan Laporan Hasil Pemeriksaan Nomor: <strong>{{nomor_lhp}}</strong> tanggal {{tanggal_lhp}}, disampaikan bahwa sampai saat ini masih terdapat rekomendasi yang belum diselesaikan.</p>',
      versi: 1,
    },
    {
      id: 'template-sp2-v1',
      jenis_surat: 'SP2',
      judul: 'Surat Peringatan Kedua (SP 2) Tindak Lanjut Hasil Pemeriksaan',
      konten_html:
        '<p>Menindaklanjuti Surat Peringatan Pertama dan LHP Nomor: <strong>{{nomor_lhp}}</strong>, ditegaskan kembali kewajiban penyelesaian rekomendasi yang masih belum tuntas.</p>',
      versi: 1,
    },
    {
      id: 'template-sp3-v1',
      jenis_surat: 'SP3',
      judul: 'Surat Peringatan Ketiga (SP 3) Tindak Lanjut Hasil Pemeriksaan',
      konten_html:
        '<p>Berdasarkan evaluasi atas LHP Nomor: <strong>{{nomor_lhp}}</strong> yang telah melampaui batas waktu 60 hari kalender, dengan ini diterbitkan Surat Peringatan Ketiga (Terakhir).</p>',
      versi: 1,
    },
  ];

  for (const tpl of templates) {
    await prisma.suratTemplate.upsert({
      where: { id: tpl.id },
      update: {
        judul: tpl.judul,
        konten_html: tpl.konten_html,
        versi: tpl.versi,
      },
      create: {
        id: tpl.id,
        jenis_surat: tpl.jenis_surat,
        judul: tpl.judul,
        konten_html: tpl.konten_html,
        versi: tpl.versi,
        is_active: true,
      },
    });
  }
  console.log('✓ Template Surat Peringatan seeded.');

  console.log('All seed data completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
