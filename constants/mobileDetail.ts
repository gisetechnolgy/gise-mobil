/** Web mobil immersive detail shell — event / venue / org ortak ölçüler */

export const DETAIL_ACCENT = '#AE256D';
export const DETAIL_ICON = '#1A1A1A';
export const DETAIL_PAGE_BG = '#EFEFEF';
export const DETAIL_CARD_RADIUS = 14;
/** Sticky bar kabaca (safe area hariç) — venue/org scroll pad */
export const DETAIL_STICKY_CTA_HEIGHT = 60;
/** @deprecated Hero artık HOME_SECTION_CARD_IMAGE_ASPECT (344/194) kullanıyor */
export const DETAIL_HERO_HEIGHT = 260;
export const DETAIL_BODY_PX = 12;
export const DETAIL_BODY_OVERLAP = -22;
export const DETAIL_BODY_GAP = 10;
export const DETAIL_CARD_PAD = 14;
export const DETAIL_THUMB_WIDTH = 86;
export const DETAIL_THUMB_MIN_HEIGHT = 108;
export const DETAIL_THUMB_RADIUS = 10;
export const DETAIL_LAYOUT_THUMB = { width: 78, height: 58, radius: 8 };
export const DETAIL_ACTION_HEIGHT = 34;
/** Sticky Satın Al — biraz daha kompakt */
export const DETAIL_STICKY_BTN_HEIGHT = 44;
export const DETAIL_STICKY_BTN_RADIUS = 12;
export const DETAIL_STICKY_BAR_RADIUS = 16;
export const DETAIL_STICKY_BAR_PAD_TOP = 8;
export const DETAIL_STICKY_BAR_PAD_BOTTOM = 8;
/** Scroll alt boşluğu hesabı: padTop + btn + padBottom (+ safe area ayrı) */
export const DETAIL_STICKY_BAR_CONTENT_HEIGHT =
  DETAIL_STICKY_BAR_PAD_TOP +
  DETAIL_STICKY_BTN_HEIGHT +
  DETAIL_STICKY_BAR_PAD_BOTTOM;
export const PAST_EVENTS_PAGE = 6;

export const DETAIL_CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.04,
  shadowRadius: 5,
  elevation: 1,
} as const;

/** Yatay event kartı — web home-section-list ile birebir */
export {
  LIST_CARD,
  HOME_SECTION_LIST_MOBILE_SCALE as LIST_CARD_SCALE,
} from './homeSectionList';

/** Liste sayfası vertical card — home-section tokens (344×194 görsel oranı) */
export const ENTITY_LIST_CARD = {
  imageHeight: 194,
  imageAspect: 344 / 194,
  minHeight: 300,
  radius: 12,
  imageBottomRadius: 16,
  textPad: 14,
  lineGap: 4,
  titleSize: 15,
  metaSize: 11,
} as const;
