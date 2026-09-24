import type { AuthUser } from './authTypes';
import type { EventItem } from './events';
import type { EventStockContext } from './eventStock';
import { api } from './api';
import {
  buildGarantiFormFields,
  createPayment,
  createSale,
  fetchSaleById,
  finalizeLocalSale,
  initGaranti3dPayment,
  linkSalePayment,
  type Garanti3dInitResponse,
} from './payments';
import {
  cartPayableTotal,
  type AppliedCoupon,
  type TicketCartSnapshot,
} from './ticketCart';

export type EventCoupon = {
  code: string;
  discount: number;
  stock: number;
  used: number;
  activeUntil: string | null;
};

export type EventCheckoutMeta = {
  servicefee: number;
  commissionFee: number;
  isCommissionExtra: boolean;
  organisationCompanies: string[];
  subcategory: string | null;
  subcategories: string[];
  coupons: EventCoupon[];
  layoutJSONID: string | null;
  type: number | null;
  /** Etkinliğin izin verdiği ödeme yöntemleri (küçük harf); boşsa yalnızca cc. */
  paymentMethods: string[];
  isActive: boolean;
};

export type CheckoutPaymentMethod = 'cc' | 'doorcash';

/** Kapıda ödeme: etkinlik izin veriyor + kapora satırı yok + tutar > 0. */
export function canPayAtDoor(
  meta: EventCheckoutMeta | null | undefined,
  cart: TicketCartSnapshot | null | undefined,
): boolean {
  if (!meta || !cart) return false;
  if (!meta.paymentMethods.includes('doorcash')) return false;
  if (cart.mode === 'seats') return false;
  if (cart.totalPrice <= 0) return false;
  if (cart.lines.some((l) => l.hasDownPayment)) return false;
  return true;
}

function mapCoupons(raw: unknown): EventCoupon[] {
  if (!Array.isArray(raw)) return [];
  const now = Date.now();
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const c = entry as Record<string, unknown>;
      const code = String(c.code ?? '').trim();
      if (!code) return null;
      const stock = Number(c.stock ?? 0);
      const used = Number(c.used ?? 0);
      const activeUntil =
        c.activeUntil != null ? String(c.activeUntil).slice(0, 10) : null;
      if (!(stock > 0) || used >= stock) return null;
      if (activeUntil) {
        const endMs = Date.parse(`${activeUntil}T23:59:59`);
        if (Number.isFinite(endMs) && endMs < now) return null;
      }
      const discount = Number(c.discount ?? 0);
      if (!(discount > 0)) return null;
      return { code, discount, stock, used, activeUntil };
    })
    .filter((c): c is EventCoupon => !!c);
}

export async function fetchEventCheckoutMeta(
  eventId: string,
): Promise<EventCheckoutMeta> {
  const raw = await api.get<Record<string, unknown>>(
    `/events/${encodeURIComponent(eventId)}`,
  );
  const typeNum = Number(raw.type);
  return {
    servicefee: Number(raw.servicefee ?? 0) || 0,
    commissionFee: Number(raw.commissionFee ?? 0) || 0,
    isCommissionExtra: raw.isCommissionExtra === true,
    organisationCompanies: Array.isArray(raw.organisationCompanies)
      ? raw.organisationCompanies.map(String)
      : [],
    subcategory: raw.subcategory != null ? String(raw.subcategory) : null,
    subcategories: Array.isArray(raw.subcategories)
      ? raw.subcategories.map(String)
      : [],
    coupons: mapCoupons(raw.coupons),
    layoutJSONID:
      typeof raw.layoutJSONID === 'string' ? raw.layoutJSONID : null,
    type: Number.isFinite(typeNum) ? typeNum : null,
    paymentMethods: Array.isArray(raw.paymentMethods)
      ? raw.paymentMethods.map((m) => String(m).toLowerCase())
      : [],
    isActive: raw.isActive !== false && raw.isCancelled !== true,
  };
}

export function resolveCoupon(
  meta: EventCheckoutMeta,
  code: string,
): AppliedCoupon | null {
  const needle = code.trim().toLowerCase();
  if (!needle) return null;
  const found = meta.coupons.find((c) => c.code.toLowerCase() === needle);
  if (!found) return null;
  return { code: found.code, discount: found.discount };
}

function buildSaleDetails(cart: TicketCartSnapshot): Record<string, unknown> | undefined {
  if (cart.mode === 'seats' || cart.lines.length === 0) return undefined;
  const details: Record<string, unknown> = {};
  for (const line of cart.lines) {
    const groupKey = line.category || 'general';
    if (!details[groupKey]) details[groupKey] = {};
    const bucket = details[groupKey] as Record<string, unknown>;
    bucket[line.productId] = {
      count: line.quantity,
      label: {
        title: { tr: line.title, en: line.title },
        description: { tr: '', en: '' },
        type: groupKey,
        key: line.productId,
        price: line.price,
        hasDownPayment: line.hasDownPayment ?? false,
        downPaymentAmount: line.downPaymentAmount ?? null,
      },
    };
  }
  return details;
}

function buildSaleSeats(cart: TicketCartSnapshot): unknown[] | undefined {
  if (cart.mode !== 'seats' || cart.seats.length === 0) return undefined;
  return cart.seats.map((s) => ({
    id: s.id,
    productID: s.productID,
    selectedOption: {
      price: s.price,
      title: s.isPromotionSelected
        ? { tr: s.promotionTitle ?? s.title, en: s.promotionTitle ?? s.title }
        : { tr: s.title, en: s.title },
      isPromotionSelected: !!s.isPromotionSelected,
    },
  }));
}

function splitFullName(fullName: string): { name: string; surname: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { name: '', surname: '' };
  if (parts.length === 1) return { name: parts[0], surname: '' };
  return { name: parts[0], surname: parts.slice(1).join(' ') };
}

function buildSalePayload(params: {
  user: AuthUser;
  event: EventItem;
  meta: EventCheckoutMeta;
  stock: EventStockContext;
  cart: TicketCartSnapshot;
  paymentType: string;
  paymentTotal: number;
}): Record<string, unknown> {
  const now = Date.now();
  const { name, surname } = splitFullName(params.user.fullName ?? '');
  const payload: Record<string, unknown> = {
    user: {
      id: params.user.id,
      name,
      surname,
      gender: '',
      city: '',
      email: params.user.email ?? '',
      mobile: params.user.phoneNumber ?? '',
    },
    status: 0,
    createdate: now,
    paymentType: params.paymentType,
    paymentTotal: params.paymentTotal,
    channel: 'm',
    event: {
      id: params.event.id,
      name: params.event.title ?? '',
      city: params.event.city ?? '',
      category: params.event.category ?? '',
      subcategory: params.meta.subcategory ?? '',
      subcategories: params.meta.subcategories ?? [],
      venue: params.event.venueId ?? '',
      organisationCompanies: params.meta.organisationCompanies.length
        ? params.meta.organisationCompanies
        : null,
      stockID: params.stock.stockID,
      session: params.stock.sessionMs,
    },
  };

  const details = buildSaleDetails(params.cart);
  if (details) payload.details = details;
  const seats = buildSaleSeats(params.cart);
  if (seats) payload.seats = seats;

  if (params.cart.coupon?.code) {
    payload.coupon = {
      code: params.cart.coupon.code,
      discount: params.cart.coupon.discount,
    };
  }

  return payload;
}

export type CardCheckoutInput = {
  cardHolder: string;
  cardNumber: string;
  cardCvv: string;
  cardExpireMonth: string;
  cardExpireYear: string;
};

export type CheckoutStartResult =
  | { kind: 'local'; saleId: string }
  | { kind: 'cancelled'; saleId: string }
  | { kind: 'garanti'; saleId: string; paymentId: string; init: Garanti3dInitResponse };

export class CheckoutCancelledError extends Error {
  constructor(public readonly saleId: string) {
    super('Checkout cancelled');
    this.name = 'CheckoutCancelledError';
  }
}

/** Sunucunun hesapladığı paymentTotal (GET /sales/:id). */
async function readServerTotal(saleId: string): Promise<number | null> {
  try {
    const sale = await fetchSaleById(saleId);
    const total = Number(sale?.paymentTotal);
    return Number.isFinite(total) ? total : null;
  } catch {
    return null;
  }
}

/**
 * Sale + payment oluşturur.
 * - ücretsiz → finalize-local
 * - doorcash → finalize-local (rezervasyon, ödeme kapıda)
 * - cc → 3D init döner (kart alanları cihazda forma eklenir)
 * Sunucu tutarı ekrandakinden farklıysa `confirmTotal` ile kullanıcıya sorulur.
 */
export async function startEventCheckout(params: {
  user: AuthUser;
  event: EventItem;
  meta: EventCheckoutMeta;
  stock: EventStockContext;
  cart: TicketCartSnapshot;
  card?: CardCheckoutInput;
  paymentMethod?: CheckoutPaymentMethod;
  confirmTotal?: (serverTotal: number, clientTotal: number) => Promise<boolean>;
}): Promise<CheckoutStartResult> {
  const method: CheckoutPaymentMethod = params.paymentMethod ?? 'cc';
  const cart: TicketCartSnapshot =
    method === 'doorcash' ? { ...params.cart, coupon: null } : params.cart;

  const paymentTotal = cartPayableTotal({
    ...cart,
    serviceFee:
      cart.totalPrice > 0
        ? Number(params.meta.servicefee ?? cart.serviceFee ?? 0)
        : 0,
  });

  const salePayload = buildSalePayload({
    user: params.user,
    event: params.event,
    meta: params.meta,
    stock: params.stock,
    cart,
    paymentType: paymentTotal <= 0 ? 'guest' : method,
    paymentTotal,
  });

  const saleId = await createSale(salePayload);

  // Sunucu fiyatı client hesabından farklıysa (stok fiyatı değişmiş, kupon düşmüş) onay al.
  const serverTotal = await readServerTotal(saleId);
  const effectiveTotal = serverTotal ?? paymentTotal;
  if (
    serverTotal != null &&
    Math.abs(serverTotal - paymentTotal) >= 0.01 &&
    params.confirmTotal
  ) {
    const ok = await params.confirmTotal(serverTotal, paymentTotal);
    if (!ok) throw new CheckoutCancelledError(saleId);
  }

  if (effectiveTotal <= 0 || method === 'doorcash') {
    await finalizeLocalSale(saleId);
    return { kind: 'local', saleId };
  }

  if (!params.card) {
    throw new Error('Kart bilgileri gerekli');
  }

  const paymentId = await createPayment({
    transaction: { type: 'cc' },
    status: 0,
    total: effectiveTotal,
    createdate: Date.now(),
    paymentType: 'event',
    user: params.user.id,
    sale: saleId,
    event: {
      id: params.event.id,
      name: params.event.title ?? '',
      venue: params.event.venueId ?? '',
      organisationCompanies: params.meta.organisationCompanies.length
        ? params.meta.organisationCompanies
        : null,
      stockID: params.stock.stockID,
    },
    ...(cart.coupon
      ? {
          coupon: {
            code: cart.coupon.code,
            discount: cart.coupon.discount,
          },
        }
      : {}),
  });

  await linkSalePayment({ saleId, paymentId });

  // Kart verisi API'ye gitmez; sunucudan gelen hash'li alanlara cihazda eklenir
  // ve WebView içinden doğrudan bankaya POST edilir.
  const serverInit = await initGaranti3dPayment({
    saleId,
    paymentId,
    customerEmail: params.user.email ?? '',
    returnChannel: 'mobile',
  });

  const init: Garanti3dInitResponse = {
    ...serverInit,
    fields: buildGarantiFormFields(serverInit, params.card),
  };

  return { kind: 'garanti', saleId, paymentId, init };
}
