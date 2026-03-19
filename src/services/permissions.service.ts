import { getStoredAccessToken } from '../contexts/auth-token';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export type PermissionRole = 'owner' | 'editor' | 'viewer';

export interface DocumentPermission {
  userId: string;
  email: string;
  name?: string;
  role: PermissionRole;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getStoredAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const permissionsService = {
  list(documentId: string) {
    return apiFetch<DocumentPermission[]>(`/documents/${documentId}/permissions`);
  },
  add(documentId: string, email: string, role: PermissionRole) {
    return apiFetch<DocumentPermission>(`/documents/${documentId}/permissions`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
  },
  updateRole(documentId: string, userId: string, role: PermissionRole) {
    return apiFetch<DocumentPermission>(`/documents/${documentId}/permissions/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },
  remove(documentId: string, userId: string) {
    return apiFetch<void>(`/documents/${documentId}/permissions/${userId}`, {
      method: 'DELETE',
    });
  },
};
