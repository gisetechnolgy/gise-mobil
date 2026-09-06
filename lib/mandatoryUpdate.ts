import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Linking, Platform } from 'react-native';
import { api } from './api';

export type PlatformVersionConfig = {
  latestVersion: string;
  minimumVersion: string;
  forceUpdate: boolean;
  maintenance: boolean;
  maintenanceMessage: string;
  storeUrl: string;
  releaseNotes: string[];
};

export type AppVersionResponse = {
  ios: PlatformVersionConfig;
  android: PlatformVersionConfig;
};

export type UpdateRequirement =
  | { kind: 'none' }
  | {
      kind: 'maintenance';
      message: string;
    }
  | {
      kind: 'force';
      storeUrl: string;
      latestVersion: string;
      releaseNotes: string[];
    }
  | {
      kind: 'soft';
      storeUrl: string;
      latestVersion: string;
      releaseNotes: string[];
    };

export function getInstalledAppVersion(): string {
  return (
    Application.nativeApplicationVersion ??
    Constants.expoConfig?.version ??
    '0.0.0'
  );
}

export function compareSemver(a: string, b: string): number {
  const parse = (v: string) =>
    v
      .trim()
      .split('.')
      .map((n) => parseInt(n.replace(/[^0-9].*$/, ''), 10) || 0);

  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length);

  for (let i = 0; i < len; i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function evaluatePlatform(
  localVersion: string,
  platform: PlatformVersionConfig,
): UpdateRequirement {
  if (platform.maintenance) {
    return {
      kind: 'maintenance',
      message:
        platform.maintenanceMessage?.trim() ||
        'Uygulama şu anda bakımda. Lütfen daha sonra tekrar deneyin.',
    };
  }

  const belowMinimum =
    compareSemver(localVersion, platform.minimumVersion) < 0;
  const belowLatest = compareSemver(localVersion, platform.latestVersion) < 0;

  if (belowMinimum) {
    return {
      kind: 'force',
      storeUrl: platform.storeUrl,
      latestVersion: platform.latestVersion,
      releaseNotes: platform.releaseNotes ?? [],
    };
  }

  if (belowLatest && platform.forceUpdate) {
    return {
      kind: 'force',
      storeUrl: platform.storeUrl,
      latestVersion: platform.latestVersion,
      releaseNotes: platform.releaseNotes ?? [],
    };
  }

  if (belowLatest) {
    return {
      kind: 'soft',
      storeUrl: platform.storeUrl,
      latestVersion: platform.latestVersion,
      releaseNotes: platform.releaseNotes ?? [],
    };
  }

  return { kind: 'none' };
}

async function maybeFetchOtaInBackground() {
  if (__DEV__ || !Updates.isEnabled) return;
  try {
    const result = await Updates.checkForUpdateAsync();
    if (result.isAvailable) {
      await Updates.fetchUpdateAsync();
    }
  } catch (e) {
    console.warn('[OTA] background check failed:', e);
  }
}

export async function resolveMandatoryUpdate(): Promise<UpdateRequirement> {
  void maybeFetchOtaInBackground();

  try {
    const res = await api.get<AppVersionResponse>('/app/version', {
      auth: false,
      timeoutMs: 12_000,
    });

    const platformConfig =
      Platform.OS === 'ios' ? res?.ios : res?.android;

    if (!platformConfig) return { kind: 'none' };

    const localVersion = getInstalledAppVersion();
    return evaluatePlatform(localVersion, platformConfig);
  } catch (e) {
    // Ağ hatasında uygulamayı kilitleme
    console.warn('[app/version] check failed:', e);
    return { kind: 'none' };
  }
}

export function openStoreUpdate(url: string): void {
  void (async () => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) return;
      await Linking.openURL(url);
    } catch {
      /* ignore */
    }
  })();
}
