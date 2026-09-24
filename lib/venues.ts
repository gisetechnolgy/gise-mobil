import { api } from './api';
import type { EventItem } from './events';
import {
  GiseListResponse,
  mapVenueRecord,
} from './giseMappers';

export type VenueItem = ReturnType<typeof mapVenueRecord>;

let venueMapCache: Map<string, VenueItem> | null = null;

export async function fetchVenues(params?: {
  city?: string;
  category?: string;
}): Promise<VenueItem[]> {
  const qs = new URLSearchParams();
  qs.set('perPage', '500');
  qs.set('sort', 'name');
  qs.set('order', 'asc');
  if (params?.city) qs.set('city', params.city);

  const res = await api.get<GiseListResponse<Record<string, unknown>>>(
    `/venues?${qs.toString()}`,
  );

  let rows = (res.data ?? []).map((row) => mapVenueRecord(row));

  if (params?.category) {
    rows = rows.filter((v) => v.categories.includes(params.category!));
  }

  return rows;
}

export async function fetchFeaturedVenueIds(): Promise<string[]> {
  try {
    const raw = await api.get<{ venues?: string[] }>('/featureds/venues');
    return Array.isArray(raw.venues) ? raw.venues : [];
  } catch {
    return [];
  }
}

export async function fetchVenuesWithFeaturedOrder(): Promise<VenueItem[]> {
  const [venues, featuredIds] = await Promise.all([
    fetchVenues(),
    fetchFeaturedVenueIds(),
  ]);

  if (featuredIds.length === 0) return venues;

  const byId = new Map(venues.map((v) => [v.id, v]));
  const featured: VenueItem[] = [];
  for (const id of featuredIds) {
    const venue = byId.get(id);
    if (venue) featured.push(venue);
  }
  const rest = venues.filter((v) => !featuredIds.includes(v.id));
  return [...featured, ...rest];
}

/** Web getVenueEventCountsDB — upcoming etkinlik sayıları */
export async function fetchVenueEventCounts(): Promise<Record<string, number>> {
  try {
    const counts = await api.get<Record<string, number>>(
      '/events/counts-by-venue',
    );
    if (counts && typeof counts === 'object' && !Array.isArray(counts)) {
      const out: Record<string, number> = {};
      for (const [id, value] of Object.entries(counts)) {
        const n = Number(value);
        if (Number.isFinite(n) && n > 0) out[id] = n;
      }
      return out;
    }
  } catch {
    /* ignore */
  }
  return {};
}

export function attachVenueEventCounts(
  venues: VenueItem[],
  counts: Record<string, number>,
): VenueItem[] {
  return venues.map((venue) => ({
    ...venue,
    eventCount: Number(counts[venue.id]) || venue.eventCount || 0,
  }));
}

/** Etkinlik sayısı çok → az, eşitse A→Z */
export function sortVenuesByEventCount(venues: VenueItem[]): VenueItem[] {
  return [...venues].sort((a, b) => {
    const countDiff = (b.eventCount || 0) - (a.eventCount || 0);
    if (countDiff !== 0) return countDiff;
    return String(a.name || '').localeCompare(String(b.name || ''), 'tr', {
      sensitivity: 'base',
    });
  });
}

/** Mekanlar listesi: sayılar + sıralama (web mekanlar index) */
export async function fetchVenuesForListPage(): Promise<VenueItem[]> {
  const [venues, counts] = await Promise.all([
    fetchVenues(),
    fetchVenueEventCounts(),
  ]);
  return sortVenuesByEventCount(attachVenueEventCounts(venues, counts));
}

/** Ana sayfa: panel sırasıyla en fazla 6 öne çıkan mekan. */
export async function fetchFeaturedVenuesForHome(
  limit = 6,
): Promise<VenueItem[]> {
  const [venues, featuredIds] = await Promise.all([
    fetchVenues(),
    fetchFeaturedVenueIds(),
  ]);
  if (featuredIds.length === 0) return [];

  const byId = new Map(venues.map((v) => [v.id, v]));
  const out: VenueItem[] = [];
  for (const id of featuredIds) {
    if (out.length >= limit) break;
    const venue = byId.get(id);
    if (venue) out.push(venue);
  }
  return out;
}

export async function fetchVenueById(id: string): Promise<VenueItem | null> {
  try {
    const raw = await api.get<Record<string, unknown>>(
      `/venues/${encodeURIComponent(id)}`,
    );
    return mapVenueRecord(raw);
  } catch {
    return null;
  }
}

export async function loadVenueMap(refresh = false): Promise<Map<string, VenueItem>> {
  if (venueMapCache && !refresh) return venueMapCache;
  const venues = await fetchVenues();
  venueMapCache = new Map(venues.map((v) => [v.id, v]));
  return venueMapCache;
}

export function enrichEventWithVenue(
  event: EventItem,
  venueMap: Map<string, VenueItem>,
): EventItem {
  if (!event.venueId) return event;
  const venue = venueMap.get(event.venueId);
  if (!venue) return event;
  return {
    ...event,
    venueName: venue.name,
    venueSlug: venue.slug,
  };
}

export async function enrichEventsWithVenues(
  events: EventItem[],
  refresh = false,
): Promise<EventItem[]> {
  const map = await loadVenueMap(refresh);
  return events.map((e) => enrichEventWithVenue(e, map));
}

export function venueImageCacheKey(venue: {
  id: string;
  logoUrl: string | null;
}): string {
  return venue.logoUrl ?? venue.id;
}

export function clearVenueCache(): void {
  venueMapCache = null;
}
