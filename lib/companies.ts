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

export async function fetchCompaniesSorted(): Promise<CompanyItem[]> {
  return fetchCompanies();
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
