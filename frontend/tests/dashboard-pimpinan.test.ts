import test from "node:test";
import assert from "node:assert/strict";
import type { AuthUser } from "../features/auth/types";
import type {
  IrbanProgressItem,
  TopOpdOutstandingItem,
} from "../features/dashboard/types";

// Helper pengecekan otoritas akses ke Dashboard Pimpinan
function canAccessPimpinanDashboard(user: AuthUser | null): boolean {
  if (!user) return false;
  return user.role === "SUPER_ADMIN" || user.role === "BUPATI";
}

// Helper pengurutan Top 5 OPD Tertunggak
function getTop5OutstandingOpd(
  opds: Array<{
    simpeg_unit_kerja_id: string;
    nama_opd: string;
    total_rekomendasi: number;
    selesai: number;
    belum_selesai: number;
    nilai_rekomendasi: number;
  }>,
): TopOpdOutstandingItem[] {
  const sorted = [...opds].sort((a, b) => b.belum_selesai - a.belum_selesai);
  return sorted.slice(0, 5).map((o) => ({
    ...o,
    persen_selesai:
      o.total_rekomendasi > 0
        ? Math.round((o.selesai / o.total_rekomendasi) * 10000) / 100
        : 0,
  }));
}

// Helper kalkulasi komparasi antar-Irban
function calculateIrbanComparison(
  irbans: Array<{
    irban_id: string;
    irban_nama: string;
    total_lhp: number;
    total_rekomendasi: number;
    selesai: number;
    belum_selesai: number;
    nilai_rekomendasi: number;
    nilai_setor: number;
  }>,
): IrbanProgressItem[] {
  return irbans.map((i) => ({
    ...i,
    persen_selesai:
      i.total_rekomendasi > 0
        ? Math.round((i.selesai / i.total_rekomendasi) * 10000) / 100
        : 0,
    sisa_rekomendasi: Math.max(0, i.nilai_rekomendasi - i.nilai_setor),
  }));
}

// ==========================================
// TEST SUITES
// ==========================================

test("F13: Hak akses Dashboard Pimpinan (Bupati & Super Admin Only)", () => {
  const bupati: AuthUser = {
    id: "usr-bupati",
    egov_user_id: "egov-bupati",
    nip: null,
    nama: "Bupati",
    role: "BUPATI",
    irban_id: null,
  };

  const superAdmin: AuthUser = {
    id: "usr-admin",
    egov_user_id: "egov-superadmin",
    nip: null,
    nama: "Super Admin",
    role: "SUPER_ADMIN",
    irban_id: null,
  };

  const adminIrban: AuthUser = {
    id: "usr-irban",
    egov_user_id: "egov-adminirban",
    nip: "198001012005011001",
    nama: "Admin Irban",
    role: "ADMIN_IRBAN",
    irban_id: "irban-1",
  };

  // Bupati dan Super Admin boleh mengakses
  assert.equal(canAccessPimpinanDashboard(bupati), true);
  assert.equal(canAccessPimpinanDashboard(superAdmin), true);

  // Admin Irban dilarang mengakses dashboard pimpinan (hanya dashboard irban)
  assert.equal(canAccessPimpinanDashboard(adminIrban), false);
  assert.equal(canAccessPimpinanDashboard(null), false);
});

test("F13: Perangkingan Top 5 OPD dengan rekomendasi tertunggak terbanyak", () => {
  const dummyOpds = [
    {
      simpeg_unit_kerja_id: "opd-1",
      nama_opd: "Dinas Bina Marga",
      total_rekomendasi: 20,
      selesai: 5,
      belum_selesai: 15,
      nilai_rekomendasi: 150000000,
    },
    {
      simpeg_unit_kerja_id: "opd-2",
      nama_opd: "Dinas Pendidikan",
      total_rekomendasi: 40,
      selesai: 32,
      belum_selesai: 8,
      nilai_rekomendasi: 40000000,
    },
    {
      simpeg_unit_kerja_id: "opd-3",
      nama_opd: "Dinas Kesehatan",
      total_rekomendasi: 30,
      selesai: 10,
      belum_selesai: 20,
      nilai_rekomendasi: 200000000,
    },
    {
      simpeg_unit_kerja_id: "opd-4",
      nama_opd: "Badan Pengelola Keuangan",
      total_rekomendasi: 10,
      selesai: 8,
      belum_selesai: 2,
      nilai_rekomendasi: 10000000,
    },
    {
      simpeg_unit_kerja_id: "opd-5",
      nama_opd: "Dinas Perhubungan",
      total_rekomendasi: 15,
      selesai: 10,
      belum_selesai: 5,
      nilai_rekomendasi: 30000000,
    },
    {
      simpeg_unit_kerja_id: "opd-6",
      nama_opd: "Dinas Sosial",
      total_rekomendasi: 12,
      selesai: 11,
      belum_selesai: 1,
      nilai_rekomendasi: 5000000,
    },
  ];

  const top5 = getTop5OutstandingOpd(dummyOpds);

  // Harus tepat 5 item
  assert.equal(top5.length, 5);

  // Ranking 1 adalah Dinas Kesehatan (20 belum selesai)
  assert.equal(top5[0].nama_opd, "Dinas Kesehatan");
  assert.equal(top5[0].belum_selesai, 20);

  // Ranking 2 adalah Dinas Bina Marga (15 belum selesai)
  assert.equal(top5[1].nama_opd, "Dinas Bina Marga");
  assert.equal(top5[1].belum_selesai, 15);

  // Periksa kalkulasi persentase selesai
  assert.equal(top5[0].persen_selesai, 33.33); // 10/30 = 33.33%
});

test("F13: Perhitungan komparasi progres kinerja antar-Irban", () => {
  const dummyIrbans = [
    {
      irban_id: "irb-1",
      irban_nama: "Irban Wilayah I",
      total_lhp: 10,
      total_rekomendasi: 50,
      selesai: 40,
      belum_selesai: 10,
      nilai_rekomendasi: 100000000,
      nilai_setor: 80000000,
    },
    {
      irban_id: "irb-2",
      irban_nama: "Irban Wilayah II",
      total_lhp: 8,
      total_rekomendasi: 30,
      selesai: 15,
      belum_selesai: 15,
      nilai_rekomendasi: 50000000,
      nilai_setor: 20000000,
    },
  ];

  const result = calculateIrbanComparison(dummyIrbans);

  // Irban 1: 40/50 = 80%, sisa 20 juta
  assert.equal(result[0].persen_selesai, 80);
  assert.equal(result[0].sisa_rekomendasi, 20000000);

  // Irban 2: 15/30 = 50%, sisa 30 juta
  assert.equal(result[1].persen_selesai, 50);
  assert.equal(result[1].sisa_rekomendasi, 30000000);
});
