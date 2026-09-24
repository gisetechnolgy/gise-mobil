import { api } from './api';
import { getAppLocale, type AppLocale } from './appLocale';
import { pickLocalizedText, toIsoDate, type GiseListResponse } from './giseMappers';

export type UserSaleItem = {
  id: string;
  ref: string;
  createdAt: string | null;
  paymentTotal: number;
  paymentType: string;
  status: number;
  eventName: string;
  sessionAt: string | null;
  category: string | null;
  couponCode: string | null;
  couponDiscount: number | null;
  tickets: { label: string; count: number }[];
  seats: { id: string; label: string }[];
};

const PAYMENT_LABELS: Record<string, { tr: string; en: string }> = {
  cc: { tr: 'Kredi Kartı', en: 'Credit Card' },
  transfer: { tr: 'Banka Transferi', en: 'Bank Transfer' },
  doorcash: { tr: 'Kapıda Ödeme', en: 'Pay at the Door' },
  cash: { tr: 'Nakit', en: 'Cash' },
  promoter: { tr: 'Promoter', en: 'Promoter' },
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function mapSale(raw: Record<string, unknown>): UserSaleItem | null {
  const id = String(raw.id ?? '');
  if (!id) return null;

  const paymentType = String(raw.paymentType ?? '');
  const paymentTotal = Number(raw.paymentTotal ?? 0);
  if (paymentType !== 'cc' || !Number.isFinite(paymentTotal) || paymentTotal === 0) {
    return null;
  }

  const event = asRecord(raw.event);
  const coupon = asRecord(raw.coupon);
  const createdAt = toIsoDate(raw.createdate ?? raw.created);

  const tickets: UserSaleItem['tickets'] = [];
  const details = asRecord(raw.details);
  if (details) {
    for (const cat of Object.values(details)) {
      const catRec = asRecord(cat);
      if (!catRec) continue;
      for (const ticket of Object.values(catRec)) {
        const t = asRecord(ticket);
        if (!t) continue;
        const labelObj = asRecord(t.label);
        const title = labelObj?.title ?? t.title ?? t.label;
        tickets.push({
          label: pickLocalizedText(title) || String(title ?? ''),
          count: Number(t.count ?? 1) || 1,
        });
      }
    }
  }

  const seats: UserSaleItem['seats'] = [];
  if (Array.isArray(raw.seats)) {
    for (const seat of raw.seats) {
      const s = asRecord(seat);
      if (!s) continue;
      const opt = asRecord(s.selectedOption);
      seats.push({
        id: String(s.id ?? ''),
        label: pickLocalizedText(opt?.title) || String(opt?.title ?? ''),
      });
    }
  }

  return {
    id,
    ref: id.slice(-5).toUpperCase(),
    createdAt,
    paymentTotal,
    paymentType,
    status: Number(raw.status ?? 0),
    eventName: event?.name != null ? String(event.name) : '',
    sessionAt: toIsoDate(event?.session),
    category: event?.category != null ? String(event.category) : null,
    couponCode:
      coupon?.code != null && String(coupon.code).trim()
        ? String(coupon.code)
        : null,
    couponDiscount:
      coupon?.discount != null && Number.isFinite(Number(coupon.discount))
        ? Number(coupon.discount)
        : null,
    tickets,
    seats,
  };
}

export function formatSalePaymentType(
  type: string,
  locale: AppLocale = getAppLocale(),
): string {
  return PAYMENT_LABELS[type]?.[locale] ?? type;
}

export function formatSaleMoney(amount: number): string {
  if (!Number.isFinite(amount)) return '0 TL';
  return `${amount} TL`;
}

export async function fetchUserSalesPage(input: {
  userId: string;
  page?: number;
  perPage?: number;
}): Promise<{ items: UserSaleItem[]; page: number; hasMore: boolean }> {
  const page = input.page ?? 1;
  const perPage = input.perPage ?? 10;
  const params = new URLSearchParams({
    page: String(page),
    perPage: String(perPage),
    sort: 'createdate',
    order: 'desc',
    'user.id': input.userId,
  });

  const res = await api.get<GiseListResponse<Record<string, unknown>>>(
    `/sales?${params.toString()}`,
    { auth: true },
  );

  const items = (res.data ?? [])
    .map((row) => mapSale(row))
    .filter((row): row is UserSaleItem => row != null);

  const total = res.total ?? 0;
  const hasMore = page * perPage < total;

  return { items, page, hasMore };
}
