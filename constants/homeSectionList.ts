/** Yatay liste — web `constants/home-section-list.js` ile birebir */

export const HOME_SECTION_LIST_CARD_HEIGHT = 128;
export const HOME_SECTION_LIST_CARD_IMAGE_WIDTH = 100;
/** Üst = alt = görsel ile yazı arası (web ile aynı) */
export const HOME_SECTION_LIST_CARD_TEXT_PADDING = 12;
export const HOME_SECTION_LIST_CARD_TEXT_PADDING_Y = 12;
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
  /** Görsel kolon oranı — 100:128 */
  imageAspect: HOME_SECTION_LIST_CARD_IMAGE_WIDTH / HOME_SECTION_LIST_CARD_HEIGHT,
  textPad: mobilePx(HOME_SECTION_LIST_CARD_TEXT_PADDING),
  textPadY: mobilePx(HOME_SECTION_LIST_CARD_TEXT_PADDING_Y),
  lineGap: mobilePx(HOME_SECTION_LIST_CARD_TEXT_LINE_GAP),
  radius: mobilePx(12),
  titleSize: mobilePx(15),
  metaSize: mobilePx(13),
  priceSize: mobilePx(15),
  buySize: mobilePx(16 * 0.85),
  gap: mobilePx(10),
  slideGap: 10,
} as const;

export function getListSlideWidth(screenWidth: number): number {
  return Math.max(0, (screenWidth - 32) * HOME_SECTION_LIST_MOBILE_SLIDE_RATIO);
}
