import assert from "node:assert/strict";
import test from "node:test";
import {
  canRoleAccessPath,
  getDefaultRouteForRole,
  getNavigationForRole,
} from "@/features/navigation/config/navigation";

test("Bupati hanya melihat Dashboard Pimpinan dan Laporan", () => {
  assert.deepEqual(
    getNavigationForRole("BUPATI").map((item) => item.href),
    ["/dashboard/pimpinan", "/laporan"],
  );
});

test("Admin Irban tidak melihat menu khusus Super Admin atau Bupati", () => {
  const hrefs = getNavigationForRole("ADMIN_IRBAN").map((item) => item.href);

  assert.equal(hrefs.includes("/pengguna"), false);
  assert.equal(hrefs.includes("/master-data"), false);
  assert.equal(hrefs.includes("/dashboard/pimpinan"), false);
  assert.equal(hrefs.includes("/dashboard/irban"), true);
  assert.equal(hrefs.includes("/lhp"), true);
});

test("route guard memilih aturan paling spesifik", () => {
  assert.equal(canRoleAccessPath("BUPATI", "/dashboard"), true);
  assert.equal(canRoleAccessPath("BUPATI", "/dashboard/pimpinan"), true);
  assert.equal(canRoleAccessPath("BUPATI", "/dashboard/irban"), false);
  assert.equal(canRoleAccessPath("BUPATI", "/lhp/record-1"), false);
  assert.equal(canRoleAccessPath("ADMIN_IRBAN", "/lhp/record-1"), true);
});

test("default dashboard mengikuti jenis pengguna", () => {
  assert.equal(getDefaultRouteForRole("ADMIN_IRBAN"), "/dashboard/irban");
  assert.equal(getDefaultRouteForRole("SUPER_ADMIN"), "/dashboard/pimpinan");
  assert.equal(getDefaultRouteForRole("BUPATI"), "/dashboard/pimpinan");
});
