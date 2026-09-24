import type { EventItem } from './events';

export type EventDateFilter = 'today' | 'thisweek' | 'thismonth';

export type EventFilterParams = {
  category?: string;
  subcategory?: string;
  city?: string;
  venue?: string;
  date?: EventDateFilter;
  onlyCampaigns?: boolean;
  /** Navbar Ara → etkinlikler arama chip'i */
  q?: string;
};

export const EVENT_DATE_OPTIONS: Array<{
  value: '' | EventDateFilter;
  label: string;
}> = [
  { value: '', label: 'Tümü' },
  { value: 'thismonth', label: 'Bu Ay' },
  { value: 'thisweek', label: 'Bu Hafta' },
  { value: 'today', label: 'Bugün' },
];

export function parseEventFilterParams(
  raw: Record<string, string | string[] | undefined>,
): EventFilterParams {
  const pick = (key: string) => {
    const value = raw[key];
    if (Array.isArray(value)) return value[0];
    return value;
  };

  const date = pick('date');
  const validDate =
    date === 'today' || date === 'thisweek' || date === 'thismonth'
      ? date
      : undefined;

  return {
    category: pick('category') || undefined,
    subcategory: pick('subcategory') || undefined,
    city: pick('city') || undefined,
    venue: pick('venue') || undefined,
    date: validDate,
    onlyCampaigns:
      pick('onlyCampaigns') === 'true' || pick('onlyCampaigns') === '1',
    q: pick('q')?.trim() || undefined,
  };
}

export function buildEventFilterParams(
  filters: EventFilterParams,
): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.category) params.category = filters.category;
  if (filters.subcategory) params.subcategory = filters.subcategory;
  if (filters.city) params.city = filters.city;
  if (filters.venue) params.venue = filters.venue;
  if (filters.date) params.date = filters.date;
  if (filters.onlyCampaigns) params.onlyCampaigns = 'true';
  if (filters.q?.trim()) params.q = filters.q.trim();
  return params;
}

export function pickSearchParam(value?: string | string[]): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function getEventFilterKey(
  raw: Record<string, string | string[] | undefined>,
): string {
  return [
    pickSearchParam(raw.category) ?? '',
    pickSearchParam(raw.subcategory) ?? '',
    pickSearchParam(raw.city) ?? '',
    pickSearchParam(raw.venue) ?? '',
    pickSearchParam(raw.date) ?? '',
    pickSearchParam(raw.onlyCampaigns) ?? '',
    pickSearchParam(raw.q) ?? '',
  ].join('|');
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function getFilterDateRange(
  type: EventDateFilter,
): [Date, Date] | null {
  const now = new Date();
  switch (type) {
    case 'today':
      return [startOfDay(now), endOfDay(now)];
    case 'thisweek': {
      const start = startOfDay(now);
      const day = start.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + mondayOffset);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return [start, endOfDay(end)];
    }
    case 'thismonth': {
      const start = startOfDay(now);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      return [start, endOfDay(end)];
    }
    default:
      return null;
  }
}

export function applyClientEventFilters(
  events: EventItem[],
  filters: EventFilterParams,
): EventItem[] {
  let filtered = events;

  if (filters.subcategory) {
    filtered = filtered.filter((event) =>
      event.subcategories?.includes(filters.subcategory!),
    );
  }

  if (filters.date) {
    const range = getFilterDateRange(filters.date);
    if (range) {
      const [start, end] = range;
      const startMs = start.getTime();
      const endMs = end.getTime();
      filtered = filtered.filter((event) => {
        const ms = new Date(event.startsAt).getTime();
        return !Number.isNaN(ms) && ms >= startMs && ms <= endMs;
      });
    }
  }

  if (filters.onlyCampaigns) {
    filtered = filtered.filter((event) => event.hasSpecialOffer);
  }

  return filtered;
}
