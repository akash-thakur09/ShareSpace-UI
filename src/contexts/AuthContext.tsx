import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { getStoredAccessToken, setStoredAccessToken } from './auth-token';
import { AuthContext, type AuthUser } from './auth-context-value';

export { AuthContext } from './auth-context-value';
export type { AuthUser } from './auth-context-value';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

type AuthResponse = { accessToken: string; id: string; email: string; name?: string };

async function apiFetch(path: string, options?: RequestInit) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  const token = getStoredAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, error: null });

  // Restore session on mount via refresh token cookie
  useEffect(() => {
    apiFetch('/auth/refresh', { method: 'POST', body: JSON.stringify({}) })
      .then((data: AuthResponse) => {
        setStoredAccessToken(data.accessToken);
        setState({ user: { id: data.id, email: data.email, name: data.name }, loading: false, error: null });
      })
      .catch(() => setState({ user: null, loading: false, error: null }));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState(s => ({ ...s, error: null }));
    const data: AuthResponse = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredAccessToken(data.accessToken);
    setState({ user: { id: data.id, email: data.email, name: data.name }, loading: false, error: null });
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    setState(s => ({ ...s, error: null }));
    const data: AuthResponse = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    setStoredAccessToken(data.accessToken);
    setState({ user: { id: data.id, email: data.email, name: data.name }, loading: false, error: null });
  }, []);

  const logout = useCallback(async () => {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
    setStoredAccessToken(null);
    setState({ user: null, loading: false, error: null });
  }, []);

  const getAccessToken = useCallback(() => getStoredAccessToken(), []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, getAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}
