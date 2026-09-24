import { api } from './api';
import { fetchCollection } from './collections';
import { GiseListResponse, pickLocalizedText } from './giseMappers';

export type AdPackage = {
  id: string;
  label: string;
  type: string;
  name: string;
};

export type AdvertisePayload = {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  website: string;
  packageId: string;
  packageType?: string;
  packageName?: string;
  preferredStart: string;
  message: string;
  isChecked: boolean;
};

export type CompanyApplicationType = 'venue' | 'organisationCompany' | 'salesAgent';

export type MediaUpload = { src: string; title: string } | null;

export type CompanyApplicationPayload = {
  companyType: CompanyApplicationType;
  name: string;
  email: string;
  phone: string;
  website?: string;
  companyName: string;
  companyBank?: string;
  companyAccountNo?: string;
  city: string;
  address?:
    | string
    | { street: string; district: string; postalCode: string };
  description?: string | Record<string, string>;
  about: string | Record<string, string>;
  categories?: string[];
  amenities?: string[];
  sourceLang: 'tr' | 'en';
  slug?: string;
  isChecked?: boolean;
  logo?: MediaUpload;
  banner?: MediaUpload;
  layout?: MediaUpload;
  youtube?: string;
  coordinates?: string;
  company?: { type: string; name: string; taxName: string };
  taxDocument?: MediaUpload;
  bank?: { companyName: string; name: string; accountNo: string };
  google?: { keywords: string; description: string };
};

export const COMPANY_LEGAL_TYPES = [
  { id: 'K', label: 'KK' },
  { id: 'M', label: 'MŞ' },
  { id: 'Y', label: 'YŞ' },
  { id: 'R', label: 'RK' },
] as const;

export const IMAGE_HINTS = {
  square: {
    tr: 'Kare oranlı görsel yükleyin. Her iki kenar eşit olmalıdır.',
    en: 'Square ratio images should be uploaded. Both sides should be equal.',
  },
  landscape: {
    tr: 'Yatay oranlı görsel yükleyin. 16:9 oranı tercih edilir.',
    en: 'Landscape ratio images should be uploaded. 16:9 ratio is preferrable.',
  },
  youtube: {
    tr: "Lütfen yalnızca video ID'sini girin (?v= sonrasındaki kod), tam URL değil.",
    en: 'Please enter only the video ID (the code after ?v=), not the full URL.',
  },
} as const;

const TR_CHAR_MAP: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
  Ç: 'c',
  Ğ: 'g',
  İ: 'i',
  I: 'i',
  Ö: 'o',
  Ş: 's',
  Ü: 'u',
};

export function createSlugFromName(name: string): string {
  if (!name) return '';
  let value = String(name).trim();
  value = value.replace(/İ/g, 'i').replace(/I/g, 'i');
  value = value.toLocaleLowerCase('tr-TR');
  value = value
    .split('')
    .map((char) => TR_CHAR_MAP[char] ?? char)
    .join('');
  return value.replace(/[^a-z0-9]/g, '').toLowerCase();
}

function randomEnglishLetters(length = 4): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function ensureUniqueSlug(
  baseSlug: string,
  takenSlugs: string[] = [],
): string {
  const slug = String(baseSlug || '').toLowerCase();
  if (!slug) return '';

  const taken = new Set(
    takenSlugs.map((item) => String(item || '').toLowerCase()).filter(Boolean),
  );

  if (!taken.has(slug)) return slug;

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = `${slug}${randomEnglishLetters(4)}`;
    if (!taken.has(candidate)) return candidate;
  }

  return `${slug}${randomEnglishLetters(6)}`;
}

export function buildAutoSlug(name: string, takenSlugs: string[] = []): string {
  return ensureUniqueSlug(createSlugFromName(name), takenSlugs);
}

function collectSlugs(
  rows: Record<string, unknown>[] | undefined,
  target: string[],
) {
  (rows || []).forEach((row) => {
    if (row?.slug) target.push(String(row.slug).toLowerCase());
  });
}

async function fetchJsonList(path: string): Promise<Record<string, unknown>[]> {
  try {
    const res = await api.get<GiseListResponse<Record<string, unknown>>>(path, {
      auth: false,
    });
    return res.data ?? [];
  } catch {
    return [];
  }
}

export async function fetchTakenSlugsForScope(
  scope: 'venue' | 'organisationCompany',
): Promise<string[]> {
  const taken: string[] = [];

  if (scope === 'venue') {
    collectSlugs(await fetchJsonList('/venues?perPage=1000'), taken);
    collectSlugs(
      await fetchJsonList(
        '/eventCreationApplications?perPage=1000&companyType=venue',
      ),
      taken,
    );
  }

  if (scope === 'organisationCompany') {
    collectSlugs(
      await fetchJsonList('/organisationCompanies?perPage=1000'),
      taken,
    );
    collectSlugs(
      await fetchJsonList(
        '/eventCreationApplications?perPage=1000&companyType=organisationCompany',
      ),
      taken,
    );
  }

  return [...new Set(taken)];
}

export type ApplicationCityOption = { id: string; label: string };

export async function fetchApplicationCities(
  locale: 'tr' | 'en',
): Promise<ApplicationCityOption[]> {
  const rows = await fetchCollection('cities');
  return rows
    .map((row) => {
      const id = String(row.id ?? '');
      const label =
        pickLocalizedText(row.name, locale) ||
        (typeof row.name === 'string' ? row.name : id);
      return { id, label };
    })
    .filter((c) => c.id)
    .sort((a, b) => a.label.localeCompare(b.label, locale === 'en' ? 'en' : 'tr'));
}

const TYPE_LABELS: Record<string, { tr: string; en: string }> = {
  meta: { tr: 'Meta Ads', en: 'Meta Ads' },
  site: { tr: 'Site Banner', en: 'Site Banner' },
  popup: { tr: 'Popup', en: 'Popup' },
  featured: { tr: 'Öne Çıkan', en: 'Featured' },
  homepage: { tr: 'Ana Sayfa', en: 'Homepage' },
};

export async function fetchAdPackages(locale: 'tr' | 'en'): Promise<AdPackage[]> {
  const qs = new URLSearchParams();
  qs.set('perPage', '100');
  const res = await api.get<GiseListResponse<Record<string, unknown>>>(
    `/adPackages?${qs.toString()}`,
  );

  return (res.data ?? [])
    .filter((row) => row.isActive !== false && row.isActive !== 'false')
    .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
    .map((row) => {
      const id = String(row.id ?? '');
      const name = pickLocalizedText(row.name) || id;
      const type = String(row.type ?? '');
      const typeLabel = TYPE_LABELS[type]?.[locale] || type || '-';
      const currency = String(row.currency ?? 'TRY');
      const price =
        row.price != null && row.price !== ''
          ? `${row.price} ${currency}`
          : locale === 'en'
            ? 'Price on request'
            : 'Fiyat için iletişime geçin';
      return {
        id,
        name,
        type,
        label: `${name} · ${typeLabel} · ${price}`,
      };
    });
}

export async function submitAdvertiseApplication(
  payload: AdvertisePayload,
): Promise<void> {
  await api.post('/adApplications', payload, { auth: false });
}

export async function submitCompanyApplication(
  payload: CompanyApplicationPayload,
): Promise<void> {
  const companyName = (payload.companyName || payload.name || '').trim();
  const slug =
    payload.slug?.trim() ||
    buildAutoSlug(companyName) ||
    `basvuru-${Date.now()}`;

  await api.post(
    '/eventCreationApplications',
    {
      ...payload,
      companyName,
      slug,
      isChecked: false,
    },
    { auth: false },
  );
}

export const EVENT_CATEGORIES = [
  'music',
  'sports',
  'theater',
  'conference',
  'festival',
  'exhibition',
  'workshop',
  'networking',
  'comedy',
  'dance',
] as const;

export const VENUE_AMENITIES = [
  'parking',
  'wifi',
  'airConditioning',
  'accessibleEntrance',
  'bar',
  'restaurant',
  'soundSystem',
  'lighting',
  'stage',
  'security',
] as const;

export const CITY_OPTIONS = [
  { value: 'Lefkoşa', tr: 'Lefkoşa', en: 'Nicosia' },
  { value: 'Gazimağusa', tr: 'Gazimağusa', en: 'Famagusta' },
  { value: 'Girne', tr: 'Girne', en: 'Kyrenia' },
  { value: 'Güzelyurt', tr: 'Güzelyurt', en: 'Morphou' },
  { value: 'İskele', tr: 'İskele', en: 'Iskele' },
  { value: 'Lefke', tr: 'Lefke', en: 'Lefke' },
] as const;

const CATEGORY_TR: Record<string, string> = {
  music: 'Müzik',
  sports: 'Spor',
  theater: 'Tiyatro',
  conference: 'Konferans',
  festival: 'Festival',
  exhibition: 'Sergi',
  workshop: 'Atölye',
  networking: 'Ağ Oluşturma',
  comedy: 'Komedi',
  dance: 'Dans',
};

const AMENITY_TR: Record<string, string> = {
  parking: 'Otopark',
  wifi: 'WiFi',
  airConditioning: 'Klima',
  accessibleEntrance: 'Engelli Girişi',
  bar: 'Bar',
  restaurant: 'Restoran',
  soundSystem: 'Ses Sistemi',
  lighting: 'Işık Sistemi',
  stage: 'Sahne',
  security: 'Güvenlik',
};

export function categoryLabel(id: string, locale: 'tr' | 'en'): string {
  if (locale === 'en') return id.charAt(0).toUpperCase() + id.slice(1);
  return CATEGORY_TR[id] || id;
}

export function amenityLabel(id: string, locale: 'tr' | 'en'): string {
  if (locale === 'en') {
    return id.charAt(0).toUpperCase() + id.slice(1).replace(/([A-Z])/g, ' $1');
  }
  return AMENITY_TR[id] || id;
}
