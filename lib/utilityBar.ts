import { api } from './api';
import { GISE_WEB_URL } from './appConfig';
import { resolveRemoteImageUrl } from './remoteImage';

export type UtilityBarApp = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  iconUrl: string | null;
  accentColor: string;
  order: number;
};

const ACCENT_FALLBACK = '#2E9B4B';

const FALLBACK_APPS: UtilityBarApp[] = [
  {
    id: 'fallback-kupon',
    title: 'Kupon Kıbrıs',
    subtitle: 'İndirim Kuponları',
    href: 'https://kuponkibris.com',
    iconUrl: `${GISE_WEB_URL}/kupon.png`,
    accentColor: '#2E9B4B',
    order: 10,
  },
  {
    id: 'fallback-bostamasa',
    title: 'Boşta Masa',
    subtitle: 'Restoran Rezervasyonu',
    href: 'https://bostamasa.com',
    iconUrl: `${GISE_WEB_URL}/kupon.png`,
    accentColor: '#E53935',
    order: 20,
  },
  {
    id: 'fallback-kariyer',
    title: 'Kariyer Kıbrıs',
    subtitle: 'İş İlanları',
    href: 'https://kariyerkibris.com',
    iconUrl: `${GISE_WEB_URL}/kariyer.png`,
    accentColor: '#F57C00',
    order: 30,
  },
];

type Localized = string | { tr?: string; en?: string; [k: string]: unknown };

type ApiRow = {
  id?: string;
  name?: Localized;
  title?: Localized;
  subtitle?: Localized;
  href?: string;
  icon?: string | { src?: string; title?: string };
  hoverColor?: string;
  isActive?: boolean;
  order?: number;
};

function pickLocalized(value: Localized | undefined, locale: 'tr' | 'en'): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    const picked =
      (typeof value[locale] === 'string' && value[locale]) ||
      (typeof value.tr === 'string' && value.tr) ||
      (typeof value.en === 'string' && value.en) ||
      '';
    return String(picked).trim();
  }
  return '';
}

function resolveIconUrl(icon: ApiRow['icon']): string | null {
  if (!icon) return null;
  const src = typeof icon === 'string' ? icon : icon.src;
  if (!src?.trim()) return null;
  const trimmed = src.trim();

  // Panel public ikonları web’de (/kupon.png); upload’lar API’de
  if (trimmed.startsWith('/uploads/') || trimmed.includes('/uploads/')) {
    return resolveRemoteImageUrl(trimmed);
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return `${GISE_WEB_URL}${trimmed}`;
  }
  return resolveRemoteImageUrl(trimmed);
}

function mapRow(row: ApiRow, locale: 'tr' | 'en'): UtilityBarApp | null {
  if (!row || row.isActive === false) return null;
  const title =
    pickLocalized(row.title, locale) || pickLocalized(row.name, locale);
  const href = typeof row.href === 'string' ? row.href.trim() : '';
  if (!title || !href) return null;

  return {
    id: row.id || href,
    title,
    subtitle: pickLocalized(row.subtitle, locale),
    href,
    iconUrl: resolveIconUrl(row.icon),
    accentColor:
      (typeof row.hoverColor === 'string' && row.hoverColor.trim()) ||
      ACCENT_FALLBACK,
    order: Number(row.order) || 0,
  };
}

/**
 * Panel utilityBarItems — PracticApp / sadakat kardeş uygulamaları.
 * API boş/hata → hardcoded fallback.
 */
export async function fetchLoyaltyApps(
  locale: 'tr' | 'en' = 'tr',
): Promise<UtilityBarApp[]> {
  try {
    const json = await api.get<{ data?: ApiRow[] }>(
      'utilityBarItems?perPage=100&sort=order&order=ASC',
    );
    const rows = Array.isArray(json?.data) ? json.data : [];
    const mapped = rows
      .map((row) => mapRow(row, locale))
      .filter((item): item is UtilityBarApp => item != null)
      .sort((a, b) => a.order - b.order);
    if (mapped.length) return mapped;
  } catch {
    /* fallback */
  }
  return FALLBACK_APPS.map((app) =>
    locale === 'en'
      ? {
          ...app,
          title:
            app.id === 'fallback-kupon'
              ? 'Coupon Cyprus'
              : app.id === 'fallback-bostamasa'
                ? 'Empty Table'
                : 'Careers in Cyprus',
          subtitle:
            app.id === 'fallback-kupon'
              ? 'Discount Coupons'
              : app.id === 'fallback-bostamasa'
                ? 'Restaurant Reservation'
                : 'Job Listings',
        }
      : app,
  );
}
