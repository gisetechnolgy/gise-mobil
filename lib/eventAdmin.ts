import { api } from './api';
import { mapEventRecord, mapTicketRecord } from './giseMappers';
import type { EventItem } from './events';
import type { TicketItem } from './tickets';
import { enrichEventsWithVenues } from './venues';

export type EventAdminRecord = EventItem & {
  isActive: boolean;
  isVerified: boolean;
  isCancelled: boolean;
};

export type EventStatsRecord = {
  totalRevenue: number;
  totalSales: number;
  totalTickets: number;
  totalSeats: number;
  totalRemaining: number;
};

function mapAdminEvent(raw: Record<string, unknown>): EventAdminRecord {
  const base = mapEventRecord(raw);
  return {
    ...base,
    isActive: raw.isActive !== false,
    isVerified: raw.isVerified === true,
    isCancelled: raw.isCancelled === true,
  };
}

export async function fetchEventAdminById(id: string): Promise<EventAdminRecord> {
  const raw = await api.get<Record<string, unknown>>(
    `/events/${encodeURIComponent(id)}`,
    { auth: true },
  );
  const mapped = mapAdminEvent(raw);
  const [enriched] = await enrichEventsWithVenues([mapped]);
  return enriched ?? mapped;
}

export async function fetchEventStats(eventId: string): Promise<EventStatsRecord> {
  const raw = await api.get<Record<string, unknown>>(
    `/stats/${encodeURIComponent(eventId)}`,
    { auth: true },
  );
  return {
    totalRevenue: Number(raw.totalRevenue ?? 0),
    totalSales: Number(raw.totalSales ?? 0),
    totalTickets: Number(raw.totalTickets ?? 0),
    totalSeats: Number(raw.totalSeats ?? 0),
    totalRemaining: Number(raw.totalRemaining ?? 0),
  };
}

export async function fetchUsedTicketsCount(eventId: string): Promise<number> {
  const perPage = 500;
  let page = 1;
  let used = 0;
  let total = 0;

  while (true) {
    const qs = new URLSearchParams({
      'event.id': eventId,
      perPage: String(perPage),
      page: String(page),
    });
    const res = await api.get<{
      data?: Array<{ isUsed?: boolean }>;
      total?: number;
    }>(`/tickets?${qs.toString()}`, { auth: true });
    const rows = res.data ?? [];
    total = res.total ?? rows.length;
    used += rows.filter((t) => t.isUsed === true).length;
    if (page * perPage >= total || rows.length === 0) break;
    page += 1;
  }

  return used;
}

export async function fetchEventTicketsPage(input: {
  eventId: string;
  page?: number;
  perPage?: number;
}): Promise<{ items: TicketItem[]; page: number; hasMore: boolean }> {
  const page = input.page ?? 1;
  const perPage = input.perPage ?? 20;
  const qs = new URLSearchParams({
    'event.id': input.eventId,
    page: String(page),
    perPage: String(perPage),
    sort: 'created',
    order: 'desc',
  });

  const res = await api.get<{
    data?: Record<string, unknown>[];
    total?: number;
  }>(`/tickets?${qs.toString()}`, { auth: true });

  const items = (res.data ?? []).map((row) => mapTicketRecord(row));
  const total = res.total ?? items.length;
  const hasMore = page * perPage < total;

  return { items, page, hasMore };
}

export async function updateEventAdminFlags(
  eventId: string,
  patch: { isActive?: boolean; isVerified?: boolean },
): Promise<EventAdminRecord> {
  const raw = await api.put<Record<string, unknown>>(
    `/events/${encodeURIComponent(eventId)}`,
    patch,
    { auth: true },
  );
  const mapped = mapAdminEvent(raw);
  const [enriched] = await enrichEventsWithVenues([mapped]);
  return enriched ?? mapped;
}

export function formatEventRevenue(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits: 0,
  }).format(amount) + ' TL';
}
