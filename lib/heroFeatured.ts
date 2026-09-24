import { api } from './api';
import {
  fetchEventById,
  fetchGroupEventById,
  isPastEvent,
  type EventItem,
} from './events';
import { pickImageSrc } from './giseMappers';
import {
  fetchEventActivePriceInfo,
  getActivePriceInfoFromEvent,
  type ActivePriceInfo,
} from './startingPrice';
import { resolveRemoteImageUrl } from './remoteImage';

export type HeroFeaturedEvent = EventItem & {
  featuredImageUrl?: string | null;
  priceInfo?: ActivePriceInfo | null;
  isGroup?: boolean;
};

export type HeroHomeData = {
  bannerUrl: string | null;
  events: HeroFeaturedEvent[];
};

type HeroEntry = {
  id?: string;
  eventId?: string;
  groupid?: string;
  featuredImage?: unknown;
};

function normalizeHeroEntries(raw: Record<string, unknown>): HeroEntry[] {
  if (Array.isArray(raw.specialEvents) && raw.specialEvents.length) {
    return raw.specialEvents.filter(
      (row): row is HeroEntry => row != null && typeof row === 'object',
    );
  }

  const manual = raw.events;
  if (!manual || typeof manual !== 'object') return [];

  return Object.keys(manual as Record<string, unknown>)
    .filter((key) => /^event\d+$/.test(key))
    .sort(
      (a, b) =>
        Number(a.replace('event', '')) - Number(b.replace('event', '')),
    )
    .map((key) => (manual as Record<string, HeroEntry>)[key])
    .filter((entry) => entry && typeof entry === 'object');
}

function bannerFromHero(raw: Record<string, unknown>): string | null {
  const src = pickImageSrc(raw.banner) ?? pickImageSrc(raw.image);
  return resolveRemoteImageUrl(src);
}

/**
 * Web buildHeroFeaturedEvents / resolveHeroEntry ile aynı sıra:
 * groupid varsa grup, yoksa tekil event. Slot düşürme yok (id dedupe yok).
 */
async function resolveHeroEntry(
  entry: HeroEntry,
): Promise<HeroFeaturedEvent | null> {
  if (!entry || typeof entry !== 'object') return null;

  const eventId = entry.eventId ?? entry.id;
  const groupId =
    typeof entry.groupid === 'string' && entry.groupid.trim()
      ? entry.groupid.trim()
      : '';

  try {
    let event: EventItem | null = null;
    let isGroup = false;

    if (groupId) {
      event = await fetchGroupEventById(groupId);
      isGroup = !!event;
    } else if (eventId) {
      event = await fetchEventById(String(eventId));
    }

    if (!event) return null;
    if (isPastEvent(event)) return null;
    // Mobil ana sayfa / search: sadece mobil gizleme
    if (event.hideFromMobileHome) return null;

    const featuredImageUrl = pickImageSrc(entry.featuredImage);
    let priceInfo: ActivePriceInfo | null = null;
    try {
      priceInfo =
        getActivePriceInfoFromEvent(event) ??
        (await fetchEventActivePriceInfo(event.id, {
          commissionFee: event.commissionFee,
          isCommissionExtra: event.isCommissionExtra,
        }));
    } catch {
      priceInfo = null;
    }

    return {
      ...event,
      isGroup,
      featuredImageUrl,
      imageUrl: featuredImageUrl || event.imageUrl,
      priceInfo,
    };
  } catch {
    return null;
  }
}

let cached: HeroHomeData | null = null;

export async function fetchHeroFeatured(
  options?: { refresh?: boolean },
): Promise<HeroHomeData> {
  if (cached && !options?.refresh) return cached;

  try {
    const raw = await api.get<Record<string, unknown>>('/heros/home');
    const entries = normalizeHeroEntries(raw ?? {});
    const resolved = await Promise.all(entries.map(resolveHeroEntry));
    // CMS sırası korunur — aynı id tekrar etse bile slotlar düşmez
    const events = resolved.filter((e): e is HeroFeaturedEvent => e != null);
    cached = {
      bannerUrl: bannerFromHero(raw ?? {}),
      events,
    };
    return cached;
  } catch {
    return cached ?? { bannerUrl: null, events: [] };
  }
}

export function clearHeroFeaturedCache(): void {
  cached = null;
}
