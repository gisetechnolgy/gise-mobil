import { Platform } from 'react-native';
import { api } from './api';
import { resolveRemoteImageUrl } from './remoteImage';

/**
 * Panelden yönetilen Gişe sadakat mobil uygulaması.
 * Alanlar: görsel, yazılar, iOS App Store + Android Play Store URL.
 */
export type LoyaltyMobileApp = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  /** Kapak / ikon görseli (panel upload) */
  imageUrl: string | null;
  /** Accent (görsel yokken gradient için, opsiyonel) */
  accentColor: string | null;
  iosStoreUrl: string;
  androidStoreUrl: string;
  order: number;
};

type Localized = string | { tr?: string; en?: string; [k: string]: unknown };

type ApiRow = {
  id?: string;
  isActive?: boolean;
  order?: number;
  title?: Localized;
  subtitle?: Localized;
  category?: Localized;
  name?: Localized;
  image?: string | { src?: string };
  icon?: string | { src?: string };
  accentColor?: string;
  iosStoreUrl?: string;
  androidStoreUrl?: string;
  appStoreUrl?: string;
  playStoreUrl?: string;
};

function pickLocalized(
  value: Localized | undefined,
  locale: 'tr' | 'en',
): string {
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

function resolveMedia(
  media: string | { src?: string } | undefined,
): string | null {
  if (!media) return null;
  const src = typeof media === 'string' ? media : media.src;
  return resolveRemoteImageUrl(src);
}

function mapRow(
  row: ApiRow,
  locale: 'tr' | 'en',
): LoyaltyMobileApp | null {
  if (!row || row.isActive === false) return null;
  const title =
    pickLocalized(row.title, locale) || pickLocalized(row.name, locale);
  const iosStoreUrl = (
    row.iosStoreUrl ||
    row.appStoreUrl ||
    ''
  ).trim();
  const androidStoreUrl = (
    row.androidStoreUrl ||
    row.playStoreUrl ||
    ''
  ).trim();
  if (!title || (!iosStoreUrl && !androidStoreUrl)) return null;

  return {
    id: row.id || title,
    title,
    subtitle: pickLocalized(row.subtitle, locale),
    category: pickLocalized(row.category, locale),
    imageUrl: resolveMedia(row.image) || resolveMedia(row.icon),
    accentColor:
      typeof row.accentColor === 'string' && row.accentColor.trim()
        ? row.accentColor.trim()
        : null,
    iosStoreUrl,
    androidStoreUrl,
    order: Number(row.order) || 0,
  };
}

/** Cihaza göre mağaza linki — iOS → App Store, Android → Play Store */
export function storeUrlForDevice(app: LoyaltyMobileApp): string | null {
  if (Platform.OS === 'ios') {
    return app.iosStoreUrl || app.androidStoreUrl || null;
  }
  return app.androidStoreUrl || app.iosStoreUrl || null;
}

const FALLBACK_HEADING = {
  tr: 'Gişe Sadakat Uygulamaları',
  en: 'Gise Loyalty Apps',
};

export type LoyaltyAppsPage = {
  /** Uygulama listesinin üstündeki başlık — panelden */
  heading: string;
  apps: LoyaltyMobileApp[];
};

/**
 * Panel `loyaltyMobileApps` — Gişe backend.
 * Endpoint hata verirse boş liste (UI loading sonrası boş grid).
 */
export async function fetchLoyaltyMobileApps(
  locale: 'tr' | 'en' = 'tr',
): Promise<LoyaltyMobileApp[]> {
  try {
    const json = await api.get<{ data?: ApiRow[] }>(
      'loyaltyMobileApps?perPage=100&sort=order&order=ASC',
    );
    const rows = Array.isArray(json?.data) ? json.data : [];
    return rows
      .map((row) => mapRow(row, locale))
      .filter((item): item is LoyaltyMobileApp => item != null)
      .sort((a, b) => a.order - b.order);
  } catch {
    return [];
  }
}

/**
 * Sayfa başlığı — panel `loyaltyMobileAppsPage` (id: default).
 */
async function fetchLoyaltyPageHeading(
  locale: 'tr' | 'en',
): Promise<string> {
  try {
    const json = await api.get<{
      data?: Array<{ heading?: Localized; title?: Localized }>;
      heading?: Localized;
      title?: Localized;
    }>('loyaltyMobileAppsPage');

    const row = Array.isArray(json?.data) ? json.data[0] : json;
    const heading =
      pickLocalized(row?.heading, locale) ||
      pickLocalized(row?.title, locale);
    if (heading) return heading;
  } catch {
    /* fallback */
  }
  return locale === 'en' ? FALLBACK_HEADING.en : FALLBACK_HEADING.tr;
}

/** Başlık + uygulama listesi */
export async function fetchLoyaltyAppsPage(
  locale: 'tr' | 'en' = 'tr',
): Promise<LoyaltyAppsPage> {
  const [heading, apps] = await Promise.all([
    fetchLoyaltyPageHeading(locale),
    fetchLoyaltyMobileApps(locale),
  ]);
  return { heading, apps };
}
