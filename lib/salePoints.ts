import { api } from './api';
import { pickImageSrc } from './giseMappers';

export type SalePointRecord = {
  id: string;
  name: string;
  city: string | null;
  paymentMethods: string[];
  bannerUrl: string | null;
};

function mapSalePoint(raw: Record<string, unknown>): SalePointRecord {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    city: raw.city != null ? String(raw.city) : null,
    paymentMethods: Array.isArray(raw.paymentMethods)
      ? raw.paymentMethods.map(String)
      : [],
    bannerUrl: pickImageSrc(raw.banner),
  };
}

export async function fetchSalePointById(
  id: string,
): Promise<SalePointRecord | null> {
  try {
    const raw = await api.get<Record<string, unknown>>(
      `/salePoints/${encodeURIComponent(id)}`,
    );
    if (raw.isActive === false) return null;
    return mapSalePoint(raw);
  } catch {
    return null;
  }
}
