// API client — wraps fetch with automatic JWT injection.
//
// Every call reads the current Supabase session and attaches the
// access_token as a Bearer header. Features don't think about auth —
// they just call `apiFetch('/api/products')`.
//
// In dev, Vite's proxy routes `/api/*` to localhost:3001 so we don't
// need CORS locally. In prod, VITE_API_URL points to the API domain.

import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: Record<string, unknown>,
  ) {
    const code = (body.error as string) ?? 'UNKNOWN';
    super(`API ${status}: ${code}`);
    this.name = 'ApiError';
  }

  get code(): string {
    return (this.body.error as string) ?? 'UNKNOWN';
  }
}

interface FetchOptions extends Omit<RequestInit, 'body'> {
  json?: unknown;
}

export async function apiFetch<T = unknown>(
  path: string,
  options?: FetchOptions,
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { json, ...fetchOptions } = options ?? {};

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
    ...fetchOptions.headers,
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
    ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'UNKNOWN' }));
    throw new ApiError(response.status, body as Record<string, unknown>);
  }

  // 204 No Content — DELETE responses.
  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}
