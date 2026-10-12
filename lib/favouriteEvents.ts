import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { api } from "./api";

/**
 * Favoriler sunucuda (users.extras.favouriteEvents) — web ile ortak.
 * Cihazdaki liste sadece önbellek / çevrimdışı yedek.
 */
function keyForUser(userId: string): string {
  return `user.favouriteEvents.${userId}`;
}

function migratedKey(userId: string): string {
  return `user.favouriteEvents.migrated.${userId}`;
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

async function readLocalIds(userId: string): Promise<string[]> {
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

async function writeLocalIds(userId: string, ids: string[]): Promise<void> {
  try {
    await setItem(keyForUser(userId), JSON.stringify(ids));
  } catch {
    /* önbellek opsiyonel */
  }
}

type FavouritesResponse = { eventIds?: unknown };

function idsFrom(res: FavouritesResponse | undefined): string[] | null {
  if (!res || !Array.isArray(res.eventIds)) return null;
  return res.eventIds.filter((id): id is string => typeof id === "string");
}

export async function readFavouriteEventIds(userId: string): Promise<string[]> {
  if (!userId) return [];
  const local = await readLocalIds(userId);
  try {
    let server = idsFrom(
      await api.get<FavouritesResponse>("/users/me/favourites", { auth: true }),
    );
    if (!server) return local;

    // Sunucuya geçmeden önce cihazda eklenmiş favorileri bir kez aktar
    const migrated = await getItem(migratedKey(userId));
    if (!migrated) {
      const missing = local.filter((id) => !server!.includes(id));
      if (missing.length > 0) {
        server =
          idsFrom(
            await api.put<FavouritesResponse>(
              "/users/me/favourites",
              { eventIds: missing },
              { auth: true },
            ),
          ) ?? server;
      }
      await setItem(migratedKey(userId), "1");
    }

    await writeLocalIds(userId, server);
    return server;
  } catch {
    return local;
  }
}

export async function isEventFavourite(
  userId: string,
  eventId: string,
): Promise<boolean> {
  const ids = await readFavouriteEventIds(userId);
  return ids.includes(eventId);
}

/** Favoriye ekler / çıkarır — yeni durumu döner (true = favoride) */
export async function toggleEventFavourite(
  userId: string,
  eventId: string,
): Promise<boolean> {
  const ids = await readLocalIds(userId);
  const favourite = !ids.includes(eventId);
  const optimistic = favourite
    ? [...ids, eventId]
    : ids.filter((id) => id !== eventId);
  await writeLocalIds(userId, optimistic);

  try {
    const server = idsFrom(
      await api.put<FavouritesResponse>(
        `/users/me/favourites/${encodeURIComponent(eventId)}`,
        { favourite },
        { auth: true },
      ),
    );
    if (server) await writeLocalIds(userId, server);
  } catch {
    /* çevrimdışı: yerel durum kalır, sonraki okumada sunucu esas alınır */
  }
  return favourite;
}
