import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Alert } from 'react-native';
import { api, ApiError, onUnauthorized } from '../../lib/api';
import type { AuthUser } from '../../lib/authTypes';
import { GiseUserRecord } from '../../lib/giseMappers';
import { hydrateAuthUser } from '../../lib/userHydration';
import { t } from '../../lib/i18n';
import { canEnterAdminMode } from '../../lib/roles';
import { secureStorage } from '../../lib/secureStorage';
import { touchLastLogin, updateUser } from '../../lib/users';

export type { AuthUser } from '../../lib/authTypes';

export interface SignupDto {
  email: string;
  password: string;
  name: string;
  surname: string;
  mobile?: string;
  country?: string;
  city?: string;
  gender?: string;
  dob?: string;
  newsletter?: boolean;
}

interface AuthLoginResponse {
  accessToken: string;
  user: GiseUserRecord;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
  signup: (data: SignupDto) => Promise<{ userId: string }>;
  verifyEmail: (userId: string, code: string) => Promise<void>;
  resendVerification: (userId: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithSsoToken: (token: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  setManagerSaleMode: (active: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function applySessionUser(me: GiseUserRecord): Promise<AuthUser | null> {
  if (me.hasDeleteRequest) {
    await secureStorage.clearTokens();
    Alert.alert(
      t('accountTitle'),
      t('accountDeletionPending'),
    );
    return null;
  }
  if (me.deletedUser) {
    await secureStorage.clearTokens();
    Alert.alert(t('accountTitle'), t('accountDeleted'));
    return null;
  }
  return hydrateAuthUser(me);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    try {
      const me = await api.get<GiseUserRecord>('/auth/me', { auth: true });
      const hydrated = await applySessionUser(me);
      setUser(hydrated);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await secureStorage.clearTokens();
        setUser(null);
      } else {
        console.warn('refreshMe failed:', e);
      }
    }
  }, []);

  // Herhangi bir auth'lu istek 401 aldıysa oturumu düşür; useRequireAuth kullanan
  // ekranlar kendi redirect param'ıyla login'e yönlendirir.
  useEffect(() => {
    return onUnauthorized(() => {
      setUser(null);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { accessToken } = await secureStorage.getTokens();
        if (!accessToken) {
          if (!cancelled) {
            setUser(null);
            setIsLoading(false);
          }
          return;
        }
        await refreshMe();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshMe]);

  const applyAuthResponse = useCallback(async (res: AuthLoginResponse) => {
    await secureStorage.setAccessToken(res.accessToken);
    const hydrated = await applySessionUser(res.user);
    setUser(hydrated);
    if (hydrated) {
      void touchLastLogin(hydrated.id).catch(() => {});
    }
  }, []);

  const signup = useCallback(
    async (data: SignupDto): Promise<{ userId: string }> => {
      const res = await api.post<AuthLoginResponse>('/auth/web/register', {
        email: data.email.trim().toLowerCase(),
        password: data.password,
        name: data.name.trim(),
        surname: data.surname.trim(),
        mobile: data.mobile,
        country: data.country,
        city: data.city,
        gender: data.gender,
        dob: data.dob,
        newsletter: data.newsletter,
      });
      await applyAuthResponse(res);
      return { userId: res.user.id };
    },
    [applyAuthResponse],
  );

  const verifyEmail = useCallback(
    async (_userId: string, code: string): Promise<void> => {
      await api.post<{ user: GiseUserRecord }>(
        '/auth/web/verify-email',
        { code: code.trim() },
        { auth: true },
      );
      await refreshMe();
    },
    [refreshMe],
  );

  const resendVerification = useCallback(async (_userId: string): Promise<void> => {
    throw new ApiError(
      0,
      t('resendCodeUnsupported'),
    );
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const res = await api.post<AuthLoginResponse>('/auth/web/login', {
        email: email.trim().toLowerCase(),
        password,
      });
      await applyAuthResponse(res);
      await refreshMe();
    },
    [applyAuthResponse, refreshMe],
  );

  const loginWithSsoToken = useCallback(
    async (token: string): Promise<void> => {
      const res = await api.get<AuthLoginResponse>(
        `/auth/sso/login?token=${encodeURIComponent(token)}`,
      );
      await applyAuthResponse(res);
      await refreshMe();
    },
    [applyAuthResponse, refreshMe],
  );

  const forgotPassword = useCallback(async (email: string): Promise<void> => {
    await api.post('/auth/web/forgot-password', {
      email: email.trim().toLowerCase(),
    });
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    await secureStorage.clearTokens();
    setUser(null);
  }, []);

  const setManagerSaleMode = useCallback(
    async (active: boolean): Promise<void> => {
      if (!user?.id || !user.canEnterAdminMode) return;
      await updateUser(user.id, { isManagerSaleModeActive: active });
      await refreshMe();
    },
    [user, refreshMe],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      refreshUser: refreshMe,
      signup,
      verifyEmail,
      resendVerification,
      login,
      loginWithSsoToken,
      forgotPassword,
      logout,
      setManagerSaleMode,
    }),
    [
      user,
      isLoading,
      refreshMe,
      signup,
      verifyEmail,
      resendVerification,
      login,
      loginWithSsoToken,
      forgotPassword,
      logout,
      setManagerSaleMode,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth, AuthProvider içinde kullanılmalı');
  }
  return ctx;
}

export default function AuthContextRoute() {
  return null;
}
