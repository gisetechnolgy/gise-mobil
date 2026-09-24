import { api } from './api';
import { getAppLocale } from './appLocale';
import {
  applyCommissionMarkup,
  type CommissionMeta,
} from './commission';
import type { GiseListResponse } from './giseMappers';
import { formatPriceTl } from './startingPrice';

const CATEGORY_ORDER = [
  'deal',
  'guestlist',
  'general',
  'vip',
  'extras',
] as const;

export type EventProductItem = {
  id: string;
  title: string;
  description: string;
  priceLabel: string;
  price: number;
  category: string | null;
  soldOut: boolean;
  remaining: number;
  hasDownPayment?: boolean;
  downPaymentAmount?: number | null;
  /** Kapora ürünlerinde biletin tam fiyatı (price = şimdi ödenen kapora). */
  fullPrice?: number;
};

function pickLocalized(
  value: unknown,
  locale: string,
): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const row = value as Record<string, unknown>;
    const preferred = row[locale] ?? row.tr ?? row.en;
    return typeof preferred === 'string' ? preferred : '';
  }
  return '';
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasDescription(html: string): boolean {
  return stripHtml(html).length > 0;
}

function toProduct(
  item: Record<string, unknown>,
  category: string | null,
  locale: string,
  commission?: CommissionMeta | null,
): EventProductItem | null {
  const id = typeof item.id === 'string' ? item.id : '';
  if (!id) return null;
  const status =
    item.status == null || item.status === ''
      ? null
      : Number(item.status);
  if (status === 2) return null;

  const stock = Number(item.stock ?? 0);
  const sold = Number(item.sold ?? 0);
  const remainingRaw =
    Number.isFinite(stock) && Number.isFinite(sold) ? stock - sold : 0;
  const remaining = Math.max(0, remainingRaw);
  const soldOut = status === 1 || remaining <= 0;

  // Web: komisyon price / promotion'a uygulanır; kapora tutarına değil.
  const listPrice = applyCommissionMarkup(Number(item.price), commission);
  const title = pickLocalized(item.title, locale).trim();
  const descriptionHtml = pickLocalized(item.description, locale);
  const description = hasDescription(descriptionHtml)
    ? stripHtml(descriptionHtml)
    : '';

  const hasDownPayment = Boolean(item.hasDownPayment);
  const downRaw = Number(item.downPaymentAmount);
  const downPaymentAmount =
    hasDownPayment && Number.isFinite(downRaw) ? downRaw : null;
  const chargePrice =
    hasDownPayment && downPaymentAmount != null ? downPaymentAmount : listPrice;

  return {
    id,
    title: title || id,
    description,
    price: Number.isFinite(chargePrice) ? chargePrice : 0,
    priceLabel: formatPriceTl(Number.isFinite(chargePrice) ? chargePrice : 0),
    category,
    soldOut,
    remaining,
    hasDownPayment,
    downPaymentAmount,
    fullPrice: Number.isFinite(listPrice) ? listPrice : 0,
  };
}

function sortProducts(items: EventProductItem[], raw: Record<string, unknown>[]) {
  const orderMap = new Map<string, number>();
  raw.forEach((row, index) => {
    const id = typeof row.id === 'string' ? row.id : '';
    if (!id) return;
    const explicit = Number(row.order);
    orderMap.set(id, Number.isFinite(explicit) ? explicit : index);
  });
  return items.slice().sort((a, b) => {
    const ao = orderMap.get(a.id) ?? 0;
    const bo = orderMap.get(b.id) ?? 0;
    return ao - bo;
  });
}

function collectFromStock(
  stockData: unknown,
  locale: string,
  commission?: CommissionMeta | null,
): EventProductItem[] {
  if (Array.isArray(stockData)) {
    const raw = stockData.filter(
      (row): row is Record<string, unknown> =>
        !!row && typeof row === 'object',
    );
    const items = raw
      .map((row) => toProduct(row, null, locale, commission))
      .filter((row): row is EventProductItem => !!row);
    return sortProducts(items, raw);
  }

  if (!stockData || typeof stockData !== 'object') return [];

  const obj = stockData as Record<string, unknown>;
  const result: EventProductItem[] = [];

  for (const category of CATEGORY_ORDER) {
    const group = obj[category];
    if (!Array.isArray(group) || group.length === 0) continue;
    const raw = group.filter(
      (row): row is Record<string, unknown> =>
        !!row && typeof row === 'object',
    );
    const items = raw
      .map((row) => toProduct(row, category, locale, commission))
      .filter((row): row is EventProductItem => !!row);
    result.push(...sortProducts(items, raw));
  }

  return result;
}

/** Seçili seansın ham stok JSON'undan ürün listesi (seans seçici için). */
export function productsFromStock(
  stock: unknown,
  commission?: CommissionMeta | null,
): EventProductItem[] {
  return collectFromStock(stock, getAppLocale(), commission);
}

export async function fetchEventProducts(
  eventId: string,
  commission?: CommissionMeta | null,
): Promise<EventProductItem[]> {
  try {
    const locale = getAppLocale();
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
      const products = collectFromStock(row.stock, locale, commission);
      if (products.length > 0) return products;
    }
    return [];
  } catch {
    return [];
  }
}
