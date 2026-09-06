import { AppLocale, getAppLocale } from './appLocale';

/** gisekibris-web/src/constants/dressCodes.js ile aynı */
const DRESS_CODE_LABELS: Record<number, Record<AppLocale, string>> = {
  1: { en: 'Casual dress code', tr: 'Gündelik kıyafetler' },
  2: { en: 'Come as you are', tr: 'Olduğun gibi gel' },
  3: { en: 'Elegant dress code', tr: 'Şık kıyafetler' },
  4: { en: 'Smart Casual', tr: 'Gündelik şık kıyafetler' },
  5: { en: 'There is no dress code', tr: 'Kıyafet kuralı bulunmamaktadır' },
};

const DRESS_ALIASES: Record<string, number> = {
  '1': 1,
  casual: 1,
  'casual dress code': 1,
  '2': 2,
  'come as you are': 2,
  '3': 3,
  elegant: 3,
  'elegant dress code': 3,
  '4': 4,
  'smart casual': 4,
  '5': 5,
  'no dress code': 5,
  'there is no dress code': 5,
};

function resolveDressCodeId(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const asNum = Number(trimmed);
  if (Number.isInteger(asNum) && DRESS_CODE_LABELS[asNum]) {
    return asNum;
  }

  return DRESS_ALIASES[trimmed.toLowerCase()] ?? null;
}

export function formatDressRuleLabel(
  value: string,
  locale: AppLocale = getAppLocale(),
): string {
  const id = resolveDressCodeId(value);
  if (id != null) return DRESS_CODE_LABELS[id][locale];
  return value;
}

export function formatDressRuleText(
  dress: string[] | null | undefined,
  locale: AppLocale = getAppLocale(),
): string {
  if (!dress?.length) return '';
  return dress
    .map((item) => formatDressRuleLabel(item, locale))
    .filter(Boolean)
    .join(', ');
}
