import { api, PAYMENT_TIMEOUT_MS } from './api';

export type GarantiCardFieldNames = {
  cardNumber: string;
  cardExpireMonth: string;
  cardExpireYear: string;
  cardCvv: string;
  cardHolder: string;
};

export type Garanti3dInitResponse = {
  action: string;
  method?: string;
  fields: Record<string, string>;
  /** Bankaya gönderilecek kart alanlarının adları (kart verisi API'ye gitmez). */
  cardFieldNames?: GarantiCardFieldNames;
  testMode?: boolean;
};

export type GarantiCardInput = {
  cardNumber: string;
  cardHolder: string;
  cardCvv: string;
  cardExpireMonth: string;
  cardExpireYear: string;
};

const DEFAULT_CARD_FIELD_NAMES: GarantiCardFieldNames = {
  cardNumber: 'cardnumber',
  cardExpireMonth: 'cardexpiredatemonth',
  cardExpireYear: 'cardexpiredateyear',
  cardCvv: 'cardcvv2',
  cardHolder: 'cardholdername',
};

/**
 * API'den gelen hash'li alanlara kart alanlarını ekler.
 * Kart verisi yalnızca cihaz → banka (WebView form POST) yönünde gider.
 */
export function buildGarantiFormFields(
  init: Garanti3dInitResponse,
  card: GarantiCardInput,
): Record<string, string> {
  const names = init.cardFieldNames ?? DEFAULT_CARD_FIELD_NAMES;
  const year = String(card.cardExpireYear ?? '').trim();
  return {
    ...(init.fields ?? {}),
    [names.cardNumber]: String(card.cardNumber ?? '').replace(/\s/g, ''),
    [names.cardExpireMonth]: String(card.cardExpireMonth ?? '').padStart(2, '0'),
    [names.cardExpireYear]: year.length > 2 ? year.slice(-2) : year,
    [names.cardCvv]: String(card.cardCvv ?? '').trim(),
    [names.cardHolder]: String(card.cardHolder ?? '').trim(),
  };
}

export async function createSale(payload: Record<string, unknown>): Promise<string> {
  const res = await api.post<{ id?: string }>('/sales', payload, { auth: true });
  const id = res?.id;
  if (!id) throw new Error('Satış oluşturulamadı');
  return id;
}

export async function createPayment(
  payload: Record<string, unknown>,
): Promise<string> {
  const res = await api.post<{ id?: string }>('/payments', payload, {
    auth: true,
  });
  const id = res?.id;
  if (!id) throw new Error('Ödeme kaydı oluşturulamadı');
  return id;
}

export async function linkSalePayment(params: {
  saleId: string;
  paymentId: string;
}): Promise<void> {
  await api.put(
    `/sales/${encodeURIComponent(params.saleId)}`,
    { payment: { id: params.paymentId, type: 'cc' } },
    { auth: true },
  );
}

/**
 * 3D init: sunucu yalnızca hash'li form alanlarını üretir. Kart bilgisi
 * gönderilmez (PCI); customerIp sunucuda istekten alınır.
 */
export async function initGaranti3dPayment(params: {
  saleId: string;
  paymentId: string;
  customerEmail: string;
  returnChannel?: 'web' | 'mobile';
}): Promise<Garanti3dInitResponse> {
  return api.post<Garanti3dInitResponse>(
    '/payments/garanti/3d-init',
    {
      saleId: params.saleId,
      paymentId: params.paymentId,
      customerEmail: params.customerEmail,
      returnChannel: params.returnChannel ?? 'mobile',
    },
    { auth: true, timeoutMs: PAYMENT_TIMEOUT_MS },
  );
}

export async function finalizeLocalSale(saleId: string): Promise<void> {
  await api.post(
    '/payments/finalize-local',
    { saleId },
    { auth: true, timeoutMs: PAYMENT_TIMEOUT_MS },
  );
}

export async function fetchSaleById(
  saleId: string,
): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>(
    `/sales/${encodeURIComponent(saleId)}`,
    { auth: true },
  );
}

export async function fetchPaymentById(
  paymentId: string,
): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>(
    `/payments/${encodeURIComponent(paymentId)}`,
    { auth: true },
  );
}

/** Satışa bağlı payment id (sale.payment string veya { id }). */
export function paymentIdOfSale(sale: Record<string, unknown>): string | null {
  const ref = sale?.payment;
  if (typeof ref === 'string' && ref.trim()) return ref.trim();
  if (ref && typeof ref === 'object') {
    const id = (ref as { id?: unknown }).id;
    if (typeof id === 'string' && id.trim()) return id.trim();
  }
  return null;
}

/** Başarısız ödemenin banka/sunucu hata mesajı (transaction.errmsg). */
export async function fetchPaymentErrorMessage(
  sale: Record<string, unknown>,
): Promise<string | null> {
  const paymentId = paymentIdOfSale(sale);
  if (!paymentId) return null;
  try {
    const payment = await fetchPaymentById(paymentId);
    const txn = (payment?.transaction ?? {}) as Record<string, unknown>;
    const msg = txn.errmsg ?? txn.mderrormessage ?? txn.message;
    return typeof msg === 'string' && msg.trim() ? msg.trim() : null;
  } catch {
    return null;
  }
}
