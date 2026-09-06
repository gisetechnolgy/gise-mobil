import { fetchCollection } from './collections';
import { pickLocalizedText } from './giseMappers';

export type CategoryItem = {
  id: string;
  value: string;
  label: string;
  order: number;
};

export type SubcategoryItem = {
  id: string;
  value: string;
  label: string;
  categoryId: string;
  order: number;
};

let cachedCategories: CategoryItem[] | null = null;
let cachedSubcategories: SubcategoryItem[] | null = null;
let cachedVenueCategories: CategoryItem[] | null = null;
let cachedBrowsableCategories: CategoryItem[] | null = null;

export async function fetchCategories(refresh = false): Promise<CategoryItem[]> {
  if (cachedCategories && !refresh) return cachedCategories;

  const rows = await fetchCollection('categories');
  cachedCategories = rows
    .filter((row) => row.active !== false && row.isActive !== false)
    .map((row) => ({
      id: String(row.id ?? ''),
      value: String(row.id ?? ''),
      label:
        pickLocalizedText(row.name) ||
        (typeof row.name === 'string' ? row.name : String(row.id ?? '')),
      order: Number(row.order ?? 0),
    }))
    .filter((c) => c.id)
    .sort((a, b) => a.order - b.order);

  if (refresh) cachedBrowsableCategories = null;
  return cachedCategories;
}

/**
 * Listeleme için kategoriler: alt kategorisi olmayan (içi boş) olanlar hariç.
 * API `nonEmpty=true` ile filtreler; etiket çözümlemesi için fetchCategories kullanın.
 */
export async function fetchBrowsableCategories(
  refresh = false,
): Promise<CategoryItem[]> {
  if (cachedBrowsableCategories && !refresh) return cachedBrowsableCategories;

  const rows = await fetchCollection('categories', { nonEmpty: 'true' });
  cachedBrowsableCategories = rows
    .filter((row) => row.active !== false && row.isActive !== false)
    .map((row) => ({
      id: String(row.id ?? ''),
      value: String(row.id ?? ''),
      label:
        pickLocalizedText(row.name) ||
        (typeof row.name === 'string' ? row.name : String(row.id ?? '')),
      order: Number(row.order ?? 0),
    }))
    .filter((c) => c.id)
    .sort((a, b) => a.order - b.order);

  return cachedBrowsableCategories;
}

export async function fetchSubcategories(
  refresh = false,
): Promise<SubcategoryItem[]> {
  if (cachedSubcategories && !refresh) return cachedSubcategories;

  const rows = await fetchCollection('subcategories');
  cachedSubcategories = rows
    .map((row) => ({
      id: String(row.id ?? ''),
      value: String(row.id ?? ''),
      label:
        pickLocalizedText(row.name) ||
        (typeof row.name === 'string' ? row.name : String(row.id ?? '')),
      categoryId: String(row.category ?? ''),
      order: Number(row.order ?? 0),
    }))
    .filter((c) => c.id && c.categoryId)
    .sort((a, b) => a.order - b.order);

  if (refresh) cachedBrowsableCategories = null;
  return cachedSubcategories;
}

export async function fetchVenueCategories(
  refresh = false,
): Promise<CategoryItem[]> {
  if (cachedVenueCategories && !refresh) return cachedVenueCategories;

  const rows = await fetchCollection('venueCategories');
  cachedVenueCategories = rows
    .filter((row) => row.active !== false && row.isActive !== false)
    .map((row) => ({
      id: String(row.id ?? ''),
      value: String(row.id ?? ''),
      label:
        pickLocalizedText(row.name) ||
        (typeof row.name === 'string' ? row.name : String(row.id ?? '')),
      order: Number(row.order ?? 0),
    }))
    .filter((c) => c.id)
    .sort((a, b) => a.order - b.order);

  return cachedVenueCategories;
}

export function clearDefinitionsCache(): void {
  cachedCategories = null;
  cachedSubcategories = null;
  cachedVenueCategories = null;
  cachedBrowsableCategories = null;
}
