import { api } from './api';
import { applyCommissionMarkup, type CommissionMeta } from './commission';
import type { GiseListResponse } from './giseMappers';

export type ActivePriceInfo = {
  minPrice: number;
  hasMultiple: boolean;
};

const STOCK_CATEGORIES = [
  'general',
  'vip',
  'deal',
  'extras',
  'guestlist',
  'invitation',
] as const;

function collectActivePrices(
  stockData: unknown,
  onlyOnSale: boolean,
): number[] {
  const prices: number[] = [];

  const pushItem = (item: unknown) => {
    if (!item || typeof item !== 'object') return;
    const row = item as Record<string, unknown>;
    const status =
      row.status == null || row.status === ''
        ? null
        : Number(row.status);
    if (onlyOnSale) {
      if (status != null && status !== 0) return;
    } else if (status === 2) {
      return;
    }
    let price = Number(row.price);
    if (row.isPromotionAvailable && row.promotion && typeof row.promotion === 'object') {
      const promo = Number((row.promotion as { price?: unknown }).price);
      if (Number.isFinite(promo) && promo > 0) {
        price = Number.isFinite(price) && price > 0 ? Math.min(price, promo) : promo;
      }
    }
    if (!Number.isFinite(price) || price <= 0) return;
    prices.push(price);
  };

  if (Array.isArray(stockData)) {
    stockData.forEach(pushItem);
    return prices;
  }

  if (stockData && typeof stockData === 'object') {
    for (const category of STOCK_CATEGORIES) {
      const items = (stockData as Record<string, unknown>)[category];
      if (Array.isArray(items)) items.forEach(pushItem);
    }
  }

  return prices;
}

export function getActivePriceInfoFromStock(
  stockData: unknown,
  commission?: CommissionMeta | null,
): ActivePriceInfo | null {
  let prices = collectActivePrices(stockData, true);
  if (prices.length === 0) {
    prices = collectActivePrices(stockData, false);
  }
  if (prices.length === 0) return null;
  const marked = prices.map((p) => applyCommissionMarkup(p, commission));
  const minPrice = Math.min(...marked);
  const unique = new Set(marked.map((p) => Number(p)));
  return { minPrice, hasMultiple: unique.size > 1 };
}

/** API startingPrice (komisyonlu) varsa onu kullan. */
export function getActivePriceInfoFromEvent(
  event: {
    startingPrice?: number | null;
    commissionFee?: number | null;
    isCommissionExtra?: boolean | null;
  } | null | undefined,
): ActivePriceInfo | null {
  if (event?.startingPrice != null && Number(event.startingPrice) > 0) {
    return {
      minPrice: Number(event.startingPrice),
      hasMultiple: false,
    };
  }
  return null;
}

export async function fetchEventActivePriceInfo(
  eventId: string,
  commission?: CommissionMeta | null,
): Promise<ActivePriceInfo | null> {
  try {
    const qs = new URLSearchParams({
      event: eventId,
      perPage: '50',
      page: '1',
    });
    const res = await api.get<
      GiseListResponse<{ stock?: unknown; isActive?: boolean }>
    >(`/stocks?${qs.toString()}`);
    const rows = (res.data ?? []).filter((row) => row.isActive !== false);
    for (const row of rows) {
      const info = getActivePriceInfoFromStock(row.stock, commission);
      if (info) return info;
    }
    return null;
  } catch {
    return null;
  }
}

/** Liste kartları: önce API startingPrice, yoksa stok + komisyon. */
export async function enrichEventsWithPriceInfo<
  T extends {
    id: string;
    startingPrice?: number | null;
    commissionFee?: number | null;
    isCommissionExtra?: boolean | null;
  },
>(events: T[]): Promise<Array<T & { priceInfo: ActivePriceInfo | null }>> {
  return Promise.all(
    events.map(async (event) => {
      const fromApi = getActivePriceInfoFromEvent(event);
      if (fromApi) {
        return { ...event, priceInfo: fromApi };
      }
      return {
        ...event,
        priceInfo: await fetchEventActivePriceInfo(event.id, {
          commissionFee: event.commissionFee,
          isCommissionExtra: event.isCommissionExtra,
        }),
      };
    }),
  );
}

export function formatPriceTl(price: number): string {
  return `${Math.round(price).toLocaleString('tr-TR')} TL`;
}

/** Web ana sayfa kartları — ₺1.250 */
export function formatHomePriceAmount(price: number): string {
  return `₺${Math.round(price).toLocaleString('tr-TR')}`;
}

/** Satın alma / ödeme ekranları için 2 haneli fiyat (ör. 8,000.00 TL). */
export function formatMoneyTl(price: number): string {
  const value = Number.isFinite(price) ? price : 0;
  return `${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} TL`;
}
