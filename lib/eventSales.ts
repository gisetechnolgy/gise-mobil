import { api } from './api';
import { GISE_WEB_URL } from './appConfig';
import {
  GiseListResponse,
  pickLocalizedText,
} from './giseMappers';

const PAGE_SIZE = 20;

export type SaleProductLine = {
  title: string;
  count: number;
};

export type EventSaleItem = {
  id: string;
  customerName: string;
  eventName: string;
  eventCategory: string | null;
  createdAtMs: number | null;
  paymentTotal: number;
  paymentLabel: string;
  status: number | null;
  statusLabel: string;
  statusColor: string;
  listMetaLine: string;
  productLines: SaleProductLine[];
  ticketIds: string[];
};

type RawSaleRow = Record<string, unknown>;

function readUserName(user: unknown): string {
  if (!user || typeof user !== 'object') return '—';
  const row = user as Record<string, unknown>;
  const parts = [row.name, row.surname].filter(
    (p): p is string => typeof p === 'string' && !!p.trim(),
  );
  return parts.join(' ').trim() || '—';
}

function readEventName(event: unknown): string {
  if (!event || typeof event !== 'object') return 'Etkinlik';
  const row = event as Record<string, unknown>;
  return typeof row.name === 'string' && row.name.trim() ? row.name : 'Etkinlik';
}

function readEventCategory(event: unknown): string | null {
  if (!event || typeof event !== 'object') return null;
  const row = event as Record<string, unknown>;
  return typeof row.category === 'string' && row.category.trim()
    ? row.category
    : null;
}

function formatPaymentLabel(paymentType: unknown): string {
  const key = typeof paymentType === 'string' ? paymentType : '';
  switch (key) {
    case 'cc':
      return 'Kredi Kartı';
    case 'cash':
      return 'Nakit';
    case 'doorcash':
      return 'Kapıda Ödeme';
    default:
      return key ? key.toUpperCase() : '—';
  }
}

function formatSaleStatus(status: unknown): {
  label: string;
  color: string;
} {
  const value = typeof status === 'number' ? status : null;
  if (value === 1) return { label: 'Başarılı', color: '#16A34A' };
  if (value === 2) return { label: 'Başarısız', color: '#DC2626' };
  return { label: 'Beklemede', color: '#EA580C' };
}

export function formatSaleListDate(ms: number | null): string {
  if (!ms) return '—';
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function formatSaleAmount(amount: unknown): string {
  const value = Number(amount ?? 0);
  return `${new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits: 0,
  }).format(value)} TL`;
}

function extractProductLines(details: unknown): SaleProductLine[] {
  if (!details || typeof details !== 'object') return [];
  const lines: SaleProductLine[] = [];

  for (const category of Object.keys(details as object)) {
    const bucket = (details as Record<string, unknown>)[category];
    if (!bucket || typeof bucket !== 'object' || Array.isArray(bucket)) continue;

    for (const item of Object.values(bucket as Record<string, unknown>)) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      const label =
        row.label && typeof row.label === 'object'
          ? (row.label as Record<string, unknown>)
          : null;
      const title =
        pickLocalizedText(label?.title) ||
        pickLocalizedText(label?.description) ||
        'Bilet';
      lines.push({
        title,
        count: Number(row.count ?? 1),
      });
    }
  }

  return lines;
}

function readTicketIds(raw: RawSaleRow): string[] {
  if (!Array.isArray(raw.tickets)) return [];
  return raw.tickets
    .map((ticket) => {
      if (typeof ticket === 'string' && ticket.trim()) return ticket.trim();
      if (ticket && typeof ticket === 'object') {
        const row = ticket as Record<string, unknown>;
        if (typeof row.id === 'string' && row.id.trim()) return row.id.trim();
        if (typeof row.pnr === 'string' && row.pnr.trim()) return row.pnr.trim();
      }
      return null;
    })
    .filter((id): id is string => !!id);
}

export function mapEventSaleRecord(raw: RawSaleRow): EventSaleItem {
  const createdAtMs =
    typeof raw.createdate === 'number'
      ? raw.createdate
      : typeof raw.createdateMs === 'number'
        ? raw.createdateMs
        : null;
  const paymentLabel = formatPaymentLabel(raw.paymentType);
  const paymentTotal = Number(raw.paymentTotal ?? 0);
  const statusInfo = formatSaleStatus(raw.status);
  const dateText = formatSaleListDate(createdAtMs);

  return {
    id: String(raw.id ?? ''),
    customerName: readUserName(raw.user),
    eventName: readEventName(raw.event),
    eventCategory: readEventCategory(raw.event),
    createdAtMs,
    paymentTotal,
    paymentLabel,
    status: typeof raw.status === 'number' ? raw.status : null,
    statusLabel: statusInfo.label,
    statusColor: statusInfo.color,
    listMetaLine: `${dateText} | ${formatSaleAmount(paymentTotal)} | ${paymentLabel}`,
    productLines: extractProductLines(raw.details),
    ticketIds: readTicketIds(raw),
  };
}

export async function fetchEventSalesPage(
  eventId: string,
  page = 1,
): Promise<{ items: EventSaleItem[]; hasMore: boolean; page: number }> {
  const qs = new URLSearchParams({
    'event.id': eventId,
    sort: 'createdate',
    order: 'desc',
    page: String(page),
    perPage: String(PAGE_SIZE),
  });

  const res = await api.get<GiseListResponse<RawSaleRow>>(
    `/sales?${qs.toString()}`,
    { auth: true },
  );

  const items = (res.data ?? []).map(mapEventSaleRecord);
  const total = res.total ?? items.length;
  const hasMore = page * PAGE_SIZE < total;

  return { items, hasMore, page };
}

function ticketShareId(raw: Record<string, unknown>): string {
  if (typeof raw.pnr === 'string' && raw.pnr.trim()) return raw.pnr.trim();
  if (typeof raw.id === 'string' && raw.id.trim()) return raw.id.trim();
  return '';
}

function ticketShareLabel(raw: Record<string, unknown>): string {
  const product =
    raw.product && typeof raw.product === 'object'
      ? (raw.product as Record<string, unknown>)
      : null;
  if (product) {
    const label = pickLocalizedText(product.title) || pickLocalizedText(product.description);
    if (label) return label;
  }
  const seats = Array.isArray(raw.seats) ? raw.seats : [];
  if (seats.length > 0) return `${seats.length} koltuk`;
  return 'Bilet';
}

async function fetchTicketShareRows(
  ticketIds: string[],
  fallbackLines: SaleProductLine[],
): Promise<Array<{ label: string; url: string }>> {
  if (ticketIds.length === 0) {
    return fallbackLines.flatMap((line) =>
      Array.from({ length: line.count }).map(() => ({
        label: line.title,
        url: '',
      })),
    );
  }

  const rows = await Promise.all(
    ticketIds.map(async (ticketId) => {
      try {
        const raw = await api.get<Record<string, unknown>>(
          `/tickets/${encodeURIComponent(ticketId)}`,
          { auth: true },
        );
        const shareId = ticketShareId(raw) || ticketId;
        return {
          label: ticketShareLabel(raw),
          url: `${GISE_WEB_URL}/etkinlik-bileti/${shareId}`,
        };
      } catch {
        return {
          label: fallbackLines[0]?.title ?? 'Bilet',
          url: `${GISE_WEB_URL}/etkinlik-bileti/${ticketId}`,
        };
      }
    }),
  );

  return rows;
}

export async function buildSaleShareText(sale: EventSaleItem): Promise<string> {
  const ticketRows = await fetchTicketShareRows(sale.ticketIds, sale.productLines);

  const lines = [
    `Etkinlik: ${sale.eventName}`,
    `Musteri: ${sale.customerName}`,
    '',
    'Biletler:',
  ];

  ticketRows.forEach((row, index) => {
    lines.push(`${index + 1}- ${row.title}: `);
    if (row.url) lines.push(row.url);
    lines.push('');
  });

  return lines.join('\n').trim();
}

export { PAGE_SIZE as EVENT_SALES_PAGE_SIZE };
