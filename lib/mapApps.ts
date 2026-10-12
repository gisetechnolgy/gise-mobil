import { Linking, Platform } from 'react-native';

export type MapAppOption = {
  id: string;
  label: string;
  url: string;
};

type Candidate = MapAppOption & {
  /** Yüklü mü kontrolü için; yoksa her zaman listelenir */
  probe?: string;
  /** Probe başarısızsa listeden çıkarmak yerine bu linkle göster */
  fallbackUrl?: string;
};

function candidates(lat: string, lng: string): Candidate[] {
  const webGoogle = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const list: Candidate[] = [];

  if (Platform.OS === 'ios') {
    list.push({
      id: 'apple',
      label: 'Apple Haritalar',
      url: `maps://?daddr=${lat},${lng}&dirflg=d`,
    });
    list.push({
      id: 'google',
      label: 'Google Maps',
      url: `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`,
      probe: 'comgooglemaps://',
      // Universal link: Google Maps yüklüyse uygulamada, değilse tarayıcıda açılır
      fallbackUrl: webGoogle,
    });
  } else {
    list.push({ id: 'google', label: 'Google Maps', url: webGoogle });
  }

  list.push(
    {
      id: 'waze',
      label: 'Waze',
      url: `waze://?ll=${lat},${lng}&navigate=yes`,
      probe: 'waze://',
    },
    {
      id: 'yandexnavi',
      label: 'Yandex Navigasyon',
      url: `yandexnavi://build_route_on_map?lat_to=${lat}&lon_to=${lng}`,
      probe: 'yandexnavi://',
    },
    {
      id: 'yandexmaps',
      label: 'Yandex Haritalar',
      url: `yandexmaps://maps.yandex.ru/?rtext=~${lat},${lng}&rtt=auto`,
      probe: 'yandexmaps://',
    },
  );

  return list;
}

/** Cihazda yüklü harita uygulamaları (yol tarifi linkleriyle). */
export async function getInstalledMapApps(
  lat: string,
  lng: string,
): Promise<MapAppOption[]> {
  const checked = await Promise.all(
    candidates(lat, lng).map(async ({ probe, fallbackUrl, ...app }) => {
      if (!probe) return app;
      let installed = false;
      try {
        installed = await Linking.canOpenURL(probe);
      } catch {
        installed = false;
      }
      if (installed) return app;
      return fallbackUrl ? { ...app, url: fallbackUrl } : null;
    }),
  );
  return checked.filter((a): a is MapAppOption => a !== null);
}

export async function openMapApp(app: MapAppOption, lat: string, lng: string) {
  try {
    await Linking.openURL(app.url);
  } catch {
    await Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    );
  }
}
