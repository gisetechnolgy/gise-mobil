import { getAppLocale, getIntlLocale } from './appLocale';
import { api } from './api';
import {
  GiseListResponse,
  mapEventRecord,
} from './giseMappers';
import { enrichEventsWithVenues } from './venues';
import { resolveRemoteImageUrl } from './remoteImage';
import {
  applyClientEventFilters,
  type EventFilterParams,
} from './eventFilters';

export type EventItem = ReturnType<typeof mapEventRecord>;

async function fetchEventsPage(
  params: Record<string, string>,
  options?: { auth?: boolean },
) {
  const qs = new URLSearchParams(params);
  const res = await api.get<GiseListResponse<Record<string, unknown>>>(
    `/events?${qs.toString()}`,
    { auth: options?.auth === true },
  );
  return {
    items: (res.data ?? []).map((row) => mapEventRecord(row)),
    total: res.total ?? 0,
    page: res.page ?? 1,
    perPage: res.perPage ?? 25,
  };
}

function buildEventListParams(
  filters: {
    venueId?: string;
    category?: string;
    city?: string;
    organisationCompanyId?: string;
    page?: number;
    perPage?: number;
    forAdmin?: boolean;
  } | undefined,
  status: 'upcoming' | 'past',
): Record<string, string> {
  const page = filters?.page ?? 1;
  const perPage = filters?.perPage ?? 50;
  const params: Record<string, string> = {
    page: String(page),
    perPage: String(perPage),
    status,
    sort: 'startdate',
    order: status === 'past' ? 'desc' : 'asc',
  };

  if (!filters?.forAdmin) {
    params.isActive = 'true';
    params.isVerified = 'true';
  }

  if (filters?.venueId) params.venue = filters.venueId;
  if (filters?.category) params.category = filters.category;
  if (filters?.city) params.city = filters.city;
  if (filters?.organisationCompanyId) {
    params.organisationCompanies = filters.organisationCompanyId;
  }

  return params;
}

export type ManagerEventScope = {
  venueId?: string;
  organisationCompanyId?: string;
};

export function managerScopeFromUser(input: {
  isOrganisationCompanyManager?: boolean;
  isVenueManager?: boolean;
  rid?: string | null;
}): ManagerEventScope {
  if (input.isOrganisationCompanyManager && input.rid) {
    return { organisationCompanyId: input.rid };
  }
  if (input.isVenueManager && input.rid) {
    return { venueId: input.rid };
  }
  return {};
}

export async function fetchPastEvents(
  filters?: {
    venueId?: string;
    category?: string;
    city?: string;
    organisationCompanyId?: string;
    page?: number;
    perPage?: number;
    forAdmin?: boolean;
  },
  options?: { refresh?: boolean; clientFilters?: EventFilterParams },
): Promise<{ items: EventItem[]; page: number; hasMore: boolean }> {
  const page = filters?.page ?? 1;
  const perPage = filters?.perPage ?? 50;
  const params = buildEventListParams(filters, 'past');

  const { items, total } = await fetchEventsPage(params, {
    auth: filters?.forAdmin === true,
  });
  const enriched = await enrichEventsWithVenues(
    items,
    options?.refresh === true,
  );
  const clientFiltered = options?.clientFilters
    ? applyClientEventFilters(enriched, options.clientFilters)
    : enriched;
  const hasMore = page * perPage < total;
  return { items: clientFiltered, page, hasMore };
}

export async function fetchUpcomingEvents(
  filters?: {
    venueId?: string;
    category?: string;
    city?: string;
    organisationCompanyId?: string;
    page?: number;
    perPage?: number;
    forAdmin?: boolean;
  },
  options?: { refresh?: boolean; clientFilters?: EventFilterParams },
): Promise<{ items: EventItem[]; page: number; hasMore: boolean }> {
  const page = filters?.page ?? 1;
  const perPage = filters?.perPage ?? 50;
  const params = buildEventListParams(filters, 'upcoming');

  const { items, total } = await fetchEventsPage(params, {
    auth: filters?.forAdmin === true,
  });
  const enriched = await enrichEventsWithVenues(
    items,
    options?.refresh === true,
  );
  const clientFiltered = options?.clientFilters
    ? applyClientEventFilters(enriched, options.clientFilters)
    : enriched;
  const hasMore = page * perPage < total;
  return { items: clientFiltered, page, hasMore };
}

export function isEventWithinPastMonths(
  event: { startsAt?: string | null; endsAt?: string | null },
  months = 1,
): boolean {
  if (!isPastEvent(event)) return false;
  const endIso = event.endsAt ?? event.startsAt;
  if (!endIso) return false;
  const end = new Date(endIso);
  if (Number.isNaN(end.getTime())) return false;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return end.getTime() >= cutoff.getTime();
}

export async function fetchAdminEventsList(
  filters?: {
    venueId?: string;
    category?: string;
    city?: string;
    organisationCompanyId?: string;
    page?: number;
    perPage?: number;
    forAdmin?: boolean;
  },
  options?: {
    includePast?: boolean;
    pastMonths?: number;
    refresh?: boolean;
    clientFilters?: EventFilterParams;
  },
): Promise<{ items: EventItem[]; page: number; hasMore: boolean }> {
  const upcomingRes = await fetchUpcomingEvents(filters, {
    refresh: options?.refresh,
    clientFilters: options?.clientFilters,
  });

  if (!options?.includePast) {
    return upcomingRes;
  }

  const pastRes = await fetchPastEvents(filters, {
    refresh: options?.refresh,
    clientFilters: options?.clientFilters,
  });

  const months = options.pastMonths ?? 1;
  const upcomingIds = new Set(upcomingRes.items.map((event) => event.id));
  const recentPast = pastRes.items.filter(
    (event) =>
      isEventWithinPastMonths(event, months) && !upcomingIds.has(event.id),
  );

  return {
    items: [...recentPast, ...upcomingRes.items],
    page: upcomingRes.page,
    hasMore: upcomingRes.hasMore || pastRes.hasMore,
  };
}

export async function fetchEventsForVenue(
  venueId: string,
  options?: { status?: 'upcoming' | 'past'; perPage?: number },
): Promise<EventItem[]> {
  const params: Record<string, string> = {
    page: '1',
    perPage: String(options?.perPage ?? 50),
    isActive: 'true',
    isVerified: 'true',
    venue: venueId,
    sort: 'startdate',
    order: options?.status === 'past' ? 'desc' : 'asc',
  };
  if (options?.status) params.status = options.status;

  const { items } = await fetchEventsPage(params);
  return enrichEventsWithVenues(items);
}

export async function fetchEventsForOrganisationCompany(
  organisationCompanyId: string,
  options?: { status?: 'upcoming' | 'past'; perPage?: number },
): Promise<EventItem[]> {
  const params: Record<string, string> = {
    page: '1',
    perPage: String(options?.perPage ?? 50),
    isActive: 'true',
    isVerified: 'true',
    organisationCompanies: organisationCompanyId,
    sort: 'startdate',
    order: options?.status === 'past' ? 'desc' : 'asc',
  };
  if (options?.status) params.status = options.status;

  const { items } = await fetchEventsPage(params);
  return enrichEventsWithVenues(items);
}

export async function fetchEventById(id: string): Promise<EventItem> {
  const raw = await api.get<Record<string, unknown>>(
    `/events/${encodeURIComponent(id)}`,
  );
  const event = mapEventRecord(raw);
  const [enriched] = await enrichEventsWithVenues([event]);
  return enriched ?? event;
}

export function resolveEventImageUrl(
  imageUrl: string | null | undefined,
  cacheKey?: string | null,
): string | null {
  return resolveRemoteImageUrl(imageUrl, cacheKey);
}

export function eventImageCacheKey(event: {
  id: string;
  imageUrl: string | null;
}): string {
  return event.imageUrl ?? event.id;
}

export function htmlToPlainText(input?: string | null): string {
  if (!input) return '';
  return input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h\d>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&uuml;/g, 'ü')
    .replace(/&ouml;/g, 'ö')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&Uuml;/g, 'Ü')
    .replace(/&Ouml;/g, 'Ö')
    .replace(/&Ccedil;/g, 'Ç')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function formatEventDate(dateIso: string): string {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(getIntlLocale(getAppLocale()), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatEventDay(dateIso?: string | null): string {
  if (!dateIso) return '';
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(getIntlLocale(getAppLocale()), { day: 'numeric' }).format(date);
}

export function formatEventMonthShort(dateIso?: string | null): string {
  if (!dateIso) return '';
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(getIntlLocale(getAppLocale()), { month: 'short' })
    .format(date)
    .replace('.', '');
}

export function formatEventDateLong(dateIso?: string | null): string {
  if (!dateIso) return '';
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(getIntlLocale(getAppLocale()), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatEventTime(dateIso?: string | null): string {
  if (!dateIso) return '';
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(getIntlLocale(getAppLocale()), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function isPastEvent(event: {
  startsAt?: string | null;
  endsAt?: string | null;
}): boolean {
  const endIso = event.endsAt ?? event.startsAt;
  if (!endIso) return false;
  const end = new Date(endIso);
  if (Number.isNaN(end.getTime())) return false;
  return end.getTime() < Date.now();
}
