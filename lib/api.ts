export type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
};

export type ResourceRecord = {
  id: number;
  idResource: number;
  idUser: number;
  source: string;
  balance: number;
};

export type TransactionRecord = {
  idTransaction?: number;
  idUser?: number;
  idCategory?: number | null;
  idResource?: number | null;
  type: 'income' | 'expense';
  amount: number;
  description?: string | null;
  date?: string;
  source?: string | null;
  category?: {
    idCategory?: number;
    name?: string;
  } | null;
};

const AUTH_STORAGE_KEY = 'finansialin_auth_tokens';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000/api';

export type ApiRequestOptions = RequestInit & {
  authToken?: string | null;
};

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getStoredAuthTokens(): AuthTokens | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthTokens;
  } catch {
    return null;
  }
}

export function setStoredAuthTokens(tokens: AuthTokens) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(tokens));
}

export function clearStoredAuthTokens() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  const token = options.authToken ?? getStoredAuthTokens()?.accessToken;

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Dev logging to help debug 401/422 issues
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    // don't log token value, just presence
    // eslint-disable-next-line no-console
    console.debug('[apiRequest] ', path, { hasToken: !!token });
  }

  const hasFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!hasFormData && options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    // If unauthorized, clear local tokens to prevent repeated 401s from stale tokens
    if (response.status === 401 && typeof window !== 'undefined') {
      clearStoredAuthTokens();
      try {
        // notify app that session is unauthorized so UI can react (toast / redirect)
        window.dispatchEvent(new CustomEvent('finansialin:unauthorized'));
      } catch (e) {
        // ignore
      }
      // eslint-disable-next-line no-console
      console.warn('[apiRequest] unauthorized (401) — cleared stored tokens');
    }

    const message =
      typeof payload === 'string'
        ? payload
        : (payload as { message?: string; error?: string })?.message ??
          (payload as { message?: string; error?: string })?.error ??
          `Request failed with status ${response.status}`;

    const err = new Error(message) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  return payload as T;
}
