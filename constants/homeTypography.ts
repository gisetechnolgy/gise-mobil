import type { TextStyle, ViewStyle } from 'react-native';
import { AppColors } from './colors';

/** Web mobil section heading — 14/700 primary */
export function homeSectionTitleStyle(_isTablet?: boolean): TextStyle {
  return {
    color: AppColors.accent,
    fontSize: 14,
    fontFamily: 'PoppinsBold',
    lineHeight: 17,
    letterSpacing: -0.14,
  };
}

export function formatHomeSectionTitle(title: string): string {
  return `• ${title}`;
}

/** Phone compact (web <768) → tablet/desktop mockup (web ≥768) */
const CHROME_PHONE_W = 360;
const CHROME_TABLET_W = 768;

function chromeT(screenWidth: number): number {
  const w = Math.max(0, Number(screenWidth) || CHROME_PHONE_W);
  return Math.min(1, Math.max(0, (w - CHROME_PHONE_W) / (CHROME_TABLET_W - CHROME_PHONE_W)));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export type HomeSectionChrome = {
  height: number;
  seeAllPadX: number;
  seeAllRadius: number;
  seeAllFont: number;
  seeAllChevron: number;
  toggleSegment: number;
  toggleIcon: number;
  toggleRadius: number;
};

/**
 * Tümünü Göster + tasarım değiştirici — ekran genişliğine göre ölçek.
 * 360px → mobil chrome, 768px+ → desktop mockup.
 */
export function getHomeSectionChrome(screenWidth: number): HomeSectionChrome {
  const t = chromeT(screenWidth);
  return {
    height: Math.round(lerp(31, 36, t)),
    /** Yatay padding yok — yazı↔değiştirici boşluğu sadece gap (8) = başlık pr */
    seeAllPadX: 0,
    seeAllRadius: Math.round(lerp(7, 8, t)),
    /** Satın Al (COMPACT.buySize = 13) ile aynı */
    seeAllFont: 13,
    seeAllChevron: Math.round(lerp(11, 13, t)),
    toggleSegment: Math.round(lerp(30, 34, t)),
    toggleIcon: Math.round(lerp(13, 15, t)),
    toggleRadius: Math.round(lerp(7, 8, t)),
  };
}

/** Web "Tümünü Göster" pill — ekrana göre ölçeklenir */
export function homeSeeAllButtonStyle(screenWidth?: number): ViewStyle {
  const c = getHomeSectionChrome(screenWidth ?? CHROME_PHONE_W);
  return {
    height: c.height,
    paddingHorizontal: 0,
    paddingVertical: 0,
    paddingLeft: 0,
    paddingRight: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  };
}

/** Web "Tümünü Göster" buton içi metin — global renk, arka plan yok */
export function homeSeeAllStyle(screenWidth?: number): TextStyle {
  const c = getHomeSectionChrome(screenWidth ?? CHROME_PHONE_W);
  return {
    fontFamily: 'PoppinsBold',
    color: AppColors.accent,
    fontSize: c.seeAllFont,
  };
}

/** Eski metin-link varyantı (mekanlar vb.) */
export function homeSeeAllLinkStyle(isTablet?: boolean): TextStyle {
  return {
    fontFamily: 'PoppinsRegular',
    color: AppColors.accent,
    fontSize: isTablet ? 14 : 13,
  };
}

/** Carousel bölüm başlığı — banner üzerinde beyaz metin */
export function homeCarouselTitleStyle(isTablet: boolean): TextStyle {
  return {
    color: '#FFFFFF',
    fontSize: isTablet ? 18 : 14,
    fontFamily: 'PoppinsBold',
    lineHeight: isTablet ? 24 : 17,
  };
}
