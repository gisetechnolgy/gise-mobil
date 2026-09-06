import type { EventProductItem } from './eventProducts';

export type TicketCartLine = {
  productId: string;
  title: string;
  price: number;
  quantity: number;
};

export type TicketCartSnapshot = {
  eventId: string;
  lines: TicketCartLine[];
  totalQuantity: number;
  totalPrice: number;
};

let cart: TicketCartSnapshot | null = null;

export function buildTicketCart(
  eventId: string,
  products: EventProductItem[],
  quantities: Record<string, number>,
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
    });
    totalQuantity += quantity;
    totalPrice += product.price * quantity;
  }

  return { eventId, lines, totalQuantity, totalPrice };
}

export function setTicketCart(snapshot: TicketCartSnapshot | null) {
  cart = snapshot;
}

export function getTicketCart(eventId?: string): TicketCartSnapshot | null {
  if (!cart) return null;
  if (eventId && cart.eventId !== eventId) return null;
  return cart;
}

export function clearTicketCart() {
  cart = null;
}
