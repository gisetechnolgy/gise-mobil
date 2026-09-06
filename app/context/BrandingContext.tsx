import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ImageSourcePropType } from "react-native";
import { API_URL } from "../../lib/api";
import { fetchAppBranding, clearBrandingCache } from "../../lib/brandingSource";
import { useLocale } from "./LocaleContext";

export interface Branding {
  id: string;
  name: string;
  logoUrl: string | null;
  loginBackgroundUrl: string | null;
  loginSlogan: string | null;
  mobileBannerUrl: string | null;
  mobileTermsTitle: string | null;
  mobileTermsContent: string | null;
  headline?: string | null;
  subheadline?: string | null;
  ctaLabel?: string | null;
  ctaLink?: string | null;
}

export function resolveAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (
    url.startsWith("data:") ||
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {
    return url;
  }
  return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

interface BrandingContextValue {
  branding: Branding | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue | null>(null);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale();
  const [branding, setBranding] = useState<Branding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      clearBrandingCache();
      const data = await fetchAppBranding({ refresh: true });
      setBranding(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Branding yüklenemedi";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, locale]);

  const value = useMemo<BrandingContextValue>(
    () => ({ branding, loading, error, refresh }),
    [branding, loading, error, refresh],
  );

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding(): BrandingContextValue {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    throw new Error("useBranding, BrandingProvider içinde kullanılmalı");
  }
  return ctx;
}

export function useAuthBackgroundSource(): ImageSourcePropType | null {
  const { branding } = useBranding();
  const resolved = resolveAssetUrl(branding?.loginBackgroundUrl);
  if (resolved) {
    return { uri: resolved };
  }
  return null;
}

const DEFAULT_HERO_SOURCE: ImageSourcePropType = require("../../assets/photos/cageee.webp");
const GISE_LOGO = require("../../assets/images/gisekibris-logo.png");

export function useHomeBannerSource(): ImageSourcePropType {
  const { branding } = useBranding();
  const resolved = resolveAssetUrl(branding?.mobileBannerUrl);
  if (resolved) {
    return { uri: resolved };
  }
  return DEFAULT_HERO_SOURCE;
}

export function usePlatformLogoSource(): ImageSourcePropType {
  return GISE_LOGO;
}

export default function BrandingContextRoute() {
  return null;
}
