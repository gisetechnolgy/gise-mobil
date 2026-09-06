import { api } from './api';
import { getAppLocale } from './appLocale';
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

  const price = Number(item.price);
  const title = pickLocalized(item.title, locale).trim();
  const descriptionHtml = pickLocalized(item.description, locale);
  const description = hasDescription(descriptionHtml)
    ? stripHtml(descriptionHtml)
    : '';

  return {
    id,
    title: title || id,
    description,
    price: Number.isFinite(price) ? price : 0,
    priceLabel: formatPriceTl(Number.isFinite(price) ? price : 0),
    category,
    soldOut,
    remaining,
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
): EventProductItem[] {
  if (Array.isArray(stockData)) {
    const raw = stockData.filter(
      (row): row is Record<string, unknown> =>
        !!row && typeof row === 'object',
    );
    const items = raw
      .map((row) => toProduct(row, null, locale))
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
      .map((row) => toProduct(row, category, locale))
      .filter((row): row is EventProductItem => !!row);
    result.push(...sortProducts(items, raw));
  }

  return result;
}

export async function fetchEventProducts(
  eventId: string,
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
      const products = collectFromStock(row.stock, locale);
      if (products.length > 0) return products;
    }
    return [];
  } catch {
    return [];
  }
}
