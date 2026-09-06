import { useSegments } from 'expo-router';

export type TabGroupName = '(tabs)' | '(admin-tabs)';

export function useTabGroup(): TabGroupName {
  const segments = useSegments();
  return segments[0] === '(admin-tabs)' ? '(admin-tabs)' : '(tabs)';
}

export function eventsTabPath(group: TabGroupName): `/${TabGroupName}/events` {
  return `/${group}/events`;
}
