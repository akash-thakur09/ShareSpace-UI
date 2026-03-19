import { getStoredAccessToken } from '../contexts/auth-token';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export type AiAction = 'improve' | 'summarize' | 'grammar' | 'custom';

export interface AiChatRequest {
  action: AiAction;
  content: string;
  prompt?: string;
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

export const aiService = {
  chat: (req: AiChatRequest) =>
    apiFetch<{ reply: string }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
};
