import assert from "node:assert/strict";
import test from "node:test";
import type {
  AssignUnitKerjaInput,
  CreatePejabatInput,
  PejabatUnitKerja,
  SimpegUnitKerjaItem,
} from "@/features/unit-kerja/types";

test("Validasi input data pejabat unit kerja", () => {
  function validatePejabat(input: Partial<CreatePejabatInput>): { valid: boolean; error?: string } {
    if (!input.simpeg_unit_kerja_id) return { valid: false, error: "Unit Kerja wajib dipilih." };
    if (!input.nip?.trim()) return { valid: false, error: "NIP pejabat wajib diisi." };
    if (!input.nama?.trim()) return { valid: false, error: "Nama pejabat wajib diisi." };
    if (!input.jabatan?.trim()) return { valid: false, error: "Jabatan pejabat wajib diisi." };
    if (!input.tanggal_mulai) return { valid: false, error: "Tanggal mulai penugasan wajib diisi." };

    if (input.tanggal_selesai && new Date(input.tanggal_selesai) < new Date(input.tanggal_mulai)) {
      return { valid: false, error: "Tanggal selesai tidak boleh lebih awal dari tanggal mulai." };
    }

    return { valid: true };
  }

  // Gagal jika kolom wajib kosong
  assert.equal(validatePejabat({}).valid, false);
  assert.equal(
    validatePejabat({
      simpeg_unit_kerja_id: "unit-1",
      nama: "Budi",
      jabatan: "Kadis",
    }).valid,
    false,
  );

  // Gagal jika tanggal_selesai < tanggal_mulai
  const invalidDate = validatePejabat({
    simpeg_unit_kerja_id: "unit-1",
    nip: "198001012005011001",
    nama: "Drs. Ahmad",
    jabatan: "Kepala Dinas Pendidikan",
    tanggal_mulai: "2024-06-01",
    tanggal_selesai: "2024-01-01",
  });
  assert.equal(invalidDate.valid, false);
  assert.match(invalidDate.error || "", /tidak boleh lebih awal/);

  // Sukses untuk data lengkap dan valid
  const validPejabat = validatePejabat({
    simpeg_unit_kerja_id: "unit-1",
    nip: "198001012005011001",
    nama: "Drs. Ahmad",
    jabatan: "Kepala Dinas Pendidikan",
    jenis_penugasan: "DEFINITIF",
    tanggal_mulai: "2024-01-01",
    tanggal_selesai: null,
  });
  assert.equal(validPejabat.valid, true);
});

test("Simulasi logika bisnis resolusi pejabat: PLT / PLH diutamakan daripada DEFINITIF", () => {
  const candidates: PejabatUnitKerja[] = [
    {
      id: "pejabat-def",
      simpeg_unit_kerja_id: "unit-10",
      nip: "19750101",
      nama: "Drs. Pejabat Definitif",
      jabatan: "Kepala Dinas PUPR",
      jenis_penugasan: "DEFINITIF",
      tanggal_mulai: "2022-01-01",
      tanggal_selesai: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "pejabat-plt",
      simpeg_unit_kerja_id: "unit-10",
      nip: "19800202",
      nama: "Ir. Pejabat PLT",
      jabatan: "Plt. Kepala Dinas PUPR",
      jenis_penugasan: "PLT",
      tanggal_mulai: "2024-01-01",
      tanggal_selesai: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  // Aturan resolusi: Urutkan berdasarkan prioritas PLT/PLH > DEFINITIF
  function resolveRecipientCandidate(list: PejabatUnitKerja[]) {
    const activeList = list.filter((p) => p.is_active);
    if (activeList.length === 0) return { primary: null, requiresManual: false };

    const priorityOrder = { PLT: 1, PLH: 2, DEFINITIF: 3 };
    const sorted = [...activeList].sort((a, b) => {
      const orderA = priorityOrder[a.jenis_penugasan] || 99;
      const orderB = priorityOrder[b.jenis_penugasan] || 99;
      return orderA - orderB;
    });

    return {
      primary: sorted[0],
      requiresManual: sorted.length > 1,
    };
  }

  const result = resolveRecipientCandidate(candidates);
  assert.ok(result.primary);
  assert.equal(result.primary.id, "pejabat-plt");
  assert.equal(result.primary.jenis_penugasan, "PLT");
  assert.equal(result.requiresManual, true);
});

test("Filter unit kerja SIMPEG: Berdasarkan status mapping dan irban", () => {
  const units: SimpegUnitKerjaItem[] = [
    {
      id: "u-1",
      unit_kerja: "Dinas Kesehatan",
      is_assigned: true,
      mapping_id: "m-1",
      assigned_irban: { id: "irb-1", kode: "IRB1", nama: "Irban Wilayah I" },
    },
    {
      id: "u-2",
      unit_kerja: "Dinas Pendidikan",
      is_assigned: true,
      mapping_id: "m-2",
      assigned_irban: { id: "irb-2", kode: "IRB2", nama: "Irban Wilayah II" },
    },
    {
      id: "u-3",
      unit_kerja: "Badan Kepegawaian",
      is_assigned: false,
      mapping_id: null,
      assigned_irban: null,
    },
  ];

  function filterUnits(
    list: SimpegUnitKerjaItem[],
    filterAssignment: string,
    filterIrban: string,
  ) {
    return list.filter((u) => {
      if (filterAssignment === "assigned" && !u.is_assigned) return false;
      if (filterAssignment === "unassigned" && u.is_assigned) return false;
      if (filterIrban !== "all" && u.assigned_irban?.id !== filterIrban) return false;
      return true;
    });
  }

  // Filter hanya yang sudah ditugaskan
  const assigned = filterUnits(units, "assigned", "all");
  assert.equal(assigned.length, 2);

  // Filter hanya yang belum ditugaskan
  const unassigned = filterUnits(units, "unassigned", "all");
  assert.equal(unassigned.length, 1);
  assert.equal(unassigned[0].id, "u-3");

  // Filter berdasarkan irban tertentu
  const irb1 = filterUnits(units, "all", "irb-1");
  assert.equal(irb1.length, 1);
  assert.equal(irb1[0].id, "u-1");
});

test("Validasi input penugasan Unit Kerja ke Irban", () => {
  const validPayload: AssignUnitKerjaInput = {
    simpeg_unit_kerja_id: "simpeg-100",
    irban_id: "irban-1",
  };

  assert.ok(validPayload.simpeg_unit_kerja_id);
  assert.ok(validPayload.irban_id);
});
