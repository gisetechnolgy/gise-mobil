import { api } from './api';
import {
  GiseListResponse,
  mapOrganisationCompanyRecord,
} from './giseMappers';

export type CompanyItem = ReturnType<typeof mapOrganisationCompanyRecord>;

export async function fetchCompanies(params?: {
  city?: string;
}): Promise<CompanyItem[]> {
  const qs = new URLSearchParams();
  qs.set('perPage', '500');
  qs.set('sort', 'name');
  qs.set('order', 'asc');
  if (params?.city) qs.set('city', params.city);

  const res = await api.get<GiseListResponse<Record<string, unknown>>>(
    `/organisationCompanies?${qs.toString()}`,
  );

  return (res.data ?? []).map((row) => mapOrganisationCompanyRecord(row));
}

/** Web getOrganisationEventCountsDB */
export async function fetchOrganisationEventCounts(): Promise<
  Record<string, number>
> {
  try {
    const counts = await api.get<Record<string, number>>(
      '/events/counts-by-organisation',
    );
    if (counts && typeof counts === 'object' && !Array.isArray(counts)) {
      const out: Record<string, number> = {};
      for (const [id, value] of Object.entries(counts)) {
        const n = Number(value);
        if (Number.isFinite(n) && n > 0) out[id] = n;
      }
      return out;
    }
  } catch {
    /* ignore */
  }
  return {};
}

export function attachOrganisationEventCounts(
  companies: CompanyItem[],
  counts: Record<string, number>,
): CompanyItem[] {
  return companies.map((company) => ({
    ...company,
    eventCount: Number(counts[company.id]) || company.eventCount || 0,
  }));
}

/** Etkinlik sayısı çok → az, eşitse A→Z */
export function sortCompaniesByEventCount(
  companies: CompanyItem[],
): CompanyItem[] {
  return [...companies].sort((a, b) => {
    const countDiff = (b.eventCount || 0) - (a.eventCount || 0);
    if (countDiff !== 0) return countDiff;
    return String(a.name || '').localeCompare(String(b.name || ''), 'tr', {
      sensitivity: 'base',
    });
  });
}

/** Organizatörler listesi — web organizasyon-sirketleri index */
export async function fetchCompaniesForListPage(): Promise<CompanyItem[]> {
  const [companies, counts] = await Promise.all([
    fetchCompanies(),
    fetchOrganisationEventCounts(),
  ]);
  return sortCompaniesByEventCount(
    attachOrganisationEventCounts(companies, counts),
  );
}

/** @deprecated — liste için fetchCompaniesForListPage kullan */
export async function fetchCompaniesSorted(): Promise<CompanyItem[]> {
  return fetchCompaniesForListPage();
}

export async function fetchCompanyById(id: string): Promise<CompanyItem | null> {
  try {
    const raw = await api.get<Record<string, unknown>>(
      `/organisationCompanies/${encodeURIComponent(id)}`,
    );
    return mapOrganisationCompanyRecord(raw);
  } catch {
    return null;
  }
}

export function companyImageCacheKey(company: {
  id: string;
  logoUrl: string | null;
}): string {
  return company.logoUrl ?? company.id;
}
