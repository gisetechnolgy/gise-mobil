/** Web search dropdown / panel olculer */

export const SEARCH_PANEL_PAD_X = 20;
export const SEARCH_PANEL_PAD_Y = 20;
export const SEARCH_SECTION_TITLE_GAP = 15;
export const SEARCH_FEATURED_TO_DIVIDER = 20;
export const SEARCH_DIVIDER_TO_CATEGORIES = 20;
export const SEARCH_FEATURED_CARD_GAP = 14;
/** Web SEARCH_FEATURED_CARD_WIDTH — mobil de aynı hedef genişlik */
export const SEARCH_FEATURED_CARD_WIDTH = 255;
export const SEARCH_FEATURED_IMAGE_W = 64;
export const SEARCH_FEATURED_IMAGE_H = 96;
/** Başlık + tarih + mekan + fiyat — thumb ile hizalı */
export const SEARCH_FEATURED_CARD_MIN_H = 108;
export const SEARCH_FEATURED_CARD_RADIUS = 10;
export const SEARCH_CATEGORY_PILL_H = 30;
export const SEARCH_CATEGORY_PILL_GAP = 15;
export const SEARCH_RESULT_THUMB = 48;
export const SEARCH_RESULT_THUMB_RADIUS = 6;
export const SEARCH_RESULT_ITEM_GAP = 16;
export const SEARCH_INPUT_H = 46;
export const SEARCH_BTN_H = 36;

/**
 * Search öne çıkan — yükseklik sabit; genişlik kısa kalmasın.
 * Content’in ~%88’i (sonraki kart peek), en az 255 hedef.
 */
export function getSearchFeaturedCardWidth(screenWidth: number): number {
  const w = Math.max(0, screenWidth || 0);
  if (w <= 0) return SEARCH_FEATURED_CARD_WIDTH;
  const content = Math.max(0, w - SEARCH_PANEL_PAD_X * 2);
  const wide = Math.round(content * 0.88);
  return Math.min(Math.max(wide, SEARCH_FEATURED_CARD_WIDTH), content);
}
