const DEFAULT_API_BASE_URL = "http://localhost:3001/api/v1";

function resolvePublicUrl(value: string | undefined, fallback: string) {
  const candidate = value?.trim() || fallback;

  try {
    return new URL(candidate).toString().replace(/\/$/, "");
  } catch {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL harus berupa URL absolut yang valid.",
    );
  }
}

export const publicEnv = Object.freeze({
  apiBaseUrl: resolvePublicUrl(
    process.env.NEXT_PUBLIC_API_BASE_URL,
    DEFAULT_API_BASE_URL,
  ),
});
