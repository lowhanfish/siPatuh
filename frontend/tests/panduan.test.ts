import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { guideRoles, guideSteps } from "@/features/panduan/content";

test("panduan mengikuti alur Login sampai Laporan", () => {
  assert.deepEqual(
    guideSteps.map((step) => step.id),
    ["login", "lhp", "temuan-rekomendasi", "tindak-lanjut", "surat-peringatan", "dashboard", "laporan"],
  );
});

test("setiap langkah punya peran valid dan minimal satu screenshot", () => {
  for (const step of guideSteps) {
    assert.ok(step.roles.length > 0, `${step.id} tanpa peran`);
    for (const role of step.roles) assert.ok(guideRoles[role], `${step.id}: peran ${role} tidak dikenal`);
    assert.ok(step.images.length > 0, `${step.id} tanpa screenshot`);
  }
});

test("Bupati hanya muncul pada langkah yang bisa diaksesnya", () => {
  const bupatiSteps = guideSteps.filter((step) => step.roles.includes("BUPATI")).map((step) => step.id);
  assert.deepEqual(bupatiSteps, ["login", "dashboard", "laporan"]);
});

test("semua screenshot panduan tersedia di public/panduan", () => {
  for (const image of guideSteps.flatMap((step) => step.images)) {
    assert.match(image.src, /^\/panduan\/[\w-]+\.webp$/);
    assert.ok(image.alt.length > 10, `${image.src} tanpa teks alternatif`);
    assert.ok(existsSync(path.join(process.cwd(), "public", image.src)), `${image.src} belum ada`);
  }
});
