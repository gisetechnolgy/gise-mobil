import { api, ApiError } from './api';
import { toIsoDate, type GiseListResponse } from './giseMappers';

export type UserProfileRecord = {
  id: string;
  email?: string | null;
  name?: string | null;
  surname?: string | null;
  mobile?: string | null;
  country?: string | null;
  city?: string | null;
  gender?: string | null;
  dob?: string | null;
  isVerified?: boolean;
};

export async function fetchUserById(userId: string): Promise<UserProfileRecord | null> {
  try {
    const raw = await api.get<Record<string, unknown>>(
      `/users/${encodeURIComponent(userId)}`,
      { auth: true },
    );
    if (!raw || typeof raw !== 'object') return null;
    const dobIso = toIsoDate(raw.dob);
    return {
      id: String(raw.id ?? userId),
      email: raw.email != null ? String(raw.email) : null,
      name: raw.name != null ? String(raw.name) : null,
      surname: raw.surname != null ? String(raw.surname) : null,
      mobile: raw.mobile != null ? String(raw.mobile) : null,
      country: raw.country != null ? String(raw.country) : null,
      city: raw.city != null ? String(raw.city) : null,
      gender: raw.gender != null ? String(raw.gender) : null,
      dob: dobIso ? dobIso.slice(0, 10) : null,
      isVerified: raw.isVerified === true,
    };
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

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

export async function changePassword(input: {
  oldPassword: string;
  newPassword: string;
}): Promise<void> {
  await api.post(
    '/auth/web/change-password',
    {
      oldPassword: input.oldPassword,
      newPassword: input.newPassword,
    },
    { auth: true },
  );
}
