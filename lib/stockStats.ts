import { api } from './api';
import { GiseListResponse, pickLocalizedText } from './giseMappers';

const STOCK_CATEGORIES = [
  'general',
  'vip',
  'deal',
  'extras',
  'guestlist',
  'invitation',
] as const;

export type StockProductStat = {
  id: string;
  title: string;
  totalStock: number;
  remaining: number;
  sold: number;
  used: number;
  isOnSale: boolean;
};

type RawStockRow = {
  id: string;
  stockID?: string;
  event?: string;
  type?: number;
  stock?: unknown;
  isActive?: boolean;
};

type RawSaleRow = Record<string, unknown>;
type RawTicketRow = Record<string, unknown>;

function resolveProductKey(item: Record<string, unknown>): string {
  const label =
    item.label && typeof item.label === 'object'
      ? (item.label as Record<string, unknown>)
      : null;
  if (typeof label?.key === 'string' && label.key) return label.key;
  if (typeof item.id === 'string' && item.id) return item.id;
  return '';
}

function resolveProductTitle(item: Record<string, unknown>): string {
  const label =
    item.label && typeof item.label === 'object'
      ? (item.label as Record<string, unknown>)
      : null;
  if (label?.title) return pickLocalizedText(label.title);
  if (item.title) return pickLocalizedText(item.title);
  if (typeof item.name === 'string' && item.name.trim()) return item.name.trim();
  return 'Bilet';
}

function extractProductsFromStockRow(stockRow: RawStockRow) {
  const products: Array<{
    id: string;
    title: string;
    stock: number;
    isActive: boolean;
  }> = [];
  const type = stockRow.type ?? 1;
  const stockData = stockRow.stock;

  if (type === 3 && Array.isArray(stockData)) {
    for (const item of stockData) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      const id = resolveProductKey(row);
      if (!id) continue;
      products.push({
        id,
        title: resolveProductTitle(row),
        stock: Number(row.stock ?? 0),
        isActive: row.isActive !== false,
      });
    }
    return products;
  }

  if (stockData && typeof stockData === 'object' && !Array.isArray(stockData)) {
    for (const category of STOCK_CATEGORIES) {
      const items = (stockData as Record<string, unknown>)[category];
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        const row = item as Record<string, unknown>;
        const id = resolveProductKey(row);
        if (!id) continue;
        products.push({
          id,
          title: resolveProductTitle(row),
          stock: Number(row.stock ?? 0),
          isActive: row.isActive !== false,
        });
      }
    }
  }

  return products;
}

function saleMatchesStock(sale: RawSaleRow, stockRow: RawStockRow): boolean {
  const event =
    sale.event && typeof sale.event === 'object'
      ? (sale.event as Record<string, unknown>)
      : null;
  const saleStockId = event?.stockID;
  if (!saleStockId) return true;
  return (
    saleStockId === stockRow.stockID ||
    saleStockId === stockRow.id ||
    String(saleStockId) === String(stockRow.stockID)
  );
}

function ticketProductKey(ticket: RawTicketRow): string | null {
  const product =
    ticket.product && typeof ticket.product === 'object'
      ? (ticket.product as Record<string, unknown>)
      : null;
  if (!product) return null;
  const label =
    product.label && typeof product.label === 'object'
      ? (product.label as Record<string, unknown>)
      : null;
  if (typeof label?.key === 'string' && label.key) return label.key;
  if (typeof product.key === 'string' && product.key) return product.key;
  if (typeof product.id === 'string' && product.id) return product.id;
  return null;
}

function addSoldCount(sold: Map<string, number>, key: string, count: number) {
  if (!key || count <= 0) return;
  sold.set(key, (sold.get(key) ?? 0) + count);
}

function countSoldFromSales(
  sales: RawSaleRow[],
  stockRow: RawStockRow,
): Map<string, number> {
  const sold = new Map<string, number>();

  for (const sale of sales) {
    if (sale.status !== 1) continue;
    if (!saleMatchesStock(sale, stockRow)) continue;
    if (!sale.details || typeof sale.details !== 'object') continue;

    const details = sale.details as Record<string, unknown>;

    const compactProducts = details.products;
    if (Array.isArray(compactProducts)) {
      for (const item of compactProducts) {
        if (!item || typeof item !== 'object') continue;
        const row = item as Record<string, unknown>;
        const key =
          typeof row.key === 'string'
            ? row.key
            : typeof row.id === 'string'
              ? row.id
              : null;
        addSoldCount(sold, key ?? '', Number(row.qty ?? row.count ?? 1));
      }
      continue;
    }

    for (const category of Object.keys(details)) {
      const bucket = details[category];
      if (!bucket || typeof bucket !== 'object') continue;
      const items = Object.values(bucket as Record<string, unknown>);
      for (const product of items) {
        if (!product || typeof product !== 'object') continue;
        const row = product as Record<string, unknown>;
        const label =
          row.label && typeof row.label === 'object'
            ? (row.label as Record<string, unknown>)
            : null;
        const key =
          typeof label?.key === 'string'
            ? label.key
            : typeof row.key === 'string'
              ? row.key
              : typeof row.id === 'string'
                ? row.id
                : null;
        if (!key) continue;
        addSoldCount(sold, key, Number(row.count ?? row.qty ?? 1));
      }
    }
  }

  return sold;
}

function countSoldFromTickets(tickets: RawTicketRow[]): Map<string, number> {
  const sold = new Map<string, number>();
  for (const ticket of tickets) {
    const key = ticketProductKey(ticket);
    if (!key) continue;
    addSoldCount(sold, key, 1);
  }
  return sold;
}

function countUsedFromTickets(tickets: RawTicketRow[]): Map<string, number> {
  const used = new Map<string, number>();
  for (const ticket of tickets) {
    if (ticket.isUsed !== true) continue;
    const key = ticketProductKey(ticket);
    if (!key) continue;
    used.set(key, (used.get(key) ?? 0) + 1);
  }
  return used;
}

export function buildStockProductStats(input: {
  stockRow: RawStockRow;
  sales: RawSaleRow[];
  tickets: RawTicketRow[];
}): StockProductStat[] {
  const products = extractProductsFromStockRow(input.stockRow);
  const soldFromSales = countSoldFromSales(input.sales, input.stockRow);
  const soldFromTickets = countSoldFromTickets(input.tickets);
  const usedMap = countUsedFromTickets(input.tickets);
  const stockActive = input.stockRow.isActive !== false;

  return products.map((product) => {
    const sold =
      soldFromTickets.get(product.id) ??
      soldFromSales.get(product.id) ??
      0;
    const used = usedMap.get(product.id) ?? 0;
    const remaining = Math.max(product.stock - sold, 0);
    return {
      id: product.id,
      title: product.title,
      totalStock: product.stock,
      remaining,
      sold,
      used,
      isOnSale: stockActive && product.isActive,
    };
  });
}

async function fetchStocksForEvent(eventId: string): Promise<RawStockRow[]> {
  const qs = new URLSearchParams({
    event: eventId,
    perPage: '50',
    page: '1',
  });
  const res = await api.get<GiseListResponse<RawStockRow>>(
    `/stocks?${qs.toString()}`,
    { auth: true },
  );
  return res.data ?? [];
}

async function fetchAllListPages<T>(
  path: string,
  params: Record<string, string>,
): Promise<T[]> {
  const perPage = 500;
  let page = 1;
  const all: T[] = [];

  while (true) {
    const qs = new URLSearchParams({
      ...params,
      perPage: String(perPage),
      page: String(page),
    });
    const res = await api.get<GiseListResponse<T>>(`${path}?${qs.toString()}`, {
      auth: true,
    });
    const rows = res.data ?? [];
    all.push(...rows);
    const total = res.total ?? rows.length;
    if (page * perPage >= total || rows.length === 0) break;
    page += 1;
  }

  return all;
}

async function fetchSalesForEvent(
  eventId: string,
  stockId?: string,
): Promise<RawSaleRow[]> {
  const params: Record<string, string> = {
    sort: 'createdate',
    order: 'desc',
  };
  if (stockId) params['event.stockID'] = stockId;
  else params['event.id'] = eventId;

  return fetchAllListPages<RawSaleRow>('/sales', params);
}

async function fetchTicketsForEvent(eventId: string): Promise<RawTicketRow[]> {
  return fetchAllListPages<RawTicketRow>('/tickets', {
    'event.id': eventId,
  });
}

export async function fetchEventStockStats(
  eventId: string,
): Promise<StockProductStat[]> {
  const stocks = await fetchStocksForEvent(eventId);
  if (stocks.length === 0) return [];

  const stockRow = stocks[0];
  const [sales, tickets] = await Promise.all([
    fetchSalesForEvent(eventId, stockRow.stockID ?? stockRow.id),
    fetchTicketsForEvent(eventId),
  ]);

  return buildStockProductStats({ stockRow, sales, tickets });
}

export { fetchSalesForEvent, fetchTicketsForEvent };
