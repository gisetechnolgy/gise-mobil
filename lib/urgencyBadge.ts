import { getAppLocale, type AppLocale } from './appLocale';
import { api } from './api';
import type { GiseListResponse } from './giseMappers';

export type UrgencySettings = {
  daysEnabled?: boolean;
  daysThreshold?: number;
  hoursEnabled?: boolean;
  hoursThreshold?: number;
  ticketsEnabled?: boolean;
  ticketsThreshold?: number;
};

export type EventCardBadge = {
  label: { tr: string; en: string };
  textColor: string;
  backgroundColor: string;
  displayLabel: string;
};

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;

const MAX_HOURS_THRESHOLD = 128;
const MAX_DAYS_THRESHOLD = 90;
const MAX_TICKETS_THRESHOLD = 1000;

const URGENCY_COLORS = {
  backgroundColor: 'C62828',
  textColor: 'FFFFFF',
};

const STOCK_CATEGORIES = [
  'general',
  'vip',
  'deal',
  'extras',
  'guestlist',
  'invitation',
] as const;

function toStartMs(startsAt?: string | null): number | null {
  if (!startsAt) return null;
  const d = new Date(startsAt);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function normalizeUrgency(raw: unknown): Required<{
  daysEnabled: boolean;
  daysThreshold: number;
  hoursEnabled: boolean;
  hoursThreshold: number;
  ticketsEnabled: boolean;
  ticketsThreshold: number;
}> | null {
  if (!raw || typeof raw !== 'object') return null;
  const u = raw as UrgencySettings;
  const asBool = (v: unknown) =>
    v === true || v === 'true' || v === 1 || v === '1';
  const asThreshold = (v: unknown, max: number) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return clampInt(n, 1, max);
  };
  const normalized = {
    daysEnabled: asBool(u.daysEnabled),
    daysThreshold: asThreshold(u.daysThreshold, MAX_DAYS_THRESHOLD),
    hoursEnabled: asBool(u.hoursEnabled),
    hoursThreshold: asThreshold(u.hoursThreshold, MAX_HOURS_THRESHOLD),
    ticketsEnabled: asBool(u.ticketsEnabled),
    ticketsThreshold: asThreshold(u.ticketsThreshold, MAX_TICKETS_THRESHOLD),
  };
  if (
    !normalized.daysEnabled &&
    !normalized.hoursEnabled &&
    !normalized.ticketsEnabled
  ) {
    return null;
  }
  return normalized;
}

export function getRemainingTicketsFromStock(stockData: unknown): number {
  let remaining = 0;
  const visit = (item: unknown) => {
    if (!item || typeof item !== 'object') return;
    const row = item as Record<string, unknown>;
    const status =
      row.status == null || row.status === '' ? null : Number(row.status);
    if (status === 2) return;
    const stock = Number(row.stock ?? row.quantity ?? 0);
    const sold = Number(row.sold ?? 0);
    if (!Number.isFinite(stock)) return;
    remaining += Math.max(0, stock - (Number.isFinite(sold) ? sold : 0));
  };

  if (Array.isArray(stockData)) {
    // Koltuklu etkinlik stogu dizi olarak gelir
    stockData.forEach(visit);
    return remaining;
  }
  if (stockData && typeof stockData === 'object') {
    const obj = stockData as Record<string, unknown>;
    let walkedKnown = false;
    for (const category of STOCK_CATEGORIES) {
      const items = obj[category];
      if (Array.isArray(items)) {
        items.forEach(visit);
        walkedKnown = true;
      }
    }
    if (!walkedKnown) {
      Object.values(obj).forEach((group) => {
        if (Array.isArray(group)) group.forEach(visit);
        else if (group && typeof group === 'object') visit(group);
      });
    }
  }
  return remaining;
}

export async function fetchEventRemainingTickets(
  eventId: string,
): Promise<number | null> {
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
    let total = 0;
    let found = false;
    for (const row of rows) {
      total += getRemainingTicketsFromStock(row.stock);
      found = true;
    }
    return found ? total : null;
  } catch {
    return null;
  }
}

export function resolveUrgencyBadge(
  input: {
    urgency?: unknown;
    startsAt?: string | null;
    remainingTickets?: number | null;
  },
  options?: { now?: number; locale?: AppLocale },
): EventCardBadge | null {
  const urgency = normalizeUrgency(input.urgency);
  if (!urgency) return null;

  const locale = options?.locale ?? getAppLocale();
  const now = options?.now ?? Date.now();
  const startMs = toStartMs(input.startsAt);

  const make = (tr: string, en: string): EventCardBadge => ({
    label: { tr, en },
    displayLabel: locale === 'en' ? en : tr,
    ...URGENCY_COLORS,
  });

  let hoursLeft: number | null = null;
  let daysLeft: number | null = null;
  if (startMs != null && startMs > now) {
    const msLeft = startMs - now;
    hoursLeft = Math.max(1, Math.ceil(msLeft / MS_HOUR));
    daysLeft = Math.max(1, Math.ceil(msLeft / MS_DAY));
  }

  // 1) Saat
  if (
    urgency.hoursEnabled &&
    urgency.hoursThreshold > 0 &&
    hoursLeft != null &&
    hoursLeft <= urgency.hoursThreshold
  ) {
    return make(`Son ${hoursLeft} saat`, `Last ${hoursLeft} hours`);
  }

  // 2) Bilet
  if (urgency.ticketsEnabled && urgency.ticketsThreshold > 0) {
    const remaining = Number(input.remainingTickets);
    if (
      Number.isFinite(remaining) &&
      remaining > 0 &&
      remaining <= urgency.ticketsThreshold
    ) {
      return make(`Son ${remaining} bilet`, `Last ${remaining} tickets`);
    }
  }

  // 3) Gun
  if (
    urgency.daysEnabled &&
    urgency.daysThreshold > 0 &&
    daysLeft != null &&
    daysLeft <= urgency.daysThreshold
  ) {
    return make(`Son ${daysLeft} gün`, `Last ${daysLeft} days`);
  }

  return null;
}

export function resolveEventCardBadge(
  input: {
    urgency?: unknown;
    startsAt?: string | null;
    remainingTickets?: number | null;
    badge?: {
      label?: { tr?: string; en?: string } | string;
      textColor?: string;
      backgroundColor?: string;
    } | null;
  },
  options?: { now?: number; locale?: AppLocale },
): EventCardBadge | null {
  const urgency = resolveUrgencyBadge(input, options);
  if (urgency) return urgency;

  const badge = input.badge;
  if (!badge?.label) return null;
  const locale = options?.locale ?? getAppLocale();
  const label = badge.label;
  const displayLabel =
    typeof label === 'string'
      ? label
      : locale === 'en'
        ? label.en || label.tr || ''
        : label.tr || label.en || '';
  if (!displayLabel) return null;
  return {
    label:
      typeof label === 'string'
        ? { tr: label, en: label }
        : { tr: label.tr || '', en: label.en || '' },
    displayLabel,
    textColor: badge.textColor || 'FFFFFF',
    backgroundColor: badge.backgroundColor || 'AE256D',
  };
}
