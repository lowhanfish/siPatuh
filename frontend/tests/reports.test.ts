import test from "node:test";
import assert from "node:assert/strict";
import type {
  OpdReportSummaryItem,
  ReportFilterParams,
} from "../features/reports/types";

// Helper simulasi pembuatan query string filter laporan
function buildReportQueryString(params?: ReportFilterParams): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  if (params.tahun) sp.set("tahun", params.tahun);
  if (params.irban_id) sp.set("irban_id", params.irban_id);
  if (params.simpeg_unit_kerja_id)
    sp.set("simpeg_unit_kerja_id", params.simpeg_unit_kerja_id);
  if (params.jenis_pemeriksaan_id)
    sp.set("jenis_pemeriksaan_id", params.jenis_pemeriksaan_id);
  if (params.status_rekomendasi_id)
    sp.set("status_rekomendasi_id", params.status_rekomendasi_id);

  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

// Helper kalkulasi metrik laporan
function calculateReportMetrics(
  totalRekom: number,
  selesaiRekom: number,
  nilaiRekom: number,
  nilaiSetor: number,
): {
  persentaseSelesai: number;
  sisaKewajiban: number;
  persentasePemulihan: number;
} {
  const persentaseSelesai =
    totalRekom > 0 ? (selesaiRekom / totalRekom) * 100 : 0;
  const sisaKewajiban = Math.max(0, nilaiRekom - nilaiSetor);
  const persentasePemulihan =
    nilaiRekom > 0 ? (nilaiSetor / nilaiRekom) * 100 : 0;

  return {
    persentaseSelesai,
    sisaKewajiban,
    persentasePemulihan,
  };
}

// Helper filter dan sort OPD matriks
function filterAndSortOpdMatrix(
  items: OpdReportSummaryItem[],
  query: string,
  sortField: keyof OpdReportSummaryItem,
  sortAsc: boolean,
): OpdReportSummaryItem[] {
  let result = [...items];
  if (query.trim()) {
    const q = query.toLowerCase();
    result = result.filter(
      (i) =>
        i.nama_opd.toLowerCase().includes(q) ||
        i.irban_nama.toLowerCase().includes(q),
    );
  }

  result.sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
    if (typeof valA === "string" && typeof valB === "string") {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortAsc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
  });

  return result;
}

// ==========================================
// TEST SUITES
// ==========================================

test("F12: Pembentukan query string filter laporan multivariat", () => {
  const params: ReportFilterParams = {
    tahun: "2026",
    irban_id: "irban-1-id",
    simpeg_unit_kerja_id: "opd-dinkes",
    jenis_pemeriksaan_id: "jenis-reguler",
    status_rekomendasi_id: "status-selesai",
  };

  const qs = buildReportQueryString(params);
  assert.ok(qs.includes("tahun=2026"));
  assert.ok(qs.includes("irban_id=irban-1-id"));
  assert.ok(qs.includes("simpeg_unit_kerja_id=opd-dinkes"));
  assert.ok(qs.includes("jenis_pemeriksaan_id=jenis-reguler"));
  assert.ok(qs.includes("status_rekomendasi_id=status-selesai"));

  // Empty params
  assert.equal(buildReportQueryString({}), "");
});

test("F12: Kalkulasi metrik agregat laporan (Penyelesaian & Pemulihan Kas)", () => {
  const { persentaseSelesai, sisaKewajiban, persentasePemulihan } =
    calculateReportMetrics(
      10, // total rekomendasi
      8, // selesai
      100000000, // nilai rekomendasi 100 juta
      75000000, // disetor 75 juta
    );

  assert.equal(persentaseSelesai, 80);
  assert.equal(sisaKewajiban, 25000000);
  assert.equal(persentasePemulihan, 75);
});

test("F12: Sorting dan pencarian pada matriks perangkat daerah (OPD)", () => {
  const dummyItems: OpdReportSummaryItem[] = [
    {
      simpeg_unit_kerja_id: "opd-1",
      nama_opd: "Dinas Kesehatan",
      irban_nama: "Irban Wilayah I",
      total_lhp: 4,
      total_temuan: 8,
      total_rekomendasi: 12,
      selesai: 6,
      belum_selesai: 6,
      persen_selesai: 50.0,
      nilai_rekomendasi: 50000000,
      nilai_setor: 25000000,
      sisa_rekomendasi: 25000000,
    },
    {
      simpeg_unit_kerja_id: "opd-2",
      nama_opd: "Dinas Pendidikan",
      irban_nama: "Irban Wilayah II",
      total_lhp: 5,
      total_temuan: 10,
      total_rekomendasi: 20,
      selesai: 18,
      belum_selesai: 2,
      persen_selesai: 90.0,
      nilai_rekomendasi: 100000000,
      nilai_setor: 90000000,
      sisa_rekomendasi: 10000000,
    },
  ];

  // Search by name
  const filtered = filterAndSortOpdMatrix(
    dummyItems,
    "Kesehatan",
    "persen_selesai",
    false,
  );
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].nama_opd, "Dinas Kesehatan");

  // Sort descending by persen_selesai (default)
  const sortedDesc = filterAndSortOpdMatrix(
    dummyItems,
    "",
    "persen_selesai",
    false,
  );
  assert.equal(sortedDesc[0].nama_opd, "Dinas Pendidikan"); // 90% > 50%

  // Sort ascending by persen_selesai
  const sortedAsc = filterAndSortOpdMatrix(
    dummyItems,
    "",
    "persen_selesai",
    true,
  );
  assert.equal(sortedAsc[0].nama_opd, "Dinas Kesehatan"); // 50% < 90%
});
