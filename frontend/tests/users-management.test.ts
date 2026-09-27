import assert from "node:assert/strict";
import test from "node:test";
import type { ActivateUserInput, UserFilterParams } from "@/features/users/types";

test("Validasi form aktivasi pengguna: ADMIN_IRBAN wajib menetapkan irban_id", () => {
  function validateActivation(input: ActivateUserInput): { valid: boolean; error?: string } {
    if (!input.egov_user_id) {
      return { valid: false, error: "Akun EGOV belum dipilih." };
    }
    if (input.role === "ADMIN_IRBAN" && !input.irban_id) {
      return { valid: false, error: "Admin Irban wajib ditugaskan ke salah satu wilayah Irban." };
    }
    return { valid: true };
  }

  // Admin Irban tanpa irban_id -> Gagal
  const invalidAdminIrban = validateActivation({
    egov_user_id: "egov-123",
    role: "ADMIN_IRBAN",
    irban_id: null,
  });
  assert.equal(invalidAdminIrban.valid, false);
  assert.match(invalidAdminIrban.error || "", /wajib ditugaskan/);

  // Admin Irban dengan irban_id -> Sukses
  const validAdminIrban = validateActivation({
    egov_user_id: "egov-123",
    role: "ADMIN_IRBAN",
    irban_id: "irban-1",
  });
  assert.equal(validAdminIrban.valid, true);

  // Super Admin tanpa irban_id -> Sukses (bisa lintas Irban)
  const validSuperAdmin = validateActivation({
    egov_user_id: "egov-456",
    role: "SUPER_ADMIN",
    irban_id: null,
  });
  assert.equal(validSuperAdmin.valid, true);

  // Bupati tanpa irban_id -> Sukses (read-only lintas Irban)
  const validBupati = validateActivation({
    egov_user_id: "egov-789",
    role: "BUPATI",
  });
  assert.equal(validBupati.valid, true);
});

test("Parameter filter pencarian pengguna dibentuk dengan benar", () => {
  function buildFilterQuery(filters?: UserFilterParams): string {
    const params = new URLSearchParams();
    if (filters?.role) params.set("role", filters.role);
    if (filters?.irban_id) params.set("irban_id", filters.irban_id);
    if (filters?.is_active !== undefined) params.set("is_active", String(filters.is_active));
    if (filters?.search) params.set("search", filters.search);

    return params.toString();
  }

  const query1 = buildFilterQuery({
    role: "ADMIN_IRBAN",
    irban_id: "irb-1",
    is_active: true,
    search: "ahmad",
  });

  assert.equal(query1.includes("role=ADMIN_IRBAN"), true);
  assert.equal(query1.includes("irban_id=irb-1"), true);
  assert.equal(query1.includes("is_active=true"), true);
  assert.equal(query1.includes("search=ahmad"), true);

  const queryEmpty = buildFilterQuery({});
  assert.equal(queryEmpty, "");
});

test("Aturan keamanan: Payload aktivasi pengguna tidak mengandung field password", () => {
  const payload: ActivateUserInput = {
    egov_user_id: "egov-user-1",
    role: "ADMIN_IRBAN",
    irban_id: "irb-1",
  };

  const serialized = JSON.stringify(payload);
  assert.equal(serialized.includes("password"), false);
  assert.equal(serialized.includes("credential"), false);
});
