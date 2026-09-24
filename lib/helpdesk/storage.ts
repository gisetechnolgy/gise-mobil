import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { HELPDESK_SCRIPT_KEY } from './config';
import type { CachedChat, HelpdeskUserPrefill, SurveyContext } from './types';

const PREFIX = `hd_${HELPDESK_SCRIPT_KEY}`;
const KEYS = {
  visitor: `${PREFIX}_visitor`,
  chat: `${PREFIX}_chat`,
  user: `${PREFIX}_user`,
  pendingSurvey: `${PREFIX}_pending_survey`,
  surveySkipped: `${PREFIX}_survey_skipped`,
};

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') return window.localStorage.getItem(key);
    return null;
  }
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

function uuid(): string {
  return `v_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export async function getOrCreateVisitorId(): Promise<string> {
  const existing = await getItem(KEYS.visitor);
  if (existing && /^[a-zA-Z0-9_-]{8,64}$/.test(existing)) return existing;
  const id = uuid().slice(0, 48);
  await setItem(KEYS.visitor, id);
  return id;
}

export async function saveVisitorId(id: string): Promise<void> {
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(id)) return;
  await setItem(KEYS.visitor, id);
}

export async function saveChat(data: CachedChat): Promise<void> {
  await setItem(KEYS.chat, JSON.stringify(data));
}

export async function loadChat(): Promise<CachedChat | null> {
  try {
    const raw = await getItem(KEYS.chat);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedChat;
    if (!parsed?.ticketHash || !parsed?.accessToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearChat(): Promise<void> {
  await deleteItem(KEYS.chat);
}

export async function saveUserPrefill(
  user: Omit<HelpdeskUserPrefill, 'lockEmail'> & { lockEmail?: boolean },
): Promise<void> {
  await setItem(
    KEYS.user,
    JSON.stringify({
      email: user.email || '',
      fullName: user.fullName || '',
      phone: user.phone || '',
      lockEmail: !!user.lockEmail,
    }),
  );
}

export async function loadUserPrefill(): Promise<HelpdeskUserPrefill | null> {
  try {
    const raw = await getItem(KEYS.user);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HelpdeskUserPrefill;
    return {
      email: parsed.email || '',
      fullName: parsed.fullName || '',
      phone: parsed.phone || '',
      lockEmail: !!parsed.lockEmail,
    };
  } catch {
    return null;
  }
}

export async function clearUserPrefill(): Promise<void> {
  await deleteItem(KEYS.user);
}

export async function savePendingSurvey(data: SurveyContext): Promise<void> {
  await setItem(KEYS.pendingSurvey, JSON.stringify(data));
}

export async function loadPendingSurvey(): Promise<SurveyContext | null> {
  try {
    const raw = await getItem(KEYS.pendingSurvey);
    if (!raw) return null;
    return JSON.parse(raw) as SurveyContext;
  } catch {
    return null;
  }
}

export async function clearPendingSurvey(): Promise<void> {
  await deleteItem(KEYS.pendingSurvey);
}

export async function isSurveySkipped(ticketHash: string): Promise<boolean> {
  try {
    const raw = await getItem(KEYS.surveySkipped);
    const list: string[] = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) && list.includes(ticketHash);
  } catch {
    return false;
  }
}

export async function markSurveySkipped(ticketHash: string): Promise<void> {
  try {
    const raw = await getItem(KEYS.surveySkipped);
    let list: string[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];
    if (!list.includes(ticketHash)) {
      list.push(ticketHash);
      if (list.length > 100) list = list.slice(-100);
      await setItem(KEYS.surveySkipped, JSON.stringify(list));
    }
  } catch {
    /* noop */
  }
}
