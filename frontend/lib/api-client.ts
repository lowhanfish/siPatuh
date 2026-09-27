import { publicEnv } from "@/lib/env";

type ApiErrorPayload = {
  error?: string;
  message?: string | string[];
  statusCode?: number;
  timestamp?: string;
};

type ApiRequestOptions = RequestInit & {
  skipAuthRefresh?: boolean;
};

export class ApiError extends Error {
  readonly payload: ApiErrorPayload | null;
  readonly status: number;

  constructor(status: number, message: string, payload: ApiErrorPayload | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

let refreshPromise: Promise<boolean> | null = null;

function buildApiUrl(path: string) {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("Path API harus berupa path internal yang diawali '/'.");
  }

  return `${publicEnv.apiBaseUrl}${path}`;
}

function buildHeaders(init: RequestInit) {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

async function parseError(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  let payload: ApiErrorPayload | null = null;

  if (contentType.includes("application/json")) {
    payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
  }

  const rawMessage = payload?.message;
  const message = Array.isArray(rawMessage)
    ? rawMessage.join(" ")
    : rawMessage || payload?.error || response.statusText || "Permintaan gagal";

  return new ApiError(response.status, message, payload);
}

async function parseSuccess<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ApiError(
      response.status,
      "Respons server tidak menggunakan format JSON yang diharapkan.",
      null,
    );
  }

  return (await response.json()) as T;
}

async function performRefresh() {
  if (!refreshPromise) {
    refreshPromise = fetch(buildApiUrl("/auth/refresh"), {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { skipAuthRefresh = false, ...init } = options;
  const requestInit: RequestInit = {
    ...init,
    credentials: "include",
    headers: buildHeaders(init),
  };
  const url = buildApiUrl(path);

  let response = await fetch(url, requestInit);

  if (response.status === 401 && !skipAuthRefresh) {
    const refreshed = await performRefresh();
    if (refreshed) {
      response = await fetch(url, requestInit);
    }
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  return parseSuccess<T>(response);
}

export function getApiErrorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : "Terjadi gangguan saat menghubungi server.";
}
