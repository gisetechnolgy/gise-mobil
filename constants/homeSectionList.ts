/** Yatay liste — web `constants/home-section-list.js` ile birebir */

export const HOME_SECTION_LIST_CARD_HEIGHT = 120;
export const HOME_SECTION_LIST_CARD_IMAGE_WIDTH = 92;
export const HOME_SECTION_LIST_CARD_TEXT_PADDING = 14;
/** Üst/alt metin boşluğu — yan padding'den bir tık fazla */
export const HOME_SECTION_LIST_CARD_TEXT_PADDING_Y = 17;
export const HOME_SECTION_LIST_CARD_TEXT_LINE_GAP = 2;
export const HOME_SECTION_LIST_MOBILE_SCALE = 0.82;

/** Mobil liste slide genişliği — web: calc((100vw - 32px) * 0.88) */
export const HOME_SECTION_LIST_MOBILE_SLIDE_RATIO = 0.88;

function mobilePx(value: number): number {
  return Math.round(value * HOME_SECTION_LIST_MOBILE_SCALE * 10) / 10;
}

export const LIST_CARD = {
  height: mobilePx(HOME_SECTION_LIST_CARD_HEIGHT),
  imageWidth: mobilePx(HOME_SECTION_LIST_CARD_IMAGE_WIDTH),
  /** Görsel kolon oranı — 92:115 (width:height) */
  imageAspect: HOME_SECTION_LIST_CARD_IMAGE_WIDTH / HOME_SECTION_LIST_CARD_HEIGHT,
  textPad: mobilePx(HOME_SECTION_LIST_CARD_TEXT_PADDING),
  textPadY: mobilePx(HOME_SECTION_LIST_CARD_TEXT_PADDING_Y),
  lineGap: mobilePx(HOME_SECTION_LIST_CARD_TEXT_LINE_GAP),
  radius: mobilePx(12),
  titleSize: mobilePx(15),
  metaSize: mobilePx(12),
  priceSize: mobilePx(19 * 0.92),
  buySize: mobilePx(16 * 0.85),
  gap: mobilePx(10),
  slideGap: 10,
} as const;

export function getListSlideWidth(screenWidth: number): number {
  return Math.max(0, (screenWidth - 32) * HOME_SECTION_LIST_MOBILE_SLIDE_RATIO);
}
