import { api } from './api';
import type { EventItem } from './events';
import { GiseListResponse, mapEventRecord, mapVenueRecord } from './giseMappers';
import { enrichEventsWithVenues } from './venues';
import type { VenueItem } from './venues';

export type SearchResults = {
  events: EventItem[];
  venues: VenueItem[];
};

function rankText(text: string, query: string): number {
  const hay = normalizeSearchText(text);
  const needle = normalizeSearchText(query);
  if (!needle || !hay) return 0;
  if (hay === needle) return 100;
  if (hay.startsWith(needle)) return 80;
  if (hay.includes(needle)) return 50;
  const words = needle.split(/\s+/).filter(Boolean);
  if (words.every((w) => hay.includes(w))) return 40;
  return 0;
}

function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toDateSearchText(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const locale = 'tr-TR';
  const day = date.toLocaleDateString(locale, { day: 'numeric' });
  const monthLong = date.toLocaleDateString(locale, { month: 'long' });
  const monthShort = date
    .toLocaleDateString(locale, { month: 'short' })
    .replace('.', '');
  const year = date.toLocaleDateString(locale, { year: 'numeric' });
  const weekday = date.toLocaleDateString(locale, { weekday: 'long' });
  const fullDate = date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return [day, monthLong, monthShort, year, weekday, `${day} ${monthLong}`, fullDate]
    .filter(Boolean)
    .join(' ');
}

function eventSearchText(event: EventItem): string {
  return [
    event.title,
    event.description ?? '',
    event.category ?? '',
    event.categoryLabel ?? '',
    ...(Array.isArray(event.subcategories) ? event.subcategories : []),
    event.venueName ?? '',
    event.city ?? '',
    toDateSearchText(event.startsAt),
    toDateSearchText(event.endsAt),
  ]
    .filter(Boolean)
    .join(' ');
}

function rankEvent(event: EventItem, query: string): number {
  return Math.max(
    rankText(eventSearchText(event), query),
    rankText(event.title, query),
    rankText(event.venueName ?? '', query),
  );
}

function rankVenue(venue: VenueItem, query: string): number {
  return Math.max(
    rankText(venue.name, query),
    rankText(venue.city ?? '', query),
    rankText(venue.address ?? '', query),
  );
}

function sortByRelevance<T>(
  items: T[],
  query: string,
  scoreFn: (item: T, q: string) => number,
): T[] {
  const q = query.trim();
  if (!q) return items;
  return [...items]
    .map((item) => ({ item, score: scoreFn(item, q) }))
    .sort((a, b) => b.score - a.score)
    .map((row) => row.item);
}

export async function searchPlatform(
  query: string,
  options?: { limit?: number; full?: boolean; scope?: 'all' | 'events' | 'venues' },
): Promise<SearchResults> {
  const q = query.trim();
  if (!q) return { events: [], venues: [] };

  const scope = options?.scope ?? 'all';
  const searchEvents = scope === 'all' || scope === 'events';
  const searchVenues = scope === 'all' || scope === 'venues';
  const perPage = options?.full ? 80 : Math.min(options?.limit ?? 8, 80);

  const eventParams = new URLSearchParams({
    q,
    perPage: String(perPage),
    isActive: 'true',
    isVerified: 'true',
    sort: 'startdate',
    order: 'asc',
    status: 'upcoming',
  });

  const venueParams = new URLSearchParams({
    q,
    perPage: String(perPage),
    sort: 'name',
    order: 'asc',
  });

  const [eventRes, venueRes] = await Promise.all([
    searchEvents
      ? api.get<GiseListResponse<Record<string, unknown>>>(
          `/events?${eventParams.toString()}`,
        )
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    searchVenues
      ? api.get<GiseListResponse<Record<string, unknown>>>(
          `/venues?${venueParams.toString()}`,
        )
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  let events = (eventRes.data ?? []).map((row) => mapEventRecord(row));
  if (searchEvents) {
    events = await enrichEventsWithVenues(events);
    events = sortByRelevance(events, q, rankEvent);
  }

  let venues = (venueRes.data ?? []).map((row) => mapVenueRecord(row));
  if (searchVenues) {
    venues = sortByRelevance(venues, q, rankVenue);
  }

  const cap = options?.full ? perPage : (options?.limit ?? 8);

  if (!options?.full) {
    if (searchEvents) {
      events = events.slice(0, cap);
    }
    if (searchVenues) {
      venues = venues.slice(0, cap);
    }
  }

  return { events, venues };
}
