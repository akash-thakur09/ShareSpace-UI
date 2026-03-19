// In-memory access token store — never touches localStorage/sessionStorage.
// Exported separately to avoid Fast Refresh issues.
let _accessToken: string | null = null;

export function getStoredAccessToken(): string | null {
  return _accessToken;
}

export function setStoredAccessToken(token: string | null): void {
  _accessToken = token;
}
