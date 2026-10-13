import { api } from './api';
import {
  GiseListResponse,
  mapTicketRecord,
} from './giseMappers';
import { loadVenueMap } from './venues';
import { fetchEventById } from './events';

export type TicketItem = ReturnType<typeof mapTicketRecord> & {
  eventImageUrl?: string | null;
};

const eventImageCache = new Map<string, string | null>();

/** Bilet kaydındaki etkinlik snapshot'ında görsel yok → etkinlikten çek (önbellekli) */
async function enrichTicketEventImages(items: TicketItem[]): Promise<TicketItem[]> {
  const missing = [
    ...new Set(
      items
        .map((i) => i.eventId)
        .filter((id): id is string => !!id && !eventImageCache.has(id)),
    ),
  ];
  await Promise.all(
    missing.map(async (id) => {
      try {
        const ev = await fetchEventById(id);
        eventImageCache.set(id, ev.imageUrl || ev.bannerCardUrl || null);
      } catch {
        eventImageCache.set(id, null);
      }
    }),
  );
  return items.map((i) => ({
    ...i,
    eventImageUrl: i.eventId ? eventImageCache.get(i.eventId) ?? null : null,
  }));
}

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

  // Sahiplik filtresi sunucuda (GET /tickets JWT + user kapsamı). Kanal filtresi yok:
  // satış noktası / yönetici satış modundan alınan biletler de kullanıcıya görünür.
  const items = (res.data ?? []).map((row) => mapTicketRecord(row));

  const enriched = await enrichTicketEventImages(
    await enrichTicketVenueNames(items),
  );

  const total = res.total ?? enriched.length;
  const serverHasMore = page * perPage < total;

  return {
    items: enriched,
    page,
    hasMore: enriched.length === perPage && serverHasMore,
  };
}

/** Bilet üzerindeki isim (kalıcı). Hesap profilini değiştirmez. */
export async function updateTicketHolderName(
  ticketId: string,
  fullName: string,
): Promise<TicketItem> {
  const trimmed = fullName.trim().replace(/\s+/g, ' ');
  if (trimmed.length < 2) {
    throw new Error('invalid-holder-name');
  }
  const raw = await api.put<Record<string, unknown>>(
    `/tickets/${encodeURIComponent(ticketId)}/holder-name`,
    { fullName: trimmed },
    { auth: true },
  );
  const ticket = mapTicketRecord(raw);
  const [enriched] = await enrichTicketVenueNames([ticket]);
  return enriched ?? ticket;
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

/**
 * İade Et butonu: ürün iade edilebilir + iade süresi açık olmalı.
 * API enrich (`refundEligible` = ürün refundable ∧ ürün/etkinlik son tarihi).
 */
export function canRequestTicketRefund(ticket: TicketItem): boolean {
  if (ticket.isUsed) return false;
  if (!ticket.saleId) return false;
  const ex = ticket.extras;
  if (ex.refunded || ex.refundProcessSuccess) return false;
  if (ex.refundPending || ex.refundRequested) return false;
  if (ticket.eventRefundEnabled === false) return false;
  if (ticket.productRefundable === false) return false;
  // Ana kapı: API canlı stok + ürün/etkinlik iade tarihi
  return ticket.refundEligible === true;
}

export function isTicketRefundDone(ticket: TicketItem): boolean {
  return (
    ticket.extras.refunded === true ||
    ticket.extras.refundProcessSuccess === true
  );
}

export function isTicketRefundPending(ticket: TicketItem): boolean {
  return (
    ticket.extras.refundPending === true ||
    ticket.extras.refundRequested === true
  );
}

/** Seçilen ürün(ler) için yalnızca o kadar bileti işaretle (aynı satıştaki diğerleri dokunma). */
export function markTicketsRefundPendingForProducts(
  items: TicketItem[],
  saleId: string,
  productIds: string[],
  countsByProduct?: Record<string, number>,
): TicketItem[] {
  const remaining: Record<string, number> = {};
  for (const pid of productIds) {
    remaining[pid] = countsByProduct?.[pid] ?? 1;
  }

  return items.map((t) => {
    if (t.saleId !== saleId) return t;
    const pid = t.productId ?? '';
    if (!pid || remaining[pid] == null || remaining[pid] <= 0) return t;
    remaining[pid] -= 1;
    return {
      ...t,
      extras: {
        ...t.extras,
        refundPending: true,
        refundRequested: true,
      },
    };
  });
}

export function markTicketsRefundDoneForProducts(
  items: TicketItem[],
  saleId: string,
  productIds: string[],
  countsByProduct?: Record<string, number>,
): TicketItem[] {
  const remaining: Record<string, number> = {};
  for (const pid of productIds) {
    remaining[pid] = countsByProduct?.[pid] ?? 1;
  }

  return items.map((t) => {
    if (t.saleId !== saleId) return t;
    const pid = t.productId ?? '';
    if (!pid || remaining[pid] == null || remaining[pid] <= 0) return t;
    remaining[pid] -= 1;
    return {
      ...t,
      extras: {
        ...t.extras,
        refunded: true,
        refundProcessSuccess: true,
        refundPending: false,
        refundRequested: false,
      },
    };
  });
}

/** @deprecated Satıştaki tüm biletleri işaretler — kısmi iadede kullanma */
export function markTicketsRefundPending(
  items: TicketItem[],
  saleId: string,
): TicketItem[] {
  return markTicketsRefundPendingForProducts(
    items,
    saleId,
    items.filter((t) => t.saleId === saleId && t.productId).map((t) => t.productId!),
  );
}

/** @deprecated Satıştaki tüm biletleri işaretler — kısmi iadede kullanma */
export function markTicketsRefundDone(
  items: TicketItem[],
  saleId: string,
): TicketItem[] {
  return markTicketsRefundDoneForProducts(
    items,
    saleId,
    items.filter((t) => t.saleId === saleId && t.productId).map((t) => t.productId!),
  );
}
