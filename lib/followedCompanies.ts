import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

function keyForUser(userId: string): string {
  return `user.followedCompanies.${userId}`;
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function readFollowedCompanyIds(userId: string): Promise<string[]> {
  if (!userId) return [];
  try {
    const raw = await getItem(keyForUser(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export async function isCompanyFollowed(
  userId: string,
  companyId: string,
): Promise<boolean> {
  const ids = await readFollowedCompanyIds(userId);
  return ids.includes(companyId);
}

export async function toggleCompanyFollow(
  userId: string,
  companyId: string,
): Promise<boolean> {
  const ids = await readFollowedCompanyIds(userId);
  const exists = ids.includes(companyId);
  const next = exists ? ids.filter((id) => id !== companyId) : [...ids, companyId];
  await setItem(keyForUser(userId), JSON.stringify(next));
  return !exists;
}
