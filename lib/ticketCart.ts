import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { EventProductItem } from './eventProducts';

export type TicketCartLine = {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  /** Stok grubu: general, vip, deal, ... */
  category: string | null;
  hasDownPayment?: boolean;
  downPaymentAmount?: number | null;
  /** Kapora ürünlerinde tam bilet fiyatı; price = şimdi ödenen tutar. */
  fullPrice?: number;
};

export type SeatCartItem = {
  id: string;
  productID: string;
  title: string;
  price: number;
  isPromotionSelected?: boolean;
  promotionTitle?: string | null;
};

export type AppliedCoupon = {
  code: string;
  discount: number;
};

export type TicketCartSnapshot = {
  eventId: string;
  stockID: string;
  sessionMs: number | null;
  serviceFee: number;
  mode: 'tickets' | 'seats';
  lines: TicketCartLine[];
  seats: SeatCartItem[];
  totalQuantity: number;
  totalPrice: number;
  coupon: AppliedCoupon | null;
};

const CART_KEY = 'gise.ticketCart';

let cart: TicketCartSnapshot | null = null;

function readWebCart(): TicketCartSnapshot | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TicketCartSnapshot;
    if (!parsed?.eventId || !(parsed.totalQuantity > 0)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persistCart(snapshot: TicketCartSnapshot | null) {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    try {
      if (snapshot) {
        window.localStorage.setItem(CART_KEY, JSON.stringify(snapshot));
      } else {
        window.localStorage.removeItem(CART_KEY);
      }
    } catch {
      /* ignore quota */
    }
    return;
  }
  void (async () => {
    try {
      if (snapshot) {
        await SecureStore.setItemAsync(CART_KEY, JSON.stringify(snapshot));
      } else {
        await SecureStore.deleteItemAsync(CART_KEY);
      }
    } catch {
      /* ignore */
    }
  })();
}

/** Web: sync hydrate. Native: await hydrateTicketCart(). */
if (Platform.OS === 'web') {
  cart = readWebCart();
}

export function buildTicketCart(
  eventId: string,
  products: EventProductItem[],
  quantities: Record<string, number>,
  options?: {
    stockID?: string;
    sessionMs?: number | null;
    serviceFee?: number;
  },
): TicketCartSnapshot {
  const lines: TicketCartLine[] = [];
  let totalQuantity = 0;
  let totalPrice = 0;

  for (const product of products) {
    const quantity = Math.max(0, Math.floor(quantities[product.id] ?? 0));
    if (quantity <= 0 || product.soldOut) continue;
    lines.push({
      productId: product.id,
      title: product.title,
      price: product.price,
      quantity,
      category: product.category,
      hasDownPayment: product.hasDownPayment,
      downPaymentAmount: product.downPaymentAmount,
      fullPrice: product.fullPrice,
    });
    totalQuantity += quantity;
    totalPrice += product.price * quantity;
  }

  return {
    eventId,
    stockID: options?.stockID ?? '',
    sessionMs: options?.sessionMs ?? null,
    serviceFee: options?.serviceFee ?? 0,
    mode: 'tickets',
    lines,
    seats: [],
    totalQuantity,
    totalPrice,
    coupon: null,
  };
}

export function buildSeatCart(
  eventId: string,
  seats: SeatCartItem[],
  options?: {
    stockID?: string;
    sessionMs?: number | null;
    serviceFee?: number;
  },
): TicketCartSnapshot {
  const totalPrice = seats.reduce((sum, s) => sum + s.price, 0);
  return {
    eventId,
    stockID: options?.stockID ?? '',
    sessionMs: options?.sessionMs ?? null,
    serviceFee: options?.serviceFee ?? 0,
    mode: 'seats',
    lines: [],
    seats,
    totalQuantity: seats.length,
    totalPrice,
    coupon: null,
  };
}

export function setTicketCart(snapshot: TicketCartSnapshot | null) {
  cart = snapshot;
  persistCart(snapshot);
}

export function getTicketCart(eventId?: string): TicketCartSnapshot | null {
  if (!cart && Platform.OS === 'web') {
    cart = readWebCart();
  }
  if (!cart) return null;
  if (eventId && cart.eventId !== eventId) return null;
  return cart;
}

/** Native login dönüşünde sepeti SecureStore'dan yükle. */
export async function hydrateTicketCart(
  eventId?: string,
): Promise<TicketCartSnapshot | null> {
  if (cart) {
    if (eventId && cart.eventId !== eventId) return null;
    return cart;
  }
  if (Platform.OS === 'web') {
    cart = readWebCart();
    if (eventId && cart && cart.eventId !== eventId) return null;
    return cart;
  }
  try {
    const raw = await SecureStore.getItemAsync(CART_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TicketCartSnapshot;
    if (!parsed?.eventId || !(parsed.totalQuantity > 0)) return null;
    cart = parsed;
    if (eventId && cart.eventId !== eventId) return null;
    return cart;
  } catch {
    return null;
  }
}

export function clearTicketCart() {
  cart = null;
  persistCart(null);
}

export function applyCouponToCart(
  coupon: AppliedCoupon | null,
): TicketCartSnapshot | null {
  if (!cart) return null;
  cart = { ...cart, coupon };
  persistCart(cart);
  return cart;
}

export function cartPayableTotal(snapshot: TicketCartSnapshot): number {
  const subtotal = snapshot.totalPrice;
  const fee = subtotal > 0 ? snapshot.serviceFee : 0;
  const discount = snapshot.coupon?.discount ?? 0;
  return Math.max(0, subtotal + fee - discount);
}
