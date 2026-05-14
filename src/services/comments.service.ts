import { getStoredAccessToken } from '../contexts/auth-token';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export interface DocumentCommentDto {
  id: string;
  userId: string;
  email: string;
  name?: string;
  content: string;
  createdAt: string | Date;
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
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const commentsService = {
  list: (documentId: string) =>
    apiFetch<DocumentCommentDto[]>(`/documents/${documentId}/comments`),

  add: (documentId: string, content: string) =>
    apiFetch<DocumentCommentDto>(`/documents/${documentId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  remove: (documentId: string, commentId: string) =>
    apiFetch<void>(`/documents/${documentId}/comments/${commentId}`, {
      method: 'DELETE',
    }),
};
