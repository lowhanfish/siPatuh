import assert from "node:assert/strict";
import test from "node:test";
import { getSafeRedirect } from "@/features/auth/lib/safe-redirect";

test("menerima path internal beserta query dan hash", () => {
  assert.equal(
    getSafeRedirect("/laporan?tahun=2026#ringkasan"),
    "/laporan?tahun=2026#ringkasan",
  );
});

test("menolak URL eksternal, protocol-relative, dan backslash", () => {
  assert.equal(getSafeRedirect("https://evil.example"), "/");
  assert.equal(getSafeRedirect("//evil.example/path"), "/");
  assert.equal(getSafeRedirect("/\\evil.example/path"), "/");
});

test("mencegah redirect berulang ke halaman login", () => {
  assert.equal(getSafeRedirect("/login"), "/");
});
