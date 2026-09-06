const CAGE_RADIO_META_URL =
  'https://api.nrgplay.com/radios/cageclub/full';

export interface ExternalNowPlaying {
  title: string;
  artist: string;
  coverUrl: string | null;
  status?: string;
  startOn?: string | null;
}

export interface ExternalRadioFull {
  id: string;
  name: string;
  logo?: string | null;
  streamUrlHigh?: string | null;
  streamUrlLow?: string | null;
  nowPlaying?: ExternalNowPlaying | null;
}

export function resolveNrgAssetUrl(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }
  return `https://api.nrgplay.com${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

export async function fetchCageRadioFull(): Promise<ExternalRadioFull> {
  const res = await fetch(CAGE_RADIO_META_URL);
  if (!res.ok) {
    throw new Error(`Radyo bilgisi alınamadı (${res.status})`);
  }
  return (await res.json()) as ExternalRadioFull;
}
