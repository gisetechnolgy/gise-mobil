import { api } from './api';
import { mapPlatformHero } from './giseMappers';

export type AppBranding = ReturnType<typeof mapPlatformHero>;

let cachedBranding: AppBranding | null = null;

export async function fetchAppBranding(options?: {
  refresh?: boolean;
}): Promise<AppBranding | null> {
  if (cachedBranding && !options?.refresh) return cachedBranding;
  try {
    const raw = await api.get<Record<string, unknown>>('/heros/home');
    cachedBranding = mapPlatformHero(raw);
    return cachedBranding;
  } catch {
    return cachedBranding;
  }
}

export function clearBrandingCache(): void {
  cachedBranding = null;
}
