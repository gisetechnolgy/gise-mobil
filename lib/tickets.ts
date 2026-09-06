import { api } from './api';
import {
  GiseListResponse,
  mapTicketRecord,
} from './giseMappers';
import { loadVenueMap } from './venues';

export type TicketItem = ReturnType<typeof mapTicketRecord>;

const MOBILE_CHANNELS = new Set(['w', 'm', 'a']);

async function enrichTicketVenueNames<T extends { venueName: string | null }>(
  items: T[],
): Promise<T[]> {
  const map = await loadVenueMap();
  return items.map((item) => {
    if (!item.venueName) return item;
    const venue = map.get(item.venueName);
    return venue ? { ...item, venueName: venue.name } : item;
  });
}

export async function fetchMyTickets(params?: {
  page?: number;
  limit?: number;
  userId?: string;
}): Promise<{
  items: TicketItem[];
  page: number;
  hasMore: boolean;
}> {
  const page = params?.page ?? 1;
  const perPage = params?.limit ?? 10;
  const qs = new URLSearchParams();
  qs.set('page', String(page));
  qs.set('perPage', String(perPage));
  qs.set('sort', 'created');
  qs.set('order', 'desc');
  if (params?.userId) qs.set('user.id', params.userId);

  const res = await api.get<GiseListResponse<Record<string, unknown>>>(
    `/tickets?${qs.toString()}`,
    { auth: true },
  );

  const items = (res.data ?? [])
    .map((row) => mapTicketRecord(row))
    .filter((t) => !t.channel || MOBILE_CHANNELS.has(t.channel));

  const enriched = await enrichTicketVenueNames(items);

  const total = res.total ?? enriched.length;
  const serverHasMore = page * perPage < total;

  return {
    items: enriched,
    page,
    hasMore: enriched.length === perPage && serverHasMore,
  };
}

export async function fetchTicketByPnr(pnr: string): Promise<TicketItem | null> {
  const trimmed = pnr.trim();
  if (!trimmed) return null;
  const qs = new URLSearchParams();
  qs.set('pnr', trimmed);
  qs.set('perPage', '5');
  qs.set('sort', 'created');
  qs.set('order', 'desc');

  const res = await api.get<GiseListResponse<Record<string, unknown>>>(
    `/tickets?${qs.toString()}`,
    { auth: true },
  );
  const row = res.data?.[0];
  if (!row) return null;
  const ticket = mapTicketRecord(row);
  const [enriched] = await enrichTicketVenueNames([ticket]);
  return enriched ?? ticket;
}

export function formatTicketDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatTicketDateLong(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

export function formatTicketTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

export function ticketQrImageUrl(pnr: string, size = 220): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(pnr)}`;
}
