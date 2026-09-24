import { api, ApiError } from './api';
import { isPastEvent } from './events';
import {
  mapTicketRecord,
} from './giseMappers';
import {
  fetchTicketByPnr,
  formatTicketDateLong,
  formatTicketTime,
  type TicketItem,
} from './tickets';
import { loadVenueMap } from './venues';

export type TicketScanStatus =
  | 'valid'
  | 'not_found'
  | 'already_used'
  | 'past_event'
  | 'error';

export type TicketScanEvaluation = {
  status: TicketScanStatus;
  ticket: TicketItem | null;
  title: string;
  message: string;
  canUse: boolean;
};

export function parseTicketScanValue(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const urlMatch = trimmed.match(/etkinlik-bileti\/([^/?#]+)/i);
  if (urlMatch?.[1]) {
    try {
      return decodeURIComponent(urlMatch[1]).trim();
    } catch {
      return urlMatch[1].trim();
    }
  }

  return trimmed;
}

async function enrichTicket(ticket: TicketItem): Promise<TicketItem> {
  if (!ticket.venueName) return ticket;
  const map = await loadVenueMap();
  const venue = map.get(ticket.venueName);
  return venue ? { ...ticket, venueName: venue.name } : ticket;
}

export async function fetchTicketByScanValue(
  raw: string,
): Promise<TicketItem | null> {
  const token = parseTicketScanValue(raw);
  if (!token) return null;

  const byPnr = await fetchTicketByPnr(token);
  if (byPnr) return byPnr;

  try {
    const row = await api.get<Record<string, unknown>>(`/tickets/${token}`, {
      auth: true,
    });
    const ticket = mapTicketRecord(row);
    return enrichTicket(ticket);
  } catch {
    return null;
  }
}

export function evaluateTicketScan(ticket: TicketItem | null): TicketScanEvaluation {
  if (!ticket) {
    return {
      status: 'not_found',
      ticket: null,
      title: 'Bilet bulunamadı',
      message: 'Bu QR koduna veya PNR numarasına ait bilet bulunamadı.',
      canUse: false,
    };
  }

  if (ticket.isUsed) {
    const usedHint = ticket.usedAt
      ? ` Kullanım: ${formatTicketDateLong(ticket.usedAt)} ${formatTicketTime(ticket.usedAt)}`
      : '';
    return {
      status: 'already_used',
      ticket,
      title: 'Bilet zaten kullanılmış',
      message: `Bu bilet daha önce okutulmuş ve kullanılmış.${usedHint}`,
      canUse: false,
    };
  }

  if (isPastEvent({ startsAt: ticket.eventDate })) {
    const dateLabel = ticket.eventDate
      ? `${formatTicketDateLong(ticket.eventDate)} ${formatTicketTime(ticket.eventDate)}`
      : '';
    return {
      status: 'past_event',
      ticket,
      title: 'Etkinlik sona ermiş',
      message: dateLabel
        ? `Bu bilet geçmiş bir etkinliğe aittir (${dateLabel}). Giriş için kullanılamaz.`
        : 'Bu bilet geçmiş bir etkinliğe aittir. Giriş için kullanılamaz.',
      canUse: false,
    };
  }

  return {
    status: 'valid',
    ticket,
    title: 'Bilet geçerli',
    message: 'Bilet doğrulandı. Giriş için kullanabilirsiniz.',
    canUse: true,
  };
}

/** Sunucu 403: bilet bu personelin etkinlik/mekân kapsamı dışında. */
export function isForbiddenError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 403;
}

export const FORBIDDEN_SCAN_EVALUATION: Omit<TicketScanEvaluation, 'ticket'> = {
  status: 'error',
  title: 'Yetkiniz yok',
  message:
    'Bu bilet sizin etkinlik / mekân kapsamınızda değil. Yalnızca yetkili olduğunuz etkinliklerin biletlerini okutabilirsiniz.',
  canUse: false,
};

export async function lookupTicketScan(
  raw: string,
): Promise<TicketScanEvaluation> {
  try {
    const ticket = await fetchTicketByScanValue(raw);
    return evaluateTicketScan(ticket);
  } catch (err) {
    if (isForbiddenError(err)) {
      return { ...FORBIDDEN_SCAN_EVALUATION, ticket: null };
    }
    return {
      status: 'error',
      ticket: null,
      title: 'Sorgu başarısız',
      message: 'Bilet sorgulanırken bir hata oluştu. Lütfen tekrar deneyin.',
      canUse: false,
    };
  }
}

export async function markTicketAsUsed(ticketId: string): Promise<TicketItem> {
  const row = await api.put<Record<string, unknown>>(
    `/tickets/${ticketId}/use`,
    {},
    { auth: true },
  );
  const ticket = mapTicketRecord(row);
  return enrichTicket(ticket);
}

export async function lookupTicketByPnr(
  pnr: string,
): Promise<TicketScanEvaluation> {
  return lookupTicketScan(pnr);
}

export type { TicketItem };
