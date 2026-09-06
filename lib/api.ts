import Constants from 'expo-constants';
import { secureStorage } from './secureStorage';
import { Platform } from 'react-native';

function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv;

  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  return extra?.apiUrl?.trim() ?? '';
}

const RAW_BASE_URL = resolveApiBaseUrl();

function normalizeBaseUrl(raw: string): string {
  const trimmed = (raw ?? '').trim().replace(/\/$/, '');
  if (!trimmed) return '';

  if (Platform.OS === 'android') {
    return trimmed
      .replace('http://localhost', 'http://10.0.2.2')
      .replace('http://127.0.0.1', 'http://10.0.2.2');
  }
  return trimmed;
}

export const API_URL = normalizeBaseUrl(RAW_BASE_URL);

export class ApiError extends Error {
  status: number;
  data?: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  retryOnUnauthorized?: boolean;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 25_000;

async function buildHeaders(auth: boolean): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (auth) {
    const accessToken = await secureStorage.getAccessToken();
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    auth = false,
    retryOnUnauthorized = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  if (!API_URL) {
    throw new ApiError(
      0,
      'EXPO_PUBLIC_API_URL tanımlı değil. .env dosyanızı kontrol edin.',
    );
  }

  const url = path.startsWith('http')
    ? path
    : `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const doFetch = async (signal: AbortSignal): Promise<Response> => {
    const headers = await buildHeaders(auth);
    return fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  };

  const fetchWithTimeout = async (): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await doFetch(controller.signal);
    } catch (e) {
      if (controller.signal.aborted) {
        throw new ApiError(
          0,
          'Sunucu yanıt vermedi. Bağlantınızı kontrol edip tekrar deneyin.',
        );
      }
      const msg = e instanceof Error ? e.message : '';
      if (
        msg.includes('Network request failed') ||
        msg.includes('Failed to fetch')
      ) {
        throw new ApiError(
          0,
          'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.',
        );
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  };

  let res = await fetchWithTimeout();

  if (res.status === 401 && auth && retryOnUnauthorized) {
    await secureStorage.clearTokens();
  }

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }

  if (!res.ok) {
    let message: string | undefined;
    if (typeof data === 'object' && data !== null && 'message' in data) {
      const raw = (data as { message: unknown }).message;
      if (typeof raw === 'string') message = raw;
      else if (Array.isArray(raw)) {
        message = raw.filter((m): m is string => typeof m === 'string').join(', ');
      }
    }
    throw new ApiError(
      res.status,
      message || `İstek başarısız (${res.status})`,
      data,
    );
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'GET' }),
  post: <T>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, 'method' | 'body'>,
  ) => apiRequest<T>(path, { ...opts, method: 'POST', body }),
  put: <T>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, 'method' | 'body'>,
  ) => apiRequest<T>(path, { ...opts, method: 'PUT', body }),
  patch: <T>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, 'method' | 'body'>,
  ) => apiRequest<T>(path, { ...opts, method: 'PATCH', body }),
};
