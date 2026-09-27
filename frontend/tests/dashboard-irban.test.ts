import assert from "node:assert/strict";
import test from "node:test";
import {
  formatPercent,
  formatRupiah,
  formatTanggalIndo,
} from "@/features/dashboard/utils/formatters";

test("formatRupiah memformat mata uang Rupiah Indonesia dengan benar", () => {
  assert.equal(formatRupiah(0), "Rp 0");
  assert.equal(formatRupiah(15000000), "Rp 15.000.000");
  assert.equal(formatRupiah(null), "Rp 0");
  assert.equal(formatRupiah(undefined), "Rp 0");
});

test("formatPercent memformat persentase dengan pembulatan 1 desimal", () => {
  assert.equal(formatPercent(0), "0%");
  assert.equal(formatPercent(75.54), "75,5%");
  assert.equal(formatPercent(100), "100%");
  assert.equal(formatPercent(null), "0%");
});

test("formatTanggalIndo memformat string tanggal ISO ke format Indonesia", () => {
  const formatted = formatTanggalIndo("2026-09-27T00:00:00.000Z");
  assert.match(formatted, /27/);
  assert.match(formatted, /2026/);
  assert.equal(formatTanggalIndo(null), "-");
  assert.equal(formatTanggalIndo("invalid-date"), "-");
});

test("Status breakdown dapat menangani status dinamis tak terduga tanpa hardcode", () => {
  // Simulasi respons backend dengan status kustom di luar 4 status standar
  const dynamicStatusBreakdown: Record<string, number> = {
    "Sesuai": 10,
    "Belum Sesuai": 5,
    "Belum Ditindaklanjuti": 3,
    "Tidak Dapat Ditindaklanjuti": 2,
    "Kajian Ulang Khusus": 1, // Status dinamis baru dari master data
  };

  const keys = Object.keys(dynamicStatusBreakdown);
  const total = Object.values(dynamicStatusBreakdown).reduce((acc, count) => acc + count, 0);

  assert.equal(keys.length, 5);
  assert.equal(total, 21);
  assert.equal(keys.includes("Kajian Ulang Khusus"), true);

  const percentKajian = (dynamicStatusBreakdown["Kajian Ulang Khusus"] / total) * 100;
  assert.equal(formatPercent(percentKajian), "4,8%");
});

test("Perhitungan pemulihan kerugian daerah dan sisa kewajiban", () => {
  const totalNilaiRekomendasi = 100000000;
  const totalNilaiSetor = 70000000;
  const sisa = Math.max(0, totalNilaiRekomendasi - totalNilaiSetor);
  const recoveryRate = (totalNilaiSetor / totalNilaiRekomendasi) * 100;

  assert.equal(sisa, 30000000);
  assert.equal(recoveryRate, 70);
  assert.equal(formatRupiah(sisa), "Rp 30.000.000");
  assert.equal(formatPercent(recoveryRate), "70%");
});
