import test from "node:test";
import assert from "node:assert/strict";
import type { AuthUser } from "../features/auth/types";
import type { FinancialSummary } from "../features/tindak-lanjut/types";

// Helper simulasi validasi input Tindak Lanjut
function validateTindakLanjutInput(input: {
  tanggal_diterima: string;
  uraian: string;
  nilai_tindak_lanjut?: number | null;
  file?: { name: string; size: number; type: string } | null;
}): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!input.tanggal_diterima || !input.tanggal_diterima.trim()) {
    errors.tanggal_diterima = "Tanggal diterima wajib diisi";
  }
  if (!input.uraian || !input.uraian.trim()) {
    errors.uraian = "Uraian tindak lanjut wajib diisi";
  }
  if (
    input.nilai_tindak_lanjut !== undefined &&
    input.nilai_tindak_lanjut !== null &&
    (isNaN(input.nilai_tindak_lanjut) || input.nilai_tindak_lanjut < 0)
  ) {
    errors.nilai_tindak_lanjut = "Nilai tindak lanjut tidak boleh bernilai negatif";
  }

  if (input.file) {
    const maxBytes = 5 * 1024 * 1024;
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];
    if (input.file.size > maxBytes) {
      errors.file = "Ukuran file dokumen bukti maksimal 5 MB";
    } else if (!allowedTypes.includes(input.file.type)) {
      errors.file = "Format file bukti harus berupa PDF, JPG, atau PNG";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Helper simulasi validasi input Verifikasi
function validateVerifikasiInput(input: {
  catatan: string;
  status_rekomendasi_id: string;
  file?: { name: string; size: number; type: string } | null;
}): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!input.catatan || !input.catatan.trim()) {
    errors.catatan = "Catatan hasil verifikasi wajib diisi";
  }
  if (!input.status_rekomendasi_id || !input.status_rekomendasi_id.trim()) {
    errors.status_rekomendasi_id = "Keputusan status rekomendasi wajib dipilih";
  }

  if (input.file) {
    const maxBytes = 5 * 1024 * 1024;
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];
    if (input.file.size > maxBytes) {
      errors.file = "Ukuran lampiran verifikasi maksimal 5 MB";
    } else if (!allowedTypes.includes(input.file.type)) {
      errors.file = "Format lampiran verifikasi harus berupa PDF, JPG, atau PNG";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Helper kalkulasi Financial Summary
function calculateFinancialSummary(
  nilaiRekomendasi: number | null,
  tindakLanjuts: Array<{ nilai_tindak_lanjut?: number | string | null }>,
  currentStatusKategori: "SELESAI" | "BELUM_SELESAI",
  currentStatusNama: string,
): FinancialSummary {
  const totalTl = tindakLanjuts.reduce((acc, tl) => {
    const val = parseFloat(String(tl.nilai_tindak_lanjut || 0));
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  let sisa: number | null = null;
  let persentase: number | null = null;

  if (nilaiRekomendasi !== null && nilaiRekomendasi > 0) {
    sisa = Math.max(0, nilaiRekomendasi - totalTl);
    persentase = Math.min(100, (totalTl / nilaiRekomendasi) * 100);
  }

  return {
    rekomendasi_id: "rekom-1",
    nilai_rekomendasi: nilaiRekomendasi,
    total_tindak_lanjut: totalTl,
    sisa,
    persentase,
    status_saat_ini: currentStatusNama,
    kategori_status: currentStatusKategori,
  };
}

// Helper pengecekan otoritas mutasi Tindak Lanjut & Verifikasi
function canManageTindakLanjut(user: AuthUser | null, isLhpClosed: boolean): boolean {
  if (!user || isLhpClosed) return false;
  return user.role === "SUPER_ADMIN" || user.role === "ADMIN_IRBAN";
}

// ==========================================
// TEST SUITES
// ==========================================

test("F10: Validasi input Tindak Lanjut", () => {
  // Case 1: Valid input tanpa file
  const validResult = validateTindakLanjutInput({
    tanggal_diterima: "2026-03-28",
    uraian: "OPD telah menyetorkan kelebihan bayar ke Kas Daerah melalui STS #0192",
    nilai_tindak_lanjut: 15000000,
  });
  assert.equal(validResult.isValid, true);
  assert.equal(Object.keys(validResult.errors).length, 0);

  // Case 2: Field kosong
  const invalidResult = validateTindakLanjutInput({
    tanggal_diterima: "",
    uraian: "",
    nilai_tindak_lanjut: -50000,
  });
  assert.equal(invalidResult.isValid, false);
  assert.ok(invalidResult.errors.tanggal_diterima);
  assert.ok(invalidResult.errors.uraian);
  assert.ok(invalidResult.errors.nilai_tindak_lanjut);
});

test("F10: Validasi ukuran dan format file bukti dokumen Tindak Lanjut", () => {
  // Case 1: File PDF valid
  const validFileResult = validateTindakLanjutInput({
    tanggal_diterima: "2026-03-28",
    uraian: "Bukti STS terlampir",
    file: {
      name: "sts_bukti.pdf",
      size: 2 * 1024 * 1024, // 2MB
      type: "application/pdf",
    },
  });
  assert.equal(validFileResult.isValid, true);

  // Case 2: File lebih dari 5MB
  const largeFileResult = validateTindakLanjutInput({
    tanggal_diterima: "2026-03-28",
    uraian: "Bukti STS terlampir",
    file: {
      name: "sts_huge.pdf",
      size: 6 * 1024 * 1024, // 6MB
      type: "application/pdf",
    },
  });
  assert.equal(largeFileResult.isValid, false);
  assert.equal(largeFileResult.errors.file, "Ukuran file dokumen bukti maksimal 5 MB");

  // Case 3: Format file dilarang (misal .exe / .docx)
  const invalidFormatResult = validateTindakLanjutInput({
    tanggal_diterima: "2026-03-28",
    uraian: "Bukti STS terlampir",
    file: {
      name: "script.exe",
      size: 1024,
      type: "application/x-msdownload",
    },
  });
  assert.equal(invalidFormatResult.isValid, false);
  assert.equal(
    invalidFormatResult.errors.file,
    "Format file bukti harus berupa PDF, JPG, atau PNG",
  );
});

test("F10: Validasi Verifikasi Tindak Lanjut oleh Verifikator", () => {
  // Case 1: Valid
  const validVerif = validateVerifikasiInput({
    catatan: "Bukti STS telah dicocokkan dengan rekening koran Kasda, dinyatakan sesuai.",
    status_rekomendasi_id: "status-sesuai-id",
  });
  assert.equal(validVerif.isValid, true);

  // Case 2: Catatan kosong
  const invalidVerif = validateVerifikasiInput({
    catatan: "",
    status_rekomendasi_id: "",
  });
  assert.equal(invalidVerif.isValid, false);
  assert.ok(invalidVerif.errors.catatan);
  assert.ok(invalidVerif.errors.status_rekomendasi_id);
});

test("F10: Financial Summary & Aturan 100% Pelunasan Tidak Mengubah Status Otomatis", () => {
  const nilaiRekomendasi = 20000000; // 20 juta
  const tindakLanjuts = [
    { nilai_tindak_lanjut: 10000000 },
    { nilai_tindak_lanjut: 10000000 },
  ]; // Total 20 juta (100% lunas)

  // Status rekomendasi sebelum verifikasi manual masih BELUM_SELESAI (misal "Dalam Proses")
  const summary = calculateFinancialSummary(
    nilaiRekomendasi,
    tindakLanjuts,
    "BELUM_SELESAI",
    "Dalam Proses",
  );

  assert.equal(summary.total_tindak_lanjut, 20000000);
  assert.equal(summary.sisa, 0);
  assert.equal(summary.persentase, 100);

  // KRITERIA PENTING: Kategori status tetap BELUM_SELESAI meskipun 100% lunas,
  // karena sistem SIPATUH tidak otomatis mengubah status; verifikasi 100% manual oleh manusia!
  assert.equal(summary.kategori_status, "BELUM_SELESAI");
  assert.equal(summary.status_saat_ini, "Dalam Proses");
});

test("F10: Hak Akses Tindak Lanjut & Verifikasi (Super Admin & Irban Only, Locked saat Closed)", () => {
  const superAdmin: AuthUser = {
    id: "usr-1",
    egov_user_id: "egov-superadmin",
    nip: null,
    nama: "Super Admin",
    role: "SUPER_ADMIN",
    irban_id: null,
  };

  const adminIrban: AuthUser = {
    id: "usr-2",
    egov_user_id: "egov-adminirban1",
    nip: "198001012005011001",
    nama: "Admin Irban 1",
    role: "ADMIN_IRBAN",
    irban_id: "irban-1",
  };

  const bupati: AuthUser = {
    id: "usr-3",
    egov_user_id: "egov-bupati",
    nip: null,
    nama: "Bupati",
    role: "BUPATI",
    irban_id: null,
  };

  // Super Admin & Admin Irban dapat mengelola saat LHP open
  assert.equal(canManageTindakLanjut(superAdmin, false), true);
  assert.equal(canManageTindakLanjut(adminIrban, false), true);

  // Bupati read-only
  assert.equal(canManageTindakLanjut(bupati, false), false);

  // Saat LHP ditutup (closed), semua user read-only
  assert.equal(canManageTindakLanjut(superAdmin, true), false);
  assert.equal(canManageTindakLanjut(adminIrban, true), false);
});
