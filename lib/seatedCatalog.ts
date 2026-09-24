import { api } from './api';
import { getAppLocale, type AppLocale } from './appLocale';
import {
  applyCommissionMarkup,
  type CommissionMeta,
} from './commission';
import { fetchEventSessions, type EventSession } from './eventStock';
import { pickLocalizedText } from './giseMappers';

export type SeatProductOption = {
  id: string;
  title: string;
  price: number;
  promotionPrice: number | null;
  promotionLabel: string | null;
  isPromotionAvailable: boolean;
};

export type SeatableSeat = {
  id: string;
  productId: string;
  status: number; // 0 free, 1 sold, 2 hold
  productTitle: string;
  price: number;
};

function parseLayoutSeats(layoutJSON: unknown): Array<{ id: string; productId: string }> {
  if (!layoutJSON || typeof layoutJSON !== 'object') return [];
  const root = layoutJSON as { children?: unknown[] };
  if (!Array.isArray(root.children)) return [];

  const seats: Array<{ id: string; productId: string }> = [];

  const walk = (nodes: unknown[]) => {
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;
      const n = node as {
        className?: string;
        attrs?: Record<string, unknown>;
        children?: unknown[];
      };
      if (n.className === 'Group' && n.attrs?.ticket) {
        const textChild = (n.children ?? []).find(
          (c) =>
            c &&
            typeof c === 'object' &&
            (c as { className?: string }).className === 'Text',
        ) as { attrs?: { text?: string } } | undefined;
        const seatId = String(textChild?.attrs?.text ?? '').trim();
        const productId = String(n.attrs.ticket).trim();
        if (seatId && productId) seats.push({ id: seatId, productId });
      }
      if (Array.isArray(n.children)) walk(n.children);
    }
  };

  walk(root.children);
  return seats;
}

function mapProductOptions(
  stockData: unknown,
  locale: AppLocale,
  commission?: CommissionMeta | null,
): Map<string, SeatProductOption> {
  const map = new Map<string, SeatProductOption>();
  const rows = Array.isArray(stockData)
    ? stockData
    : stockData && typeof stockData === 'object'
      ? Object.values(stockData as object).flatMap((g) =>
          Array.isArray(g) ? g : [],
        )
      : [];

  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    const id = typeof item.id === 'string' ? item.id : '';
    if (!id) continue;
    const promo =
      item.promotion && typeof item.promotion === 'object'
        ? (item.promotion as Record<string, unknown>)
        : null;
    const promoPriceRaw = Number(promo?.price);
    const promoPrice = Number.isFinite(promoPriceRaw)
      ? applyCommissionMarkup(promoPriceRaw, commission)
      : null;
    map.set(id, {
      id,
      title: pickLocalizedText(item.title, locale) || id,
      price: applyCommissionMarkup(Number(item.price ?? 0) || 0, commission),
      promotionPrice: promoPrice,
      promotionLabel: promo
        ? pickLocalizedText(promo.label, locale) || null
        : null,
      isPromotionAvailable: Boolean(item.isPromotionAvailable ?? promo),
    });
  }
  return map;
}

/**
 * Koltuklu etkinlik kataloğu. `preferredStockID` verilirse o seans, yoksa ilk
 * (gelecekteki) aktif seans kullanılır.
 */
export async function fetchSeatedCatalog(
  eventId: string,
  preferredStockID?: string | null,
): Promise<{
  stockID: string;
  sessionMs: number | null;
  seats: SeatableSeat[];
  products: Map<string, SeatProductOption>;
  layoutJSONID: string | null;
  sessions: EventSession[];
  serviceFee: number;
}> {
  const locale = getAppLocale();
  const [event, sessions] = await Promise.all([
    api.get<Record<string, unknown>>(`/events/${encodeURIComponent(eventId)}`),
    fetchEventSessions(eventId),
  ]);
  const layoutJSONID =
    typeof event.layoutJSONID === 'string' ? event.layoutJSONID : null;
  const commission: CommissionMeta = {
    commissionFee: Number(event.commissionFee ?? 0) || 0,
    isCommissionExtra: event.isCommissionExtra === true,
  };
  const serviceFee = Number(event.servicefee ?? 0) || 0;

  const wanted = String(preferredStockID ?? '').trim();
  const session =
    (wanted ? sessions.find((s) => s.stockID === wanted) : null) ??
    sessions[0] ??
    null;
  const stockID = session?.stockID ?? '';
  const sessionMs = session?.sessionMs ?? null;

  const products = mapProductOptions(session?.stock, locale, commission);

  let layoutSeats: Array<{ id: string; productId: string }> = [];
  if (layoutJSONID) {
    try {
      const layout = await api.get<{ layoutJSON?: unknown }>(
        `/eventLayouts/${encodeURIComponent(layoutJSONID)}`,
      );
      layoutSeats = parseLayoutSeats(layout.layoutJSON);
    } catch {
      layoutSeats = [];
    }
  }

  let selections: Record<string, { status?: number }> = {};
  if (stockID) {
    try {
      const raw = await api.get<Record<string, unknown>>(
        `/seatSelections/${encodeURIComponent(stockID)}`,
      );
      const {
        id: _id,
        createdate: _c,
        lastupdate: _l,
        createdby: _cb,
        updatedby: _ub,
        ...seats
      } = raw ?? {};
      selections = seats as Record<string, { status?: number }>;
    } catch {
      selections = {};
    }
  }

  const seats: SeatableSeat[] = layoutSeats.map((s) => {
    const product = products.get(s.productId);
    const status = Number(selections[s.id]?.status ?? 0) || 0;
    return {
      id: s.id,
      productId: s.productId,
      status,
      productTitle: product?.title ?? s.productId,
      price: product?.price ?? 0,
    };
  });

  return {
    stockID,
    sessionMs,
    seats,
    products,
    layoutJSONID,
    sessions,
    serviceFee,
  };
}

export async function holdSeatSelection(params: {
  stockID: string;
  seatId: string;
  userId: string;
  hold: boolean;
}): Promise<void> {
  await api.put(
    `/seatSelections/${encodeURIComponent(params.stockID)}`,
    {
      [params.seatId]: {
        status: params.hold ? 2 : 0,
        statusChangedAt: String(Math.floor(Date.now() / 1000)),
        user: params.hold ? params.userId : null,
      },
    },
    { auth: true },
  );
}
