import test from "node:test";
import assert from "node:assert/strict";
import type {
  CreateRekomendasiInput,
  CreateTemuanInput,
  TemuanItem,
} from "../features/temuan-rekomendasi/types";
import type { AuthUser } from "../features/auth/types";

// Helper simulasi validasi input Temuan
function validateCreateTemuanInput(input: Partial<CreateTemuanInput>): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!input.judul || !input.judul.trim()) {
    errors.judul = "Judul temuan wajib diisi";
  }
  if (!input.uraian || !input.uraian.trim()) {
    errors.uraian = "Uraian temuan wajib diisi";
  }
  if (
    input.nilai_temuan !== undefined &&
    input.nilai_temuan !== null &&
    (isNaN(input.nilai_temuan) || input.nilai_temuan < 0)
  ) {
    errors.nilai_temuan = "Nilai temuan tidak boleh negatif";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Helper simulasi validasi input Rekomendasi
function validateCreateRekomendasiInput(input: Partial<CreateRekomendasiInput>): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!input.uraian || !input.uraian.trim()) {
    errors.uraian = "Uraian rekomendasi wajib diisi";
  }
  if (!input.status_rekomendasi_id) {
    errors.status_rekomendasi_id = "Status rekomendasi wajib dipilih";
  }
  if (
    input.nilai_rekomendasi !== undefined &&
    input.nilai_rekomendasi !== null &&
    (isNaN(input.nilai_rekomendasi) || input.nilai_rekomendasi < 0)
  ) {
    errors.nilai_rekomendasi = "Nilai rekomendasi tidak boleh negatif";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Helper kalkulasi total akumulasi finansial
function calculateFinancialTotals(temuans: TemuanItem[]): {
  totalTemuan: number;
  totalRekomendasi: number;
} {
  const totalTemuan = temuans.reduce((acc, t) => {
    const val = parseFloat(String(t.nilai_temuan || 0));
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  const totalRekomendasi = temuans.reduce((acc, t) => {
    const sub = (t.rekomendasis || []).reduce((subAcc, r) => {
      const val = parseFloat(String(r.nilai_rekomendasi || 0));
      return subAcc + (isNaN(val) ? 0 : val);
    }, 0);
    return acc + sub;
  }, 0);

  return { totalTemuan, totalRekomendasi };
}

test("Validasi form Temuan: nilai finansial opsional tidak memblokir simpan", () => {
  // 1. Temuan non-finansial (nilai_temuan null/undefined) harus valid
  const nonFinansial = validateCreateTemuanInput({
    judul: "Pengelolaan Administrasi SPJ Tidak Lengkap",
    uraian: "Terdapat berkas tanda terima yang belum dilampirkan pada laporan SPJ",
    nilai_temuan: null,
  });
  assert.equal(nonFinansial.isValid, true);
  assert.equal(Object.keys(nonFinansial.errors).length, 0);

  // 2. Temuan dengan nilai finansial sah
  const finansial = validateCreateTemuanInput({
    judul: "Kelebihan Pembayaran Perjalanan Dinas",
    uraian: "Perhitungan biaya akomodasi melebihi standar biaya masukan",
    nilai_temuan: 15000000,
  });
  assert.equal(finansial.isValid, true);

  // 3. Nilai negatif ditolak
  const negatif = validateCreateTemuanInput({
    judul: "Kesalahan Input",
    uraian: "Uraian deskripsi",
    nilai_temuan: -5000,
  });
  assert.equal(negatif.isValid, false);
  assert.equal(negatif.errors.nilai_temuan, "Nilai temuan tidak boleh negatif");

  // 4. Judul dan uraian kosong ditolak
  const kosong = validateCreateTemuanInput({
    judul: "   ",
    uraian: "",
  });
  assert.equal(kosong.isValid, false);
  assert.equal(kosong.errors.judul, "Judul temuan wajib diisi");
  assert.equal(kosong.errors.uraian, "Uraian temuan wajib diisi");
});

test("Validasi form Rekomendasi: status wajib, nilai rupiah opsional", () => {
  // 1. Rekomendasi perbaikan non-keuangan valid tanpa nilai_rekomendasi
  const nonKeuangan = validateCreateRekomendasiInput({
    uraian: "Memerintahkan Pejabat Pembuat Komitmen untuk menyusun SOP kelengkapan dokumen pendukung",
    status_rekomendasi_id: "status-belum-sesuai",
    nilai_rekomendasi: null,
  });
  assert.equal(nonKeuangan.isValid, true);

  // 2. Rekomendasi setor kas dengan nominal
  const setorKas = validateCreateRekomendasiInput({
    uraian: "Menyetorkan kembali kelebihan bayar ke Kas Daerah sebesar Rp 15.000.000,00",
    status_rekomendasi_id: "status-belum-sesuai",
    nilai_rekomendasi: 15000000,
  });
  assert.equal(setorKas.isValid, true);

  // 3. Status rekomendasi tidak dipilih ditolak
  const tanpaStatus = validateCreateRekomendasiInput({
    uraian: "Lakukan perbaikan pembukuan",
    status_rekomendasi_id: "",
  });
  assert.equal(tanpaStatus.isValid, false);
  assert.equal(tanpaStatus.errors.status_rekomendasi_id, "Status rekomendasi wajib dipilih");
});

test("Kalkulasi akumulasi nilai temuan dan rekomendasi multi-item aman", () => {
  const mockTemuans: TemuanItem[] = [
    {
      id: "t-1",
      lhp_id: "lhp-1",
      nomor_urut: 1,
      judul: "Temuan Fisik Gedung",
      uraian: "Kekurangan volume pekerjaan fisik",
      nilai_temuan: 50000000,
      created_at: "2026-03-01T00:00:00Z",
      updated_at: "2026-03-01T00:00:00Z",
      rekomendasis: [
        {
          id: "r-1",
          temuan_id: "t-1",
          nomor_urut: 1,
          uraian: "Setor kekurangan volume ke kas daerah",
          nilai_rekomendasi: 30000000,
          status_rekomendasi_id: "s-1",
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z",
        },
        {
          id: "r-2",
          temuan_id: "t-1",
          nomor_urut: 2,
          uraian: "Teguran tertulis kepada konsultan pengawas",
          nilai_rekomendasi: null, // non-keuangan
          status_rekomendasi_id: "s-2",
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z",
        },
      ],
    },
    {
      id: "t-2",
      lhp_id: "lhp-1",
      nomor_urut: 2,
      judul: "Temuan Administrasi",
      uraian: "Keterlambatan penyampaian laporan",
      nilai_temuan: null, // non-keuangan
      created_at: "2026-03-01T00:00:00Z",
      updated_at: "2026-03-01T00:00:00Z",
      rekomendasis: [
        {
          id: "r-3",
          temuan_id: "t-2",
          nomor_urut: 1,
          uraian: "Sanksi administratif",
          nilai_rekomendasi: null,
          status_rekomendasi_id: "s-1",
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z",
        },
      ],
    },
  ];

  const totals = calculateFinancialTotals(mockTemuans);
  assert.equal(totals.totalTemuan, 50000000);
  assert.equal(totals.totalRekomendasi, 30000000);
});

test("Penegakan wewenang mutasi Temuan/Rekomendasi: Terkunci bila LHP Closed atau role Bupati", () => {
  function canMutateTemuan(user: AuthUser | null, isClosed: boolean): boolean {
    if (!user) return false;
    if (isClosed) return false;
    return user.role === "SUPER_ADMIN" || user.role === "ADMIN_IRBAN";
  }

  const adminIrban: AuthUser = {
    id: "user-1",
    egov_user_id: "irban1",
    nip: "198001012005011001",
    nama: "Admin Irban",
    role: "ADMIN_IRBAN",
    irban_id: "irban-1",
    is_active: true,
  };

  const bupati: AuthUser = {
    id: "user-2",
    egov_user_id: "bupati",
    nip: "196501011990031001",
    nama: "Bupati Konawe Selatan",
    role: "BUPATI",
    irban_id: null,
    is_active: true,
  };

  // 1. Admin Irban pada LHP aktif (open) dapat memutasi
  assert.equal(canMutateTemuan(adminIrban, false), true);

  // 2. Admin Irban pada LHP selesai (closed) terkunci
  assert.equal(canMutateTemuan(adminIrban, true), false);

  // 3. Bupati selalu read-only baik open maupun closed
  assert.equal(canMutateTemuan(bupati, false), false);
  assert.equal(canMutateTemuan(bupati, true), false);
});
