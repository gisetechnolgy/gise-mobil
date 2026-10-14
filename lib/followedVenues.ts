import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { api } from "./api";

/**
 * Takip edilen mekanlar sunucuda (users.extras.favouriteVenues) — web ile ortak.
 * Cihazdaki liste sadece önbellek / çevrimdışı yedek.
 */
function keyForUser(userId: string): string {
  return `user.followedVenues.${userId}`;
}

function migratedKey(userId: string): string {
  return `user.followedVenues.migrated.${userId}`;
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

type FavouritesResponse = { venueIds?: unknown };

function idsFrom(res: FavouritesResponse | undefined): string[] | null {
  if (!res || !Array.isArray(res.venueIds)) return null;
  return res.venueIds.filter((id): id is string => typeof id === "string");
}

export async function readFollowedVenueIds(userId: string): Promise<string[]> {
  if (!userId) return [];
  const local = await readLocalIds(userId);
  try {
    let server = idsFrom(
      await api.get<FavouritesResponse>("/users/me/favourites", { auth: true }),
    );
    if (!server) return local;

    const migrated = await getItem(migratedKey(userId));
    if (!migrated) {
      const missing = local.filter((id) => !server!.includes(id));
      if (missing.length > 0) {
        server =
          idsFrom(
            await api.put<FavouritesResponse>(
              "/users/me/favourites",
              { venueIds: missing },
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

export async function isVenueFollowed(
  userId: string,
  venueId: string,
): Promise<boolean> {
  const ids = await readFollowedVenueIds(userId);
  return ids.includes(venueId);
}

/** Takibe ekler / çıkarır — yeni durumu döner (true = takipte) */
export async function toggleVenueFollow(
  userId: string,
  venueId: string,
): Promise<boolean> {
  const ids = await readLocalIds(userId);
  const favourite = !ids.includes(venueId);
  const optimistic = favourite
    ? [...ids, venueId]
    : ids.filter((id) => id !== venueId);
  await writeLocalIds(userId, optimistic);

  try {
    const server = idsFrom(
      await api.put<FavouritesResponse>(
        `/users/me/favourites/venues/${encodeURIComponent(venueId)}`,
        { favourite },
        { auth: true },
      ),
    );
    if (server) await writeLocalIds(userId, server);
  } catch {
    /* çevrimdışı: yerel durum kalır */
  }
  return favourite;
}
