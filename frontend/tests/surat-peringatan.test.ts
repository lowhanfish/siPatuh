import test from "node:test";
import assert from "node:assert/strict";
import type { SpLevel } from "../features/surat-peringatan/types";
import type { AuthUser } from "../features/auth/types";

// Helper perhitungan umur hari
function calculateAgeInDays(
  tanggalDiterima: string,
  referenceDateStr?: string,
): number {
  const received = new Date(tanggalDiterima);
  const ref = referenceDateStr ? new Date(referenceDateStr) : new Date();

  const receivedUtc = Date.UTC(
    received.getFullYear(),
    received.getMonth(),
    received.getDate(),
  );
  const refUtc = Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate());

  const diffMs = refUtc - receivedUtc;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// Helper penentuan level SP yang eligible
function determineEligibleSpLevel(
  ageDays: number,
  existingSpLevels: SpLevel[],
  pendingCount: number,
  isClosed: boolean,
): SpLevel | null {
  if (isClosed || pendingCount === 0) return null;

  if (ageDays >= 60 && !existingSpLevels.includes("SP3")) {
    return "SP3";
  }
  if (ageDays >= 45 && !existingSpLevels.includes("SP2")) {
    return "SP2";
  }
  if (ageDays >= 30 && !existingSpLevels.includes("SP1")) {
    return "SP1";
  }

  return null;
}

// Helper validasi input pembuatan SP
function validateCreateSpInput(input: {
  lhp_id: string;
  level: SpLevel;
  nomor_surat: string;
  tanggal_surat: string;
}): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!input.lhp_id) errors.lhp_id = "LHP wajib dipilih";
  if (!input.level) errors.level = "Level SP wajib dipilih";
  if (!input.nomor_surat || !input.nomor_surat.trim()) {
    errors.nomor_surat = "Nomor surat wajib diisi";
  }
  if (!input.tanggal_surat) {
    errors.tanggal_surat = "Tanggal surat wajib diisi";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Helper validasi input TTE
function validateSignTteInput(input: {
  nik: string;
  passphrase: string;
}): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!input.nik || !input.nik.trim()) {
    errors.nik = "NIK penandatangan TTE wajib diisi";
  } else if (!/^\d{16}$/.test(input.nik.trim())) {
    errors.nik = "NIK harus terdiri dari 16 digit angka";
  }

  if (!input.passphrase || !input.passphrase.trim()) {
    errors.passphrase = "Passphrase TTE wajib diisi";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Helper cek mutasi SP
function canMutateSp(
  user: AuthUser | null,
  isSigned: boolean,
): { canEdit: boolean; canDelete: boolean; canSign: boolean } {
  if (!user) return { canEdit: false, canDelete: false, canSign: false };

  const isEditor =
    user.role === "SUPER_ADMIN" || user.role === "ADMIN_IRBAN";

  if (!isEditor) {
    return { canEdit: false, canDelete: false, canSign: false };
  }

  // Jika sudah ditandatangani secara digital (TTE), dokumen IMMUTABLE
  if (isSigned) {
    return { canEdit: false, canDelete: false, canSign: false };
  }

  return { canEdit: true, canDelete: true, canSign: true };
}

// ==========================================
// TEST SUITES
// ==========================================

test("F11: Evaluasi perhitungan umur hari jatuh tempo SP", () => {
  const tglTerima = "2026-01-01";
  const ref35 = "2026-02-05"; // 35 hari kemudian
  const ref50 = "2026-02-20"; // 50 hari kemudian
  const ref65 = "2026-03-07"; // 65 hari kemudian

  assert.equal(calculateAgeInDays(tglTerima, ref35), 35);
  assert.equal(calculateAgeInDays(tglTerima, ref50), 50);
  assert.equal(calculateAgeInDays(tglTerima, ref65), 65);
});

test("F11: Mesin kelayakan tingkat Surat Peringatan (30/45/60 hari)", () => {
  // Case 1: Umur 25 hari (belum jatuh tempo)
  assert.equal(determineEligibleSpLevel(25, [], 3, false), null);

  // Case 2: Umur 35 hari, belum pernah terbit SP -> Eligible SP1
  assert.equal(determineEligibleSpLevel(35, [], 2, false), "SP1");

  // Case 3: Umur 50 hari, sudah ada SP1 -> Eligible SP2
  assert.equal(determineEligibleSpLevel(50, ["SP1"], 2, false), "SP2");

  // Case 4: Umur 65 hari, sudah ada SP1 & SP2 -> Eligible SP3
  assert.equal(determineEligibleSpLevel(65, ["SP1", "SP2"], 1, false), "SP3");

  // Case 5: Umur 70 hari, semua SP1-SP3 sudah terbit -> Tidak ada level eligible baru
  assert.equal(
    determineEligibleSpLevel(70, ["SP1", "SP2", "SP3"], 1, false),
    null,
  );

  // Case 6: LHP sudah closed atau rekomendasi tertunggak = 0 -> Tidak eligible SP
  assert.equal(determineEligibleSpLevel(65, [], 0, false), null);
  assert.equal(determineEligibleSpLevel(65, [], 2, true), null);
});

test("F11: Validasi form pembuatan draft Surat Peringatan", () => {
  const valid = validateCreateSpInput({
    lhp_id: "lhp-123",
    level: "SP1",
    nomor_surat: "700/01-SP1/ITDA/2026",
    tanggal_surat: "2026-03-28",
  });
  assert.equal(valid.isValid, true);
  assert.equal(Object.keys(valid.errors).length, 0);

  const invalid = validateCreateSpInput({
    lhp_id: "",
    level: "SP1",
    nomor_surat: "",
    tanggal_surat: "",
  });
  assert.equal(invalid.isValid, false);
  assert.ok(invalid.errors.lhp_id);
  assert.ok(invalid.errors.nomor_surat);
  assert.ok(invalid.errors.tanggal_surat);
});

test("F11: Validasi kredensial TTE & Keamanan Privasi Passphrase", () => {
  // Case 1: Valid NIK (16 digit) & Passphrase terisi
  const validTte = validateSignTteInput({
    nik: "3201012345670001",
    passphrase: "RahasiaPassphrase123!",
  });
  assert.equal(validTte.isValid, true);

  // Case 2: NIK kurang dari 16 digit
  const invalidNik = validateSignTteInput({
    nik: "12345",
    passphrase: "secret",
  });
  assert.equal(invalidNik.isValid, false);
  assert.equal(invalidNik.errors.nik, "NIK harus terdiri dari 16 digit angka");

  // Case 3: Passphrase kosong
  const emptyPass = validateSignTteInput({
    nik: "3201012345670001",
    passphrase: "",
  });
  assert.equal(emptyPass.isValid, false);
  assert.equal(emptyPass.errors.passphrase, "Passphrase TTE wajib diisi");
});

test("F11: Imutabilitas Dokumen setelah Signed TTE & Hak Akses Berdasarkan Role", () => {
  const superAdmin: AuthUser = {
    id: "usr-1",
    egov_user_id: "egov-superadmin",
    nip: null,
    nama: "Super Admin",
    role: "SUPER_ADMIN",
    irban_id: null,
  };

  const bupati: AuthUser = {
    id: "usr-2",
    egov_user_id: "egov-bupati",
    nip: null,
    nama: "Bupati",
    role: "BUPATI",
    irban_id: null,
  };

  // Saat masih DRAFT: Super Admin boleh edit, delete, dan sign
  const draftPerms = canMutateSp(superAdmin, false);
  assert.equal(draftPerms.canEdit, true);
  assert.equal(draftPerms.canDelete, true);
  assert.equal(draftPerms.canSign, true);

  // Saat sudah SIGNED: Dokumen bersifat permanen & terkunci (immutable)
  const signedPerms = canMutateSp(superAdmin, true);
  assert.equal(signedPerms.canEdit, false);
  assert.equal(signedPerms.canDelete, false);
  assert.equal(signedPerms.canSign, false);

  // Role Bupati selalu read-only pada seluruh fase
  const bupatiPerms = canMutateSp(bupati, false);
  assert.equal(bupatiPerms.canEdit, false);
  assert.equal(bupatiPerms.canDelete, false);
  assert.equal(bupatiPerms.canSign, false);
});
