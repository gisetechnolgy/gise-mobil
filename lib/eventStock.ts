import { api } from './api';
import type { GiseListResponse } from './giseMappers';

export type EventStockContext = {
  /** stocks tablosu satır id (opsiyonel) */
  stockRecordId: string;
  /** Satış event.stockID — genelde seans id */
  stockID: string;
  sessionMs: number | null;
};

/** Etkinliğin bir seansı (stocks satırı). */
export type EventSession = EventStockContext & {
  date: string | null;
  time: string | null;
  /** Ham stok JSON (ürün listesi bu seanstan üretilir). */
  stock: unknown;
};

type StockRow = {
  id?: string;
  stockID?: string;
  isActive?: boolean;
  date?: string;
  time?: string;
  stock?: unknown;
};

function parseSessionMs(date?: string | null, time?: string | null): number | null {
  const d = String(date ?? '').trim();
  const t = String(time ?? '').trim();
  if (!d) return null;
  const iso = t ? `${d}T${t}` : `${d}T00:00:00`;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function rowHasProducts(row: StockRow): boolean {
  return (
    (Array.isArray(row.stock) && row.stock.length > 0) ||
    (!!row.stock &&
      typeof row.stock === 'object' &&
      !Array.isArray(row.stock) &&
      Object.keys(row.stock as object).length > 0)
  );
}

/**
 * Etkinliğin tüm aktif seansları (ürünü olan stok satırları), tarihe göre sıralı.
 * Zamanı geçmiş seanslar listelenmez (tarihi olmayanlar tutulur).
 */
export async function fetchEventSessions(
  eventId: string,
): Promise<EventSession[]> {
  try {
    const qs = new URLSearchParams({
      event: eventId,
      perPage: '50',
      page: '1',
    });
    const res = await api.get<GiseListResponse<StockRow>>(
      `/stocks?${qs.toString()}`,
    );
    const now = Date.now();
    const sessions: EventSession[] = [];
    for (const row of res.data ?? []) {
      if (row.isActive === false) continue;
      const stockID = String(row.stockID ?? row.id ?? '').trim();
      if (!stockID || !rowHasProducts(row)) continue;
      const sessionMs = parseSessionMs(row.date, row.time);
      // Start anında ve sonrasında bu seans listelenmez; diğer gelecek seanslar kalır
      if (sessionMs != null && sessionMs <= now) continue;
      sessions.push({
        stockRecordId: String(row.id ?? stockID),
        stockID,
        sessionMs,
        date: row.date ? String(row.date) : null,
        time: row.time ? String(row.time) : null,
        stock: row.stock,
      });
    }
    sessions.sort((a, b) => (a.sessionMs ?? 0) - (b.sessionMs ?? 0));
    return sessions;
  } catch {
    return [];
  }
}

/** Seans etiketi: "15 Eyl 2026, 20:30" (locale'e göre). */
export function formatSessionLabel(
  session: Pick<EventSession, 'sessionMs' | 'date' | 'time'>,
  locale: string,
): string {
  if (session.sessionMs != null) {
    try {
      const d = new Date(session.sessionMs);
      const datePart = d.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const timePart = session.time
        ? d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
        : '';
      return timePart ? `${datePart}, ${timePart}` : datePart;
    } catch {
      /* fallthrough */
    }
  }
  return [session.date, session.time].filter(Boolean).join(' ') || '—';
}

/** Etkinlik için aktif stok / seans (ilk uygun kayıt; tek seanslı etkinlikler için). */
export async function fetchEventStockContext(
  eventId: string,
): Promise<EventStockContext | null> {
  const sessions = await fetchEventSessions(eventId);
  const first = sessions[0];
  if (!first) return null;
  return {
    stockRecordId: first.stockRecordId,
    stockID: first.stockID,
    sessionMs: first.sessionMs,
  };
}
