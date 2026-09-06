import { Platform, useWindowDimensions } from "react-native";

/**
 * Tablet detection for layout sizing.
 * - iOS: Platform.isPad is reliable.
 * - Others: width breakpoint keeps phone UI unchanged.
 */
export function useIsTablet(): boolean {
  const { width, height } = useWindowDimensions();
  const shortest = Math.min(width, height);
  return (Platform.OS === "ios" && (Platform as any).isPad) || shortest >= 768;
}

/** FloatingTabBar ile aynı yatay kenar boşluğu */
export function getScreenHorizontalInset(isTablet: boolean): number {
  return isTablet ? 28 : 20;
}

/** Anasayfa etkinlik kartları ve FloatingTabBar köşe yarıçapı */
export const HOME_CARD_BORDER_RADIUS = 15;

