import { Camera } from 'expo-camera';
import { PermissionsAndroid, Platform } from 'react-native';

async function requestAndroidCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const permission = PermissionsAndroid.PERMISSIONS.CAMERA;
    const already = await PermissionsAndroid.check(permission);
    if (already) return true;
    const result = await PermissionsAndroid.request(permission);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

/**
 * Kamera açılırken: izin yoksa her denemede sistem diyaloğunu sor.
 * Denied ise ayarlara yönlendirmek için canOpenSettings döner.
 */
export async function promptCameraPermissionOnOpen(): Promise<{
  granted: boolean;
  canOpenSettings: boolean;
}> {
  try {
    const current = await Camera.getCameraPermissionsAsync();
    if (current.granted || current.status === 'granted') {
      return { granted: true, canOpenSettings: false };
    }

    const next = await Camera.requestCameraPermissionsAsync();
    if (next.granted || next.status === 'granted') {
      return { granted: true, canOpenSettings: false };
    }

    if (Platform.OS === 'android') {
      const granted = await requestAndroidCameraPermission();
      if (granted) return { granted: true, canOpenSettings: false };
    }

    return { granted: false, canOpenSettings: true };
  } catch {
    if (Platform.OS === 'android') {
      const granted = await requestAndroidCameraPermission();
      if (granted) return { granted: true, canOpenSettings: false };
    }
    return { granted: false, canOpenSettings: true };
  }
}

export async function getCameraPermissionGranted(): Promise<boolean> {
  try {
    const current = await Camera.getCameraPermissionsAsync();
    return current.granted === true || current.status === 'granted';
  } catch {
    if (Platform.OS === 'android') {
      try {
        return await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.CAMERA,
        );
      } catch {
        return false;
      }
    }
    return false;
  }
}
