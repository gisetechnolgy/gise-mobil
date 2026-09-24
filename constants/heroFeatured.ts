/** Hero carousel — web `constants/hero-featured.js` ile birebir */

export const HERO_CARD_WIDTH = 275;
export const HERO_CARD_HEIGHT = 344;
export const HERO_BUY_BUTTON_HEIGHT = 40;
export const HERO_BUY_BUTTON_OVERFLOW = Math.ceil(HERO_BUY_BUTTON_HEIGHT / 2);
export const HERO_CARD_TEXT_INSET = 20;
export const HERO_CARD_TEXT_LINE_GAP = 4;
export const HERO_CARD_META_FONT_SIZE = 11;
export const HERO_CARD_PRICE_AMOUNT_FONT_SIZE = 18;
export const HERO_BUY_BUTTON_FONT_SIZE = 15;
export const HERO_CARD_META_COLOR = '#CCCCCC';
export const HERO_CARD_GRADIENT_COLOR = '#0C0C1A';
export const HERO_BUY_BUTTON_SIDE_INSET = 72;
export const HERO_CARD_BOX_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.2,
  shadowRadius: 9,
  elevation: 6,
} as const;
export const HERO_CARD_BUY_BOX_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.14,
  shadowRadius: 6,
  elevation: 4,
} as const;

export const MOBILE_HERO_GAP = 12;
export const MOBILE_HERO_SIDE_PADDING = 16;
export const MOBILE_HERO_SECTION_PADDING = 20;
export const MOBILE_HERO_PEEK_RATIO = 0.32;
export const MOBILE_HERO_CARD_WIDTH_FALLBACK = 148;

export const HERO_GRADIENT_EDGE = '#121229';
export const HERO_GRADIENT_MID = '#501333';
export const HERO_BG_BASE = '#121229';
export const CAROUSEL_BG_PRIMARY = '#AE256D';

/** Viewport: 2*card + gap + peek*card = width */
export function getMobileHeroCardWidth(viewportWidth: number): number {
  const w = Math.max(0, Number(viewportWidth) || 0);
  if (w <= 0) return MOBILE_HERO_CARD_WIDTH_FALLBACK;
  const card = Math.floor((w - MOBILE_HERO_GAP) / (2 + MOBILE_HERO_PEEK_RATIO));
  return Math.max(120, Math.min(200, card));
}
