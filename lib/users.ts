import { api } from './api';

export async function updateUser(
  userId: string,
  updateObject: Record<string, unknown>,
): Promise<void> {
  await api.put(`/users/${encodeURIComponent(userId)}`, updateObject, {
    auth: true,
  });
}

export async function touchLastLogin(userId: string): Promise<void> {
  await updateUser(userId, {
    lastLogin: Math.floor(Date.now() / 1000),
    lastLoginClient: 'mobile',
  });
}
