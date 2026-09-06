import type { Href } from 'expo-router';
import type { AppNotification } from './notifications';

export function getNotificationHref(
  metadata: AppNotification['metadata'],
): Href | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const m = metadata as Record<string, unknown>;
  const eventId =
    (typeof m.eventId === 'string' && m.eventId) ||
    (typeof m.eventID === 'string' && m.eventID) ||
    null;
  if (eventId) {
    return `/events/${eventId}` as Href;
  }
  return null;
}

export function getNotificationHrefFromPushData(
  data: Record<string, unknown> | undefined,
): Href | null {
  if (!data) return null;
  return getNotificationHref(data);
}
