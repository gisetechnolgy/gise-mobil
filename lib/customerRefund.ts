import { api } from './api';

export type RefundEligibleItem = {
  groupKey: string;
  productId: string;
  available: number;
  title: string;
  price: number;
  inRefundProcess?: boolean;
  refundable?: boolean;
};

export type RefundEligibleResponse = {
  saleId: string;
  eventId: string;
  eventName?: string;
  items: RefundEligibleItem[];
  itemsInProcess: RefundEligibleItem[];
  itemsNotRefundable: RefundEligibleItem[];
  pendingRefund: unknown | null;
};

export type CustomerRefundItem = {
  groupKey: string;
  productId: string;
  count: number;
};

export type CustomerRefundResult = {
  ok?: boolean;
  status?: string;
  message?: string;
  refundRequestId?: string;
};

/** Backend: etkinlik iade açık mı + son tarih + ürün refundable kontrolü burada. */
export async function fetchRefundEligibleItems(
  saleId: string,
): Promise<RefundEligibleResponse> {
  const data = await api.get<RefundEligibleResponse>(
    `/sales/${encodeURIComponent(saleId)}/refund-eligible`,
    { auth: true },
  );
  return {
    saleId: String(data?.saleId ?? saleId),
    eventId: String(data?.eventId ?? ''),
    eventName: data?.eventName != null ? String(data.eventName) : undefined,
    items: Array.isArray(data?.items) ? data.items : [],
    itemsInProcess: Array.isArray(data?.itemsInProcess)
      ? data.itemsInProcess
      : [],
    itemsNotRefundable: Array.isArray(data?.itemsNotRefundable)
      ? data.itemsNotRefundable
      : [],
    pendingRefund: data?.pendingRefund ?? null,
  };
}

export async function submitCustomerRefund(
  saleId: string,
  items: CustomerRefundItem[],
): Promise<CustomerRefundResult> {
  return api.post<CustomerRefundResult>(
    `/sales/${encodeURIComponent(saleId)}/customer-refund`,
    { items },
    { auth: true },
  );
}
