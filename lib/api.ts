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
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 25_000;
/** 3D init / finalize gibi bankaya dokunan istekler için daha uzun süre. */
export const PAYMENT_TIMEOUT_MS = 40_000;

type UnauthorizedListener = (info: { path: string }) => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

/**
 * Oturum düştüğünde (auth'lu istek 401 aldı) haber almak için.
 * AuthContext bunu dinleyip kullanıcıyı çıkışa/login'e taşır; böylece
 * checkout ortasında token süresi dolduğunda kullanıcı sebebi görür.
 */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

function emitUnauthorized(path: string) {
  for (const l of unauthorizedListeners) {
    try {
      l({ path });
    } catch {
      /* listener hatası isteği etkilemesin */
    }
  }
}

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
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    try {
      return await doFetch(controller.signal);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e ?? '');
      const name = e instanceof Error ? e.name : '';
      const isAbort =
        timedOut ||
        controller.signal.aborted ||
        name === 'AbortError' ||
        msg.includes('aborted') ||
        msg.includes('AbortError');
      if (isAbort) {
        throw new ApiError(
          0,
          'Sunucu yanıt vermedi. Bağlantınızı kontrol edip tekrar deneyin.',
        );
      }
      const isNetwork =
        msg.includes('Network request failed') ||
        msg.includes('Failed to fetch') ||
        msg.includes('fetch failed') ||
        msg.includes('UnknownHostException') ||
        msg.includes('Unable to resolve host') ||
        msg.includes('ENOTFOUND') ||
        msg.includes('ECONNREFUSED') ||
        msg.includes('EAI_AGAIN');
      if (isNetwork) {
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

  const res = await fetchWithTimeout();

  // Auth'lu istek 401 → token geçersiz/süresi dolmuş: tokenı sil, oturumu düşür.
  if (res.status === 401 && auth) {
    await secureStorage.clearTokens();
    emitUnauthorized(path);
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
  delete: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'DELETE' }),
};
