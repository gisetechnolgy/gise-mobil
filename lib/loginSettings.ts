import { api } from './api';

export type WebLoginMode = 'legacy' | 'otp';

/** Panel > Giriş ayarları; web /giris ile aynı kaynak. */
export async function getLoginMode(): Promise<WebLoginMode> {
  try {
    const data = await api.get<{ webLoginMode?: string }>(
      '/login-settings/public',
    );
    return data?.webLoginMode === 'otp' ? 'otp' : 'legacy';
  } catch {
    return 'legacy';
  }
}
