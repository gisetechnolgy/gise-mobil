import { api } from './api';
import { GiseListResponse } from './giseMappers';

export async function fetchCollection(
  type: string,
  params?: Record<string, string>,
): Promise<Record<string, unknown>[]> {
  const search = new URLSearchParams({ perPage: '1000', ...(params ?? {}) });
  const res = await api.get<GiseListResponse<Record<string, unknown>>>(
    `${type}?${search.toString()}`,
  );
  return res.data ?? [];
}
