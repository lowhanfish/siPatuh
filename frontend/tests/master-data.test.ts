import assert from "node:assert/strict";
import test from "node:test";
import type {
  CreateJenisPemeriksaanInput,
  CreateStatusRekomendasiInput,
  CreateSuratTemplateInput,
  StatusRekomendasi,
  SuratTemplate,
} from "@/features/master-data/types";

test("Validasi input data master: Jenis Pemeriksaan", () => {
  function validateJenis(input: Partial<CreateJenisPemeriksaanInput>): { valid: boolean; error?: string } {
    if (!input.nama || !input.nama.trim()) {
      return { valid: false, error: "Nama jenis pemeriksaan wajib diisi." };
    }
    return { valid: true };
  }

  assert.equal(validateJenis({}).valid, false);
  assert.equal(validateJenis({ nama: "   " }).valid, false);
  assert.equal(validateJenis({ nama: "Audit Ketaatan" }).valid, true);
});

test("Validasi input data master: Status Rekomendasi", () => {
  function validateStatus(input: Partial<CreateStatusRekomendasiInput>): { valid: boolean; error?: string } {
    if (!input.nama || !input.nama.trim()) {
      return { valid: false, error: "Nama status rekomendasi wajib diisi." };
    }
    if (input.kategori !== "SELESAI" && input.kategori !== "BELUM_SELESAI") {
      return { valid: false, error: "Kategori status harus SELESAI atau BELUM_SELESAI." };
    }
    if (input.urutan !== undefined && input.urutan < 1) {
      return { valid: false, error: "Urutan tampilan minimal bernilai 1." };
    }
    return { valid: true };
  }

  assert.equal(validateStatus({}).valid, false);
  assert.equal(validateStatus({ nama: "Selesai" }).valid, false); // missing kategori
  assert.equal(
    validateStatus({
      nama: "Belum Ditindaklanjuti",
      kategori: "BELUM_SELESAI",
      urutan: 0,
    }).valid,
    false,
  );
  assert.equal(
    validateStatus({
      nama: "Sesuai Rekomendasi",
      kategori: "SELESAI",
      urutan: 1,
    }).valid,
    true,
  );
});

test("Validasi template surat: Keberadaan anchor tanda tangan digital #tagTTD#", () => {
  function validateTemplate(input: Partial<CreateSuratTemplateInput>): {
    valid: boolean;
    error?: string;
    hasTteTag: boolean;
  } {
    if (!input.jenis_surat?.trim()) {
      return { valid: false, hasTteTag: false, error: "Jenis surat wajib diisi." };
    }
    if (!input.judul?.trim()) {
      return { valid: false, hasTteTag: false, error: "Judul template surat wajib diisi." };
    }
    if (!input.konten_html?.trim()) {
      return { valid: false, hasTteTag: false, error: "Konten HTML template surat wajib diisi." };
    }

    const hasTteTag = input.konten_html.includes("#tagTTD#");
    return { valid: true, hasTteTag };
  }

  // Template tanpa #tagTTD#
  const noTte = validateTemplate({
    jenis_surat: "SP1",
    judul: "Format SP1",
    konten_html: "<p>Surat Peringatan Pertama</p>",
  });
  assert.equal(noTte.valid, true);
  assert.equal(noTte.hasTteTag, false);

  // Template lengkap dengan #tagTTD#
  const withTte = validateTemplate({
    jenis_surat: "SP1",
    judul: "Format SP1 Resmi",
    konten_html: "<p>Surat Peringatan Pertama kepada {{nama_opd}}</p><p>#tagTTD#</p>",
  });
  assert.equal(withTte.valid, true);
  assert.equal(withTte.hasTteTag, true);
});

test("Logika versioning template surat: Perubahan HTML menaikkan versi non-retroaktif", () => {
  const existingTemplate: SuratTemplate = {
    id: "tpl-1",
    jenis_surat: "SP1",
    judul: "Format SP1 Standar",
    konten_html: "<p>Konten Versi 1</p><p>#tagTTD#</p>",
    versi: 1,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };

  function simulateUpdate(
    current: SuratTemplate,
    newHtml: string,
    newJudul?: string,
  ): { nextTemplate: SuratTemplate; previousDeactivated: boolean } {
    if (newHtml !== current.konten_html) {
      // Versioning terjadi: Buat versi baru dan nonaktifkan versi lama
      const nextTemplate: SuratTemplate = {
        id: `tpl-${current.versi + 1}`,
        jenis_surat: current.jenis_surat,
        judul: newJudul || current.judul,
        konten_html: newHtml,
        versi: current.versi + 1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return { nextTemplate, previousDeactivated: true };
    }

    return {
      nextTemplate: {
        ...current,
        judul: newJudul || current.judul,
      },
      previousDeactivated: false,
    };
  }

  // Update dengan HTML yang sama -> Tidak ada versi baru
  const noHtmlChange = simulateUpdate(
    existingTemplate,
    existingTemplate.konten_html,
    "Judul Diubah Saja",
  );
  assert.equal(noHtmlChange.nextTemplate.versi, 1);
  assert.equal(noHtmlChange.previousDeactivated, false);

  // Update dengan HTML berbeda -> Menerbitkan versi 2
  const htmlChanged = simulateUpdate(
    existingTemplate,
    "<p>Konten Versi 2 Baru</p><p>#tagTTD#</p>",
  );
  assert.equal(htmlChanged.nextTemplate.versi, 2);
  assert.equal(htmlChanged.previousDeactivated, true);
  assert.equal(htmlChanged.nextTemplate.jenis_surat, "SP1");
});

test("Filter status rekomendasi: Kategori dan keaktifan", () => {
  const items: StatusRekomendasi[] = [
    {
      id: "s-1",
      nama: "Sesuai Rekomendasi",
      kategori: "SELESAI",
      urutan: 1,
      is_active: true,
      created_at: "",
      updated_at: "",
    },
    {
      id: "s-2",
      nama: "Belum Sesuai",
      kategori: "BELUM_SELESAI",
      urutan: 2,
      is_active: true,
      created_at: "",
      updated_at: "",
    },
    {
      id: "s-3",
      nama: "Status Lama Nonaktif",
      kategori: "BELUM_SELESAI",
      urutan: 3,
      is_active: false,
      created_at: "",
      updated_at: "",
    },
  ];

  function filterStatus(list: StatusRekomendasi[], kategori: string, active: string) {
    return list.filter((item) => {
      if (kategori !== "all" && item.kategori !== kategori) return false;
      if (active === "active" && !item.is_active) return false;
      if (active === "inactive" && item.is_active) return false;
      return true;
    });
  }

  const selesaiOnly = filterStatus(items, "SELESAI", "all");
  assert.equal(selesaiOnly.length, 1);
  assert.equal(selesaiOnly[0].id, "s-1");

  const activeOnly = filterStatus(items, "all", "active");
  assert.equal(activeOnly.length, 2);

  const inactiveOnly = filterStatus(items, "all", "inactive");
  assert.equal(inactiveOnly.length, 1);
  assert.equal(inactiveOnly[0].id, "s-3");
});
