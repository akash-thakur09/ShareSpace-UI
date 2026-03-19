import { getStoredAccessToken } from '../contexts/auth-token';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export interface Document {
  publicId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface CreateDocumentDto {
  title?: string;
  metadata?: Record<string, any>;
}

function authHeaders(): Record<string, string> {
  const token = getStoredAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const documentService = {
  create: (dto: CreateDocumentDto = {}) =>
    apiFetch<Document>('/documents', { method: 'POST', body: JSON.stringify(dto) }),

  list: () =>
    apiFetch<Document[]>('/documents'),

  get: (publicId: string) =>
    apiFetch<Document>(`/documents/${publicId}`),

  update: (publicId: string, dto: Partial<CreateDocumentDto>) =>
    apiFetch<Document>(`/documents/${publicId}`, { method: 'PUT', body: JSON.stringify(dto) }),

  delete: (publicId: string) =>
    apiFetch<void>(`/documents/${publicId}`, { method: 'DELETE' }),

  createSnapshot: (publicId: string) =>
    apiFetch<{ id: string; version: number; createdAt: string }>(
      `/documents/${publicId}/snapshots`, { method: 'POST' }
    ),

  getSnapshots: (publicId: string) =>
    apiFetch<{ id: string; version: number; createdAt: string; metadata: any }[]>(
      `/documents/${publicId}/snapshots`
    ),

  restoreSnapshot: (publicId: string, snapshotId: string) =>
    apiFetch<Document>(`/documents/${publicId}/snapshots/${snapshotId}/restore`, {
      method: 'POST',
    }),
};
