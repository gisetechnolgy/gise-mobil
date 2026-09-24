/** Garanti gt3dengine için otomatik POST HTML (WebView). */
export function buildGaranti3dPostHtml(params: {
  action: string;
  fields: Record<string, string>;
}): string {
  const inputs = Object.entries(params.fields ?? {})
    .map(([name, value]) => {
      const safeName = escapeHtml(name);
      const safeValue = escapeHtml(String(value ?? ''));
      return `<input type="hidden" name="${safeName}" value="${safeValue}" />`;
    })
    .join('\n');

  const action = escapeHtml(params.action);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>3D Secure</title></head>
<body onload="document.forms[0].submit()">
<form method="POST" action="${action}">
${inputs}
<noscript><p>Devam etmek için gönder'e basın.</p><button type="submit">Devam</button></noscript>
</form>
</body></html>`;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Kullanıcıya gösterilecek nihai dönüş URL'si mi?
 *
 * ÖNEMLİ: `/payments/garanti/callback` BURAYA GİRMEZ.
 * Banka 3D sonrası o URL'ye POST atar; WebView bunu "bitti" sanıp iptal ederse
 * API hiç callback almaz → status 0 kalır, cron'a (callback-missed) düşer.
 * Callback'in sunucuda işlenmesine izin ver; sonra gelen deep link / özet URL'sini yakala.
 */
export function isPaymentReturnUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (lower.includes('/payments/garanti/callback')) return false;
  return (
    lower.includes('odeme-ozeti') ||
    lower.includes('events/payment/result') ||
    lower.startsWith('cocobongoloyalty:')
  );
}

/** Bankanın success/error POST hedefi — WebView'da yüklenmesine izin verilmeli. */
export function isGarantiCallbackUrl(url: string): boolean {
  if (!url) return false;
  return url.toLowerCase().includes('/payments/garanti/callback');
}

export type PaymentReturnInfo = {
  saleId: string;
  /** API'nin eklediği hata kodu (bank-declined, amount-mismatch, invalid-hash ...) */
  err: string | null;
  /** 'pending' → banka teyidi bekleniyor (callback geldi, sorgu ağ hatası verdi) */
  verify: string | null;
};

function readQueryParam(url: string, names: string[]): string | null {
  try {
    // Custom scheme: cocobongoloyalty://events/payment/result?sid=
    const normalized = url.includes('://')
      ? url.replace(/^([a-z][a-z0-9+.-]*):\/\//i, 'https://')
      : url;
    const parsed = new URL(normalized);
    for (const n of names) {
      const v = parsed.searchParams.get(n);
      if (v?.trim()) return v.trim();
    }
  } catch {
    /* fallthrough */
  }
  for (const n of names) {
    const m = url.match(new RegExp(`[?&]${n}=([^&#]+)`, 'i'));
    if (m?.[1]) {
      try {
        return decodeURIComponent(m[1]);
      } catch {
        return m[1];
      }
    }
  }
  return null;
}

/** Banka dönüşü / deep link / web özet URL'sinden sale id çıkarır (sid veya saleId). */
export function extractSaleIdFromPaymentUrl(url: string): string | null {
  return readQueryParam(url, ['sid', 'saleId']);
}

/** Dönüş URL'sindeki tüm sonuç bilgisi (sale id + err + verify). */
export function extractPaymentReturnInfo(url: string): PaymentReturnInfo | null {
  const saleId = extractSaleIdFromPaymentUrl(url);
  if (!saleId) return null;
  return {
    saleId,
    err: readQueryParam(url, ['err']),
    verify: readQueryParam(url, ['verify']),
  };
}
