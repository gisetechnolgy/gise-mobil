/**
 * Tab bar görünürlüğü — iç/detay sayfalarında gizle, listelerde göster.
 */
const AUTH_ROUTES = new Set([
  'login',
  'register',
  'verify-email',
  'forgot-password',
  'sso',
]);

export function shouldShowAppTabBar(
  pathname: string,
  segments: string[] = [],
): boolean {
  if (segments[0] === '(auth)' || segments.includes('(auth)')) return false;

  const path = (pathname || '/').split('?')[0];
  const parts = path.split('/').filter(Boolean);

  if (parts[0] && AUTH_ROUTES.has(parts[0])) return false;

  // Admin iç sayfaları (hub dışındaki stack)
  if (parts[0] === 'admin') return false;

  // Hesap formları
  if (parts[0] === 'account') return false;

  // Modal / force flows
  if (parts[0] === 'modal') return false;

  // Etkinlik: /events → liste (göster); /events/:id|buy|payment|seats → gizle
  if (parts[0] === 'events' && parts.length > 1) return false;

  // Mekan / şirket / haber detay
  if (parts[0] === 'venues' && parts.length > 1) return false;
  if (parts[0] === 'companies' && parts.length > 1) return false;
  if (parts[0] === 'news' && parts.length > 1) return false;

  return true;
}

function pathParts(pathname: string): string[] {
  return (pathname || '/')
    .split('?')[0]
    .split('/')
    .filter(Boolean);
}

export function resolveConsumerActiveTab(
  pathname: string,
  segments: string[] = [],
): 'index' | 'events' | 'support' | 'profile' | null {
  // Expo Router: group segment'leri pathname'de olmayabilir — segments daha güvenilir
  if (segments[0] === '(tabs)') {
    const tab = segments[1];
    if (!tab || tab === 'index') return 'index';
    if (tab === 'events' || tab === 'support' || tab === 'profile') return tab;
  }

  const parts = pathParts(pathname);

  if (parts.includes('(tabs)')) {
    const idx = parts.indexOf('(tabs)');
    const tab = parts[idx + 1];
    if (!tab || tab === 'index') return 'index';
    if (tab === 'events' || tab === 'support' || tab === 'profile') return tab;
  }

  if (parts.length === 0 || parts[0] === 'index') return 'index';
  if (parts[0] === 'events' && parts.length === 1) return 'events';
  if (parts[0] === 'support') return 'support';
  if (parts[0] === 'profile') return 'profile';

  return null;
}

export function resolveAdminActiveTab(
  pathname: string,
  segments: string[] = [],
): 'events' | 'scan' | 'profile' | null {
  if (segments[0] === '(admin-tabs)') {
    const tab = segments[1];
    if (tab === 'events' || tab === 'scan' || tab === 'profile') return tab;
    // /(admin-tabs) kökü → etkinlikler
    return 'events';
  }

  const parts = pathParts(pathname);

  if (parts.includes('(admin-tabs)')) {
    const idx = parts.indexOf('(admin-tabs)');
    const tab = parts[idx + 1];
    if (tab === 'events' || tab === 'scan' || tab === 'profile') return tab;
    return 'events';
  }

  // Pathname group'suz gelir: /events, /scan, /profile
  if (parts[0] === 'scan') return 'scan';
  if (parts[0] === 'profile') return 'profile';
  if (parts[0] === 'events' && parts.length === 1) return 'events';

  return null;
}
