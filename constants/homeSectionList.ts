/** Yatay liste — web `constants/home-section-list.js` ile birebir */
import { COMPACT } from "./homeSection";

export const HOME_SECTION_LIST_CARD_HEIGHT = 128;
export const HOME_SECTION_LIST_CARD_IMAGE_WIDTH = 100;
/** Üst = alt = görsel ile yazı arası (web ile aynı) */
export const HOME_SECTION_LIST_CARD_TEXT_PADDING = 12;
export const HOME_SECTION_LIST_CARD_TEXT_PADDING_Y = 12;
export const HOME_SECTION_LIST_CARD_TEXT_LINE_GAP = 2;
export const HOME_SECTION_LIST_MOBILE_SCALE = 0.82;

/** Mobil liste slide genişliği — web: calc((100vw - 32px) * 0.88) */
export const HOME_SECTION_LIST_MOBILE_SLIDE_RATIO = 0.88;

/**
 * Kart 1 (dikey) ile aynı tipografi — HomeEventCard:
 * title 13 / meta 12 / price 12 / buy 13
 */
export const CARD_TEXT = {
  titleSize: COMPACT.titleSize,
  metaSize: 12,
  priceSize: 12,
  buySize: COMPACT.buySize,
} as const;

function mobilePx(value: number): number {
  return Math.round(value * HOME_SECTION_LIST_MOBILE_SCALE * 10) / 10;
}

export const LIST_CARD = {
  /** Başlık / tarih-mekan / çizgi / fiyat arası eşit boşluk için uzatıldı — görsel oranı korunur */
  height: mobilePx(148),
  imageWidth: mobilePx(115),
  /** Görsel kolon oranı — 100:128 */
  imageAspect: HOME_SECTION_LIST_CARD_IMAGE_WIDTH / HOME_SECTION_LIST_CARD_HEIGHT,
  textPad: mobilePx(HOME_SECTION_LIST_CARD_TEXT_PADDING),
  textPadY: mobilePx(HOME_SECTION_LIST_CARD_TEXT_PADDING_Y),
  lineGap: mobilePx(HOME_SECTION_LIST_CARD_TEXT_LINE_GAP),
  radius: mobilePx(12),
  titleSize: CARD_TEXT.titleSize,
  metaSize: CARD_TEXT.metaSize,
  priceSize: CARD_TEXT.priceSize,
  buySize: CARD_TEXT.buySize,
  gap: mobilePx(10),
  slideGap: 10,
} as const;

export function getListSlideWidth(screenWidth: number): number {
  return Math.max(0, (screenWidth - 32) * HOME_SECTION_LIST_MOBILE_SLIDE_RATIO);
}
