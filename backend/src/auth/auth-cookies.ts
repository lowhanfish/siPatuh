// Prefixed so SIPATUH cookies never collide with other apps served from the
// same host (cookies are scoped by host, not port, e.g. localhost in development).
export const ACCESS_TOKEN_COOKIE = 'sipatuh_access_token';
export const REFRESH_TOKEN_COOKIE = 'sipatuh_refresh_token';
