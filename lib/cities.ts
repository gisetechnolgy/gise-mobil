import { getAppLocale, type AppLocale } from './appLocale';

const CITY_LABELS: Record<string, { tr: string; en: string }> = {
  lefke: { tr: 'Lefke', en: 'Lefke' },
  famagusta: { tr: 'Mağusa', en: 'Famagusta' },
  kyrenia: { tr: 'Girne', en: 'Kyrenia' },
  larnaca: { tr: 'Larnaka', en: 'Larnaca' },
  iskele: { tr: 'İskele', en: 'Iskele' },
  limassol: { tr: 'Limasol', en: 'Limassol' },
  morphou: { tr: 'Güzelyurt', en: 'Guzelyurt' },
  nicosia: { tr: 'Lefkoşa', en: 'Nicosia' },
  paphos: { tr: 'Baf', en: 'Paphos' },
};

export function formatCityLabel(
  city?: string | null,
  locale: AppLocale = getAppLocale(),
): string {
  if (!city?.trim()) return '';
  const key = city.trim().toLowerCase();
  const labels = CITY_LABELS[key];
  if (labels) return labels[locale];
  return city;
}

export type CityOption = { value: string; label: string };

export const CITY_OPTIONS: CityOption[] = Object.entries(CITY_LABELS)
  .map(([value, label]) => ({
    value,
    label: label.tr,
  }))
  .sort((a, b) => a.label.localeCompare(b.label, 'tr'));
