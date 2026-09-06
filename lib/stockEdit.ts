import { api } from './api';
import { pickLocalizedText } from './giseMappers';
import { htmlToPlainText } from './events';
import {
  buildStockProductStats,
  fetchSalesForEvent,
  fetchTicketsForEvent,
} from './stockStats';

export const STOCK_CATEGORY_ORDER = [
  'deal',
  'guestlist',
  'general',
  'vip',
  'extras',
] as const;

export const STOCK_CATEGORY_LABELS: Record<string, string> = {
  general: 'Bilet',
  deal: 'Kampanya',
  vip: 'VIP',
  guestlist: 'Rezervasyon',
  extras: 'Ekstra',
  invitation: 'Davetiye',
};

export type StockProductStatus = 0 | 1 | 2;

export type StockEditProduct = {
  id: string;
  category: string;
  categoryLabel: string;
  title: string;
  description: string;
  totalStock: number;
  sold: number;
  remaining: number;
  status: StockProductStatus;
  statusLabel: string;
  statusColor: string;
};

export type StockEditSection = {
  category: string;
  label: string;
  products: StockEditProduct[];
};

type RawStockRow = {
  id: string;
  stockID?: string;
  event?: string;
  type?: number;
  stock?: unknown;
};

function parseProductStatus(value: unknown): StockProductStatus {
  const num = Number(value);
  if (num === 1) return 1;
  if (num === 2) return 2;
  return 0;
}

export function getProductStatusDisplay(
  status: StockProductStatus,
  remaining: number,
): { label: string; color: string } {
  if (status === 2) {
    return { label: 'Gizli', color: 'rgba(52,61,72,0.55)' };
  }
  if (status === 1 || remaining <= 0) {
    return { label: 'Tükendi', color: '#DC2626' };
  }
  return { label: 'Satışta', color: '#16A34A' };
}

function resolveProductId(item: Record<string, unknown>): string {
  if (typeof item.id === 'string' && item.id) return item.id;
  const label =
    item.label && typeof item.label === 'object'
      ? (item.label as Record<string, unknown>)
      : null;
  if (typeof label?.key === 'string' && label.key) return label.key;
  return '';
}

function resolveProductTitle(item: Record<string, unknown>): string {
  if (item.title) return pickLocalizedText(item.title);
  const label =
    item.label && typeof item.label === 'object'
      ? (item.label as Record<string, unknown>)
      : null;
  if (label?.title) return pickLocalizedText(label.title);
  return 'Bilet';
}

function resolveProductDescription(item: Record<string, unknown>): string {
  const desc = item.description
    ? pickLocalizedText(item.description)
    : '';
  if (desc) return htmlToPlainText(desc);
  const label =
    item.label && typeof item.label === 'object'
      ? (item.label as Record<string, unknown>)
      : null;
  if (label?.description) return htmlToPlainText(pickLocalizedText(label.description));
  return '';
}

function buildSectionsFromStockRow(stockRow: RawStockRow): StockEditSection[] {
  const sections: StockEditSection[] = [];
  const type = stockRow.type ?? 1;
  const stockData = stockRow.stock;

  const pushProduct = (
    category: string,
    item: Record<string, unknown>,
  ) => {
    const id = resolveProductId(item);
    if (!id) return;
    const totalStock = Number(item.stock ?? 0);
    const sold = 0;
    const remaining = totalStock;
    const status = parseProductStatus(item.status);
    const statusInfo = getProductStatusDisplay(status, remaining);
    const product: StockEditProduct = {
      id,
      category,
      categoryLabel: STOCK_CATEGORY_LABELS[category] ?? category,
      title: resolveProductTitle(item),
      description: resolveProductDescription(item),
      totalStock,
      sold,
      remaining,
      status,
      statusLabel: statusInfo.label,
      statusColor: statusInfo.color,
    };

    let section = sections.find((s) => s.category === category);
    if (!section) {
      section = {
        category,
        label: STOCK_CATEGORY_LABELS[category] ?? category,
        products: [],
      };
      sections.push(section);
    }
    section.products.push(product);
  };

  if (type === 3 && Array.isArray(stockData)) {
    for (const item of stockData) {
      if (!item || typeof item !== 'object') continue;
      pushProduct('general', item as Record<string, unknown>);
    }
  } else if (stockData && typeof stockData === 'object' && !Array.isArray(stockData)) {
    for (const category of STOCK_CATEGORY_ORDER) {
      const items = (stockData as Record<string, unknown>)[category];
      if (!Array.isArray(items) || items.length === 0) continue;
      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        pushProduct(category, item as Record<string, unknown>);
      }
    }
  }

  return sections.sort(
    (a, b) =>
      STOCK_CATEGORY_ORDER.indexOf(a.category as (typeof STOCK_CATEGORY_ORDER)[number]) -
      STOCK_CATEGORY_ORDER.indexOf(b.category as (typeof STOCK_CATEGORY_ORDER)[number]),
  );
}

async function fetchStockRowForEvent(eventId: string): Promise<RawStockRow | null> {
  const qs = new URLSearchParams({ event: eventId, perPage: '50', page: '1' });
  const res = await api.get<{ data?: RawStockRow[] }>(
    `/stocks?${qs.toString()}`,
    { auth: true },
  );
  return res.data?.[0] ?? null;
}

export async function fetchEventStockEdit(
  eventId: string,
): Promise<{ stockRecordId: string; sections: StockEditSection[] }> {
  const stockRow = await fetchStockRowForEvent(eventId);
  if (!stockRow) {
    return { stockRecordId: '', sections: [] };
  }

  const sections = buildSectionsFromStockRow(stockRow);
  const [sales, tickets] = await Promise.all([
    fetchSalesForEvent(eventId, stockRow.stockID ?? stockRow.id),
    fetchTicketsForEvent(eventId),
  ]);
  const statsById = new Map(
    buildStockProductStats({ stockRow, sales, tickets }).map((row) => [row.id, row]),
  );

  for (const section of sections) {
    for (const product of section.products) {
      const stat = statsById.get(product.id);
      product.sold = stat?.sold ?? 0;
      product.remaining = stat?.remaining ?? product.totalStock;
      const statusInfo = getProductStatusDisplay(product.status, product.remaining);
      product.statusLabel = statusInfo.label;
      product.statusColor = statusInfo.color;
    }
  }

  return {
    stockRecordId: stockRow.id,
    sections,
  };
}

export async function updateStockProduct(
  stockRecordId: string,
  category: string,
  productId: string,
  patch: { stock: number; status: StockProductStatus },
): Promise<void> {
  const raw = await api.get<RawStockRow>(
    `/stocks/${encodeURIComponent(stockRecordId)}`,
    { auth: true },
  );

  const stockData = raw.stock;
  if (!stockData || typeof stockData !== 'object') {
    throw new Error('Stok kaydı bulunamadı.');
  }

  const cloned = JSON.parse(JSON.stringify(stockData)) as Record<string, unknown>;

  if (Array.isArray(cloned)) {
    const idx = cloned.findIndex(
      (item) =>
        item &&
        typeof item === 'object' &&
        (item as Record<string, unknown>).id === productId,
    );
    if (idx === -1) throw new Error('Ürün bulunamadı.');
    const row = cloned[idx] as Record<string, unknown>;
    row.stock = patch.stock;
    row.status = patch.status;
  } else {
    const items = cloned[category];
    if (!Array.isArray(items)) throw new Error('Ürün kategorisi bulunamadı.');
    const idx = items.findIndex(
      (item) =>
        item &&
        typeof item === 'object' &&
        (item as Record<string, unknown>).id === productId,
    );
    if (idx === -1) throw new Error('Ürün bulunamadı.');
    const row = items[idx] as Record<string, unknown>;
    row.stock = patch.stock;
    row.status = patch.status;
  }

  await api.put(
    `/stocks/${encodeURIComponent(stockRecordId)}`,
    { stock: cloned },
    { auth: true },
  );
}
