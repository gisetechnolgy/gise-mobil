import { API_URL } from './api';

/**
 * Uzak görsel URL'si — DB'de /uploads/... tutulur, EXPO_PUBLIC_API_URL ile birleşir.
 * Eski full URL içindeki /uploads/ parçası da güncel API host'a bağlanır.
 */
export function resolveRemoteImageUrl(
  path: string | null | undefined,
  cacheKey?: string | null,
): string | null {
  if (!path?.trim()) return null;

  const trimmed = path.trim();
  let url: string;

  if (trimmed.startsWith('data:')) {
    url = trimmed;
  } else if (trimmed.startsWith('//')) {
    url = `https:${trimmed}`;
  } else {
    const uploadsIdx = trimmed.indexOf('/uploads/');
    if (uploadsIdx !== -1 && API_URL) {
      url = `${API_URL}${trimmed.slice(uploadsIdx)}`;
    } else if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://')
    ) {
      url = trimmed;
    } else if (API_URL) {
      url = `${API_URL}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
    } else {
      return null;
    }
  }

  if (!cacheKey || trimmed.startsWith('data:')) return url;

  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}v=${encodeURIComponent(cacheKey)}`;
}
