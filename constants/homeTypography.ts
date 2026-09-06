import type { TextStyle } from 'react-native';
import { AppColors } from './colors';

/** Ana sayfa bölüm başlıkları (Etkinlik Kategorileri, Etkinlikler, vb.) */
export function homeSectionTitleStyle(isTablet: boolean): TextStyle {
  return {
    color: AppColors.heading,
    fontSize: isTablet ? 18 : 16,
    fontFamily: 'PoppinsMedium',
    lineHeight: isTablet ? 24 : 22,
  };
}

export function formatHomeSectionTitle(title: string): string {
  return `• ${title}`;
}

export function homeSeeAllStyle(isTablet: boolean): TextStyle {
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
    fontSize: isTablet ? 20 : 18,
    fontFamily: 'PoppinsMedium',
    lineHeight: isTablet ? 26 : 24,
  };
}
