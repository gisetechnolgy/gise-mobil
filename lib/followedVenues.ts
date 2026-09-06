import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

function keyForUser(userId: string): string {
  return `user.followedVenues.${userId}`;
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

export async function readFollowedVenueIds(userId: string): Promise<string[]> {
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

export async function isVenueFollowed(
  userId: string,
  venueId: string,
): Promise<boolean> {
  const ids = await readFollowedVenueIds(userId);
  return ids.includes(venueId);
}

export async function toggleVenueFollow(
  userId: string,
  venueId: string,
): Promise<boolean> {
  const ids = await readFollowedVenueIds(userId);
  const exists = ids.includes(venueId);
  const next = exists ? ids.filter((id) => id !== venueId) : [...ids, venueId];
  await setItem(keyForUser(userId), JSON.stringify(next));
  return !exists;
}
