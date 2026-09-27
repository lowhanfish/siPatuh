import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { ApiError, apiRequest } from "@/lib/api-client";

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("selalu mengirim cookie credentials pada request API", async () => {
  let receivedInit: RequestInit | undefined;
  globalThis.fetch = async (_input, init) => {
    receivedInit = init;
    return jsonResponse({ success: true, data: { ok: true } });
  };

  const result = await apiRequest<{ data: { ok: boolean } }>("/health");

  assert.equal(receivedInit?.credentials, "include");
  assert.equal(result.data.ok, true);
});

test("401 memicu satu refresh lalu mengulang request awal sekali", async () => {
  let protectedCalls = 0;
  let refreshCalls = 0;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/refresh")) {
      refreshCalls += 1;
      return jsonResponse({ success: true, data: { user: {} } });
    }

    protectedCalls += 1;
    return protectedCalls === 1
      ? jsonResponse({ message: "expired" }, 401)
      : jsonResponse({ success: true, data: { id: "user-1" } });
  };

  const result = await apiRequest<{ data: { id: string } }>("/auth/me");

  assert.equal(result.data.id, "user-1");
  assert.equal(refreshCalls, 1);
  assert.equal(protectedCalls, 2);
});

test("request paralel berbagi satu proses refresh", async () => {
  let protectedCalls = 0;
  let refreshCalls = 0;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/refresh")) {
      refreshCalls += 1;
      await Promise.resolve();
      return jsonResponse({ success: true, data: { user: {} } });
    }

    protectedCalls += 1;
    return protectedCalls <= 2
      ? jsonResponse({ message: "expired" }, 401)
      : jsonResponse({ success: true, data: { id: protectedCalls } });
  };

  await Promise.all([apiRequest("/resource-a"), apiRequest("/resource-b")]);

  assert.equal(refreshCalls, 1);
  assert.equal(protectedCalls, 4);
});

test("refresh gagal tidak menyebabkan retry loop", async () => {
  let protectedCalls = 0;
  let refreshCalls = 0;

  globalThis.fetch = async (input) => {
    if (String(input).endsWith("/auth/refresh")) {
      refreshCalls += 1;
      return jsonResponse({ message: "Sesi berakhir" }, 401);
    }

    protectedCalls += 1;
    return jsonResponse({ message: "Tidak terautentikasi" }, 401);
  };

  await assert.rejects(
    () => apiRequest("/auth/me"),
    (error: unknown) => error instanceof ApiError && error.status === 401,
  );
  assert.equal(refreshCalls, 1);
  assert.equal(protectedCalls, 1);
});

test("request login dapat melewati auto-refresh", async () => {
  let refreshCalls = 0;

  globalThis.fetch = async (input) => {
    if (String(input).endsWith("/auth/refresh")) {
      refreshCalls += 1;
    }
    return jsonResponse({ message: "Kredensial tidak valid" }, 401);
  };

  await assert.rejects(
    () =>
      apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier: "invalid", password: "invalid" }),
        skipAuthRefresh: true,
      }),
    (error: unknown) => error instanceof ApiError && error.status === 401,
  );
  assert.equal(refreshCalls, 0);
});
