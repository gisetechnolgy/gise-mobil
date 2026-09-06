import { api } from './api';

export type NotificationType = 'ADMIN_BROADCAST';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  readAt: string | null;
  metadata: unknown;
  createdAt: string;
}

type InboxResponse = {
  ok: true;
  items: AppNotification[];
  unreadCount: number;
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export async function fetchNotifications(page = 1, limit = 30) {
  return api.get<InboxResponse>(
    `/notifications/inbox?page=${page}&limit=${limit}`,
    { auth: true },
  );
}

export async function fetchUnreadCount() {
  return api.get<{ unreadCount: number }>(
    '/notifications/inbox/unread-count',
    { auth: true },
  );
}

export async function markNotificationRead(id: string) {
  return api.post<{ ok: true; notification: AppNotification | null }>(
    `/notifications/inbox/${encodeURIComponent(id)}/read`,
    undefined,
    { auth: true },
  );
}

export async function markAllNotificationsRead() {
  return api.post<{ ok: true }>(
    '/notifications/inbox/read-all',
    undefined,
    { auth: true },
  );
}

export { registerPushTokenWithBackend, syncPushTokenWithBackend } from './push-notifications';
