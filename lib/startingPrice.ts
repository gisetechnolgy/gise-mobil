import { api } from './api';
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
    const price = Number(row.price);
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
): ActivePriceInfo | null {
  let prices = collectActivePrices(stockData, true);
  if (prices.length === 0) {
    prices = collectActivePrices(stockData, false);
  }
  if (prices.length === 0) return null;
  const minPrice = Math.min(...prices);
  const unique = new Set(prices.map((p) => Number(p)));
  return { minPrice, hasMultiple: unique.size > 1 };
}

export async function fetchEventActivePriceInfo(
  eventId: string,
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
      const info = getActivePriceInfoFromStock(row.stock);
      if (info) return info;
    }
    return null;
  } catch {
    return null;
  }
}

export function formatPriceTl(price: number): string {
  return `${Math.round(price).toLocaleString('tr-TR')} TL`;
}

/** Satın alma / ödeme ekranları için 2 haneli fiyat (ör. 8,000.00 TL). */
export function formatMoneyTl(price: number): string {
  const value = Number.isFinite(price) ? price : 0;
  return `${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} TL`;
}
