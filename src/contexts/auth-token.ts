// Access token store persisted in localStorage to survive page refreshes.
// Exported separately to avoid Fast Refresh issues.
let _accessToken: string | null = null;

export function getStoredAccessToken(): string | null {
  if (!_accessToken) {
    try {
      _accessToken = localStorage.getItem('sharespace_access_token');
    } catch {
      _accessToken = null;
    }
  }
  return _accessToken;
}

export function setStoredAccessToken(token: string | null): void {
  _accessToken = token;
  try {
    if (token) {
      localStorage.setItem('sharespace_access_token', token);
    } else {
      localStorage.removeItem('sharespace_access_token');
    }
  } catch {
    // Ignore storage errors in sandbox/restricted environments
  }
}

