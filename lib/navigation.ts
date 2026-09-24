import { useSegments } from 'expo-router';

export type TabGroupName = '(tabs)' | '(admin-tabs)';

export function useTabGroup(): TabGroupName {
  const segments = useSegments();
  return segments[0] === '(admin-tabs)' ? '(admin-tabs)' : '(tabs)';
}

export function eventsTabPath(group: TabGroupName): `/${TabGroupName}/events` {
  return `/${group}/events`;
}

/** Navbar Ara / Enter → etkinlikler + opsiyonel q chip */
export function buildEventsSearchHref(
  group: TabGroupName,
  query: string,
): { pathname: `/${TabGroupName}/events`; params?: { q: string } } {
  const q = query.trim();
  if (!q) return { pathname: eventsTabPath(group) };
  return { pathname: eventsTabPath(group), params: { q } };
}
