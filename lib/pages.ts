import { api } from './api';
import { pickLocalizedText } from './giseMappers';

export type CmsPage = {
  id: string;
  title: string;
  content: string;
};

function mapPageRecord(raw: Record<string, unknown>): CmsPage {
  return {
    id: String(raw.id ?? ''),
    title: pickLocalizedText(raw.title),
    content: pickLocalizedText(raw.content),
  };
}

/** Panel “Sayfalar” — `GET /pages/:id` */
export async function fetchPageById(id: string): Promise<CmsPage | null> {
  try {
    const raw = await api.get<Record<string, unknown>>(
      `/pages/${encodeURIComponent(id)}`,
    );
    return mapPageRecord(raw);
  } catch {
    return null;
  }
}
