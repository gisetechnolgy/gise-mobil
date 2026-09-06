import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_KEY = 'auth.accessToken';

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  }
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const secureStorage = {
  async getAccessToken(): Promise<string | null> {
    return getItem(ACCESS_KEY);
  },

  async getTokens(): Promise<{
    accessToken: string | null;
    refreshToken: string | null;
  }> {
    const accessToken = await getItem(ACCESS_KEY);
    return { accessToken, refreshToken: null };
  },

  async setAccessToken(accessToken: string): Promise<void> {
    await setItem(ACCESS_KEY, accessToken);
  },

  async setTokens(accessToken: string, _refreshToken?: string | null): Promise<void> {
    await setItem(ACCESS_KEY, accessToken);
  },

  async clearTokens(): Promise<void> {
    await deleteItem(ACCESS_KEY);
  },
};
