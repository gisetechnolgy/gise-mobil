import { formatCityLabel } from './cities';
import { t } from './i18n';

export function formatVenueLine(input: {
  venueName?: string | null;
  city?: string | null;
}): string {
  const venue = input.venueName?.trim();
  const city = formatCityLabel(input.city);
  if (venue && city) return `${venue} / ${city}`;
  return venue || city || t('noVenueInfo');
}
