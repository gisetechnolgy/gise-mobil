/** Gişe Kıbrıs platform ayarları — sabit venue / business id yok. */
export const APP_NAME = 'Gişe Kıbrıs';

/**
 * Web sitesi kök adresi. API'nin `WEB_URL` değeriyle aynı olmalı (banka dönüş
 * URL'leri buraya işaret eder). Build ortamında `EXPO_PUBLIC_WEB_URL` ile
 * geçersiz kılınabilir; yoksa canlı adres kullanılır.
 */
export const GISE_WEB_URL = (
  process.env.EXPO_PUBLIC_WEB_URL?.trim() || 'https://www.gisekibris.com'
).replace(/\/$/, '');
