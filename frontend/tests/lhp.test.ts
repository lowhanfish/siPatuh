import test from "node:test";
import assert from "node:assert/strict";
import type { SimpegUnitKerjaItem } from "../features/unit-kerja/types";
import type { AuthUser } from "../features/auth/types";
import type { CreateLhpInput } from "../features/lhp/types";

// Helper simulasi filter unit kerja valid untuk modal create LHP
function filterEligibleUnitsForUser(
  units: SimpegUnitKerjaItem[],
  user: AuthUser | null,
): SimpegUnitKerjaItem[] {
  if (!user) return [];
  if (user.role === "ADMIN_IRBAN") {
    return units.filter(
      (u) => u.is_assigned && u.assigned_irban?.id === user.irban_id,
    );
  }
  if (user.role === "SUPER_ADMIN") {
    return units.filter((u) => u.is_assigned);
  }
  return [];
}

// Helper simulasi validasi input form LHP
function validateCreateLhpInput(input: Partial<CreateLhpInput>): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!input.nomor_lhp || !input.nomor_lhp.trim()) {
    errors.nomor_lhp = "Nomor LHP wajib diisi";
  }
  if (!input.simpeg_unit_kerja_id) {
    errors.simpeg_unit_kerja_id = "Unit kerja sasaran wajib dipilih";
  }
  if (!input.jenis_pemeriksaan_id) {
    errors.jenis_pemeriksaan_id = "Jenis pemeriksaan wajib dipilih";
  }
  if (!input.tanggal_lhp) {
    errors.tanggal_lhp = "Tanggal terbit LHP wajib diisi";
  }
  if (!input.tanggal_diterima_lhp) {
    errors.tanggal_diterima_lhp = "Tanggal LHP diterima wajib diisi";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Helper simulasi validasi berkas LHP PDF
function validateLhpUploadFile(file: { name: string; size: number; type: string }): {
  isValid: boolean;
  error?: string;
} {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return {
      isValid: false,
      error: "Hanya berkas format PDF yang diperbolehkan.",
    };
  }

  const maxSizeBytes = 20 * 1024 * 1024; // 20 MB
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: "Ukuran berkas PDF melebihi batas maksimum 20 MB.",
    };
  }

  return { isValid: true };
}

// Data dummy uji unit kerja SIMPEG
const mockSimpegUnits: SimpegUnitKerjaItem[] = [
  {
    id: "unit-1",
    unit_kerja: "Dinas Pendidikan dan Kebudayaan",
    instansi_id: "instansi-1",
    is_assigned: true,
    mapping_id: "map-1",
    assigned_irban: { id: "irban-1", kode: "IRBAN_I", nama: "Irban Wilayah I" },
  },
  {
    id: "unit-2",
    unit_kerja: "Dinas Kesehatan",
    instansi_id: "instansi-1",
    is_assigned: true,
    mapping_id: "map-2",
    assigned_irban: { id: "irban-2", kode: "IRBAN_II", nama: "Irban Wilayah II" },
  },
  {
    id: "unit-3",
    unit_kerja: "Badan Keuangan dan Aset Daerah",
    instansi_id: "instansi-1",
    is_assigned: false,
    mapping_id: null,
    assigned_irban: null,
  },
];

test("Validasi input formulir pembuatan LHP baru", () => {
  // 1. Data lengkap & valid
  const validResult = validateCreateLhpInput({
    nomor_lhp: "700/01/INSP/2026",
    simpeg_unit_kerja_id: "unit-1",
    jenis_pemeriksaan_id: "jenis-1",
    tanggal_lhp: "2026-03-01",
    tanggal_diterima_lhp: "2026-03-05",
  });
  assert.equal(validResult.isValid, true);
  assert.equal(Object.keys(validResult.errors).length, 0);

  // 2. Data nomor LHP kosong atau hanya whitespace
  const invalidNomor = validateCreateLhpInput({
    nomor_lhp: "   ",
    simpeg_unit_kerja_id: "unit-1",
    jenis_pemeriksaan_id: "jenis-1",
    tanggal_lhp: "2026-03-01",
    tanggal_diterima_lhp: "2026-03-05",
  });
  assert.equal(invalidNomor.isValid, false);
  assert.equal(invalidNomor.errors.nomor_lhp, "Nomor LHP wajib diisi");

  // 3. Tanggal diterima LHP tidak boleh kosong (karena basis hitung mundur SP1/SP2/SP3)
  const invalidTanggal = validateCreateLhpInput({
    nomor_lhp: "700/01/INSP/2026",
    simpeg_unit_kerja_id: "unit-1",
    jenis_pemeriksaan_id: "jenis-1",
    tanggal_lhp: "2026-03-01",
    tanggal_diterima_lhp: "",
  });
  assert.equal(invalidTanggal.isValid, false);
  assert.equal(
    invalidTanggal.errors.tanggal_diterima_lhp,
    "Tanggal LHP diterima wajib diisi",
  );
});

test("Filter Unit Kerja: Form Create LHP hanya menawarkan Unit Kerja valid milik Irban user", () => {
  // Pengguna Admin Irban I (irban_id: 'irban-1')
  const adminIrbanUser: AuthUser = {
    id: "user-irban-1",
    egov_user_id: "asn_irban1",
    nip: "198001012005011001",
    nama: "Admin Irban I",
    role: "ADMIN_IRBAN",
    irban_id: "irban-1",
    is_active: true,
  };

  const irbanEligible = filterEligibleUnitsForUser(mockSimpegUnits, adminIrbanUser);
  assert.equal(irbanEligible.length, 1);
  assert.equal(irbanEligible[0].unit_kerja, "Dinas Pendidikan dan Kebudayaan");
  assert.equal(irbanEligible[0].assigned_irban?.id, "irban-1");

  // Pengguna Super Admin: dapat memilih seluruh OPD yang sudah terpetakan (is_assigned = true)
  const superAdminUser: AuthUser = {
    id: "user-super",
    egov_user_id: "super_admin",
    nip: "197501012000031001",
    nama: "Inspektur Konawe Selatan",
    role: "SUPER_ADMIN",
    irban_id: null,
    is_active: true,
  };

  const superAdminEligible = filterEligibleUnitsForUser(mockSimpegUnits, superAdminUser);
  assert.equal(superAdminEligible.length, 2);
  // Unit 3 yang belum terpetakan tidak boleh muncul
  assert.equal(
    superAdminEligible.some((u) => u.id === "unit-3"),
    false,
  );

  // Pengguna Bupati (read-only): tidak berhak membuat LHP
  const bupatiUser: AuthUser = {
    id: "user-bupati",
    egov_user_id: "bupati",
    nip: "196501011990031001",
    nama: "Bupati Konawe Selatan",
    role: "BUPATI",
    irban_id: null,
    is_active: true,
  };

  const bupatiEligible = filterEligibleUnitsForUser(mockSimpegUnits, bupatiUser);
  assert.equal(bupatiEligible.length, 0);
});

test("Pemisahan tanggal_lhp dan tanggal_diterima_lhp secara semantik dan fungsional", () => {
  const tanggalLhp = "2026-03-01"; // Tanggal SK/naskah LHP terbit
  const tanggalDiterima = "2026-03-10"; // Tanggal diterima OPD via ekspedisi/tanda terima

  // Keduanya tidak boleh saling tertukar fungsinya
  assert.notEqual(tanggalLhp, tanggalDiterima);

  // Hitung selisih hari kalender dari tanggal diterima LHP
  const targetDate = new Date("2026-04-09T00:00:00.000Z");
  const receivedDate = new Date(`${tanggalDiterima}T00:00:00.000Z`);
  const diffDays = Math.floor(
    (targetDate.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Pada hari ke-30 sejak LHP diterima, batas SP1 tercapai
  assert.equal(diffDays, 30);
});

test("Validasi berkas upload LHP PDF terproteksi", () => {
  // Berkas PDF valid 5 MB
  const validPdf = validateLhpUploadFile({
    name: "LHP_Dinas_Pendidikan_2026.pdf",
    size: 5 * 1024 * 1024,
    type: "application/pdf",
  });
  assert.equal(validPdf.isValid, true);

  // Berkas non-PDF ditolak
  const invalidExt = validateLhpUploadFile({
    name: "laporan_keuangan.docx",
    size: 1024 * 1024,
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  assert.equal(invalidExt.isValid, false);
  assert.equal(
    invalidExt.error,
    "Hanya berkas format PDF yang diperbolehkan.",
  );

  // Berkas PDF melebihi 20 MB ditolak
  const oversizePdf = validateLhpUploadFile({
    name: "arsip_lhp_jumbo.pdf",
    size: 25 * 1024 * 1024,
    type: "application/pdf",
  });
  assert.equal(oversizePdf.isValid, false);
  assert.equal(
    oversizePdf.error,
    "Ukuran berkas PDF melebihi batas maksimum 20 MB.",
  );
});

test("Otorisasi penutupan (close) dan pembukaan kembali (reopen) dokumen LHP", () => {
  // LHP berstatus open
  const openLhp = {
    id: "lhp-1",
    is_closed: false,
    closed_at: null,
  };

  // Admin Irban berwenang menandai selesai
  const canCloseAsAdminIrban = !openLhp.is_closed;
  assert.equal(canCloseAsAdminIrban, true);

  // LHP berstatus closed
  const closedLhp = {
    id: "lhp-2",
    is_closed: true,
    closed_at: "2026-03-20T10:00:00.000Z",
  };

  // Hanya Super Admin yang berhak melakukan reopen
  function canReopenLhp(role: string, lhp: typeof closedLhp): boolean {
    return role === "SUPER_ADMIN" && lhp.is_closed;
  }

  assert.equal(canReopenLhp("SUPER_ADMIN", closedLhp), true);
  assert.equal(canReopenLhp("ADMIN_IRBAN", closedLhp), false);
  assert.equal(canReopenLhp("BUPATI", closedLhp), false);

  // Validasi alasan reopen wajib tidak kosong
  function validateReopenReason(reason: string): boolean {
    return !!reason && reason.trim().length > 0;
  }

  assert.equal(validateReopenReason(""), false);
  assert.equal(validateReopenReason("    "), false);
  assert.equal(
    validateReopenReason("Penambahan dokumen tindak lanjut dari OPD"),
    true,
  );
});
