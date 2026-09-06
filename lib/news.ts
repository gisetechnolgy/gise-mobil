import { api } from './api';
import {
  GiseListResponse,
  pickImageSrc,
  pickLocalizedText,
  toIsoDate,
} from './giseMappers';
import { resolveRemoteImageUrl } from './remoteImage';

export type NewsItem = {
  id: string;
  slug?: string;
  title: string;
  subtitle: string;
  content: string;
  date: string | null;
  imageUrl: string | null;
  newsUrl: string;
};

function mapNewsRecord(raw: Record<string, unknown>): NewsItem {
  const id = String(raw.id ?? '');
  const slug = raw.slug != null ? String(raw.slug) : undefined;
  const banner = pickImageSrc(raw.banner);
  return {
    id,
    slug,
    title: pickLocalizedText(raw.title),
    subtitle: pickLocalizedText(raw.subtitle),
    content: pickLocalizedText(raw.content),
    date:
      typeof raw.date === 'string'
        ? raw.date
        : toIsoDate(raw.date) ?? toIsoDate(raw.createdDate),
    imageUrl: banner,
    newsUrl: `https://www.gisekibris.com/haberler/${slug || id}`,
  };
}

export async function fetchNewsList(): Promise<NewsItem[]> {
  const qs = new URLSearchParams();
  qs.set('perPage', '100');
  qs.set('sort', 'date');
  qs.set('order', 'desc');

  const res = await api.get<GiseListResponse<Record<string, unknown>>>(
    `/news?${qs.toString()}`,
  );

  return (res.data ?? []).map((row) => mapNewsRecord(row));
}

export async function fetchNewsById(id: string): Promise<NewsItem | null> {
  try {
    const raw = await api.get<Record<string, unknown>>(
      `/news/${encodeURIComponent(id)}`,
    );
    return mapNewsRecord(raw);
  } catch {
    return null;
  }
}

export function newsImageUrl(item: NewsItem, size = 400): string | null {
  return resolveRemoteImageUrl(item.imageUrl, item.id);
}

export function formatNewsDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    const parts = value.split('-');
    if (parts.length === 3) {
      const manual = new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2]),
      );
      if (!Number.isNaN(manual.getTime())) {
        return new Intl.DateTimeFormat('tr-TR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(manual);
      }
    }
    return value;
  }
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}
