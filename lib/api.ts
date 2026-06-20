import {
  getToken,
  getRefreshToken,
  setToken,
  setRefreshToken,
  removeTokens,
} from './auth';
import type { RefreshResponse } from './types';

// Default = prod over TLS so a release admin build with no env var still works.
// Local dev sets NEXT_PUBLIC_API_URL=http://localhost:3333/api/v1 in .env.local.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://api.mozey.uz/api/v1';

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/admin/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      removeTokens();
      return null;
    }

    const json = await response.json();
    const data: RefreshResponse = json.data || json;
    setToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    return data.accessToken;
  } catch {
    removeTokens();
    return null;
  }
}

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { skipAuth = false, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((customHeaders as Record<string, string>) || {}),
  };

  if (!skipAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const url = `${API_BASE_URL}${path}`;
  let response = await fetch(url, { headers, ...rest });

  // Handle 401 with token refresh
  if (response.status === 401 && !skipAuth) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await refreshAccessToken();
      isRefreshing = false;

      if (newToken) {
        onTokenRefreshed(newToken);
        headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(url, { headers, ...rest });
      } else {
        // Redirect to login
        if (typeof window !== 'undefined') {
          const locale = window.location.pathname.split('/')[1] || 'ru';
          window.location.href = `/${locale}/login`;
        }
        throw new ApiError(401, 'Session expired');
      }
    } else {
      // Wait for the token to be refreshed
      const newToken = await new Promise<string>((resolve) => {
        subscribeTokenRefresh(resolve);
      });
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, { headers, ...rest });
    }
  }

  if (!response.ok) {
    let errorData: { message?: string | string[]; error?: string } = {};
    try {
      errorData = await response.json();
    } catch {
      // ignore JSON parse errors
    }
    const rawMessage = errorData.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join('; ')
      : rawMessage || response.statusText;
    throw new ApiError(response.status, message, errorData.error);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  const json = await response.json();
  return json.data !== undefined ? json.data : json;
}

export class ApiError extends Error {
  statusCode: number;
  error?: string;

  constructor(statusCode: number, message: string, error?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.error = error;
  }
}

// Upload file directly to presigned URL
export async function uploadToPresignedUrl(
  uploadUrl: string,
  file: File
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to upload file');
  }
}

// Upload file via multipart POST to /admin/upload/direct.
// Server contract: { data: { fileUrl, key } } (or the bare object).
export interface DirectUploadResult {
  fileUrl: string;
  key: string;
}

export async function uploadDirect(file: File): Promise<DirectUploadResult> {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);

  const url = `${API_BASE_URL}/admin/upload/direct`;
  const response = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!response.ok) {
    let errorData: { message?: string | string[] } = {};
    try {
      errorData = await response.json();
    } catch {
      // ignore
    }
    const rawMessage = errorData.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join('; ')
      : rawMessage || `Upload failed (${response.status})`;
    throw new ApiError(response.status, message);
  }

  const json = await response.json();
  const data = (json.data ?? json) as DirectUploadResult;
  return data;
}

// Helper methods
export const api = {
  get: <T>(path: string, options?: FetchOptions) =>
    apiFetch<T>(path, { method: 'GET', ...options }),

  post: <T>(path: string, body?: unknown, options?: FetchOptions) =>
    apiFetch<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  patch: <T>(path: string, body?: unknown, options?: FetchOptions) =>
    apiFetch<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  delete: <T>(path: string, options?: FetchOptions) =>
    apiFetch<T>(path, { method: 'DELETE', ...options }),
};
