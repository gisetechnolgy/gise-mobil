/**
 * Gişe Kıbrıs müşteri helpdesk widget — web ile aynı script key.
 * @see gisekibris-web HelpdeskWidget
 */
export const HELPDESK_API_BASE =
  process.env.EXPO_PUBLIC_HELPDESK_API_URL?.trim().replace(/\/$/, '') ||
  'https://api.prasolmedia.com';

export const HELPDESK_SCRIPT_KEY =
  process.env.EXPO_PUBLIC_HELPDESK_SCRIPT_KEY?.trim() ||
  'hd_05f9fbe3dfc95063d2d3378b';

export const HELPDESK_PAGE_URL = 'gisekibris-mobile://support';

export const WIDGET_LIMITS = {
  fullName: 80,
  email: 254,
  phone: 50,
  subject: 60,
  message: 500,
} as const;

export const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

export function clampWidgetText(
  value: string | undefined | null,
  max: number,
): string {
  const s = String(value ?? '').trim();
  if (s.length <= max) return s;
  return s.slice(0, max);
}
