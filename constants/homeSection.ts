/** Home Sections — web `constants/home-section.js` mobil compact ile birebir */

export const HOME_SECTION_CARD_WIDTH = 344;
export const HOME_SECTION_CARD_HEIGHT = 300;
export const HOME_SECTION_CARD_IMAGE_HEIGHT = 194;
/** Mockup görsel oranı — asla bozulmamalı */
export const HOME_SECTION_CARD_IMAGE_ASPECT =
  HOME_SECTION_CARD_WIDTH / HOME_SECTION_CARD_IMAGE_HEIGHT;
export const HOME_SECTION_CARD_TEXT_PADDING_X = 14;
export const HOME_SECTION_CARD_TEXT_PADDING_Y = 14;
export const HOME_SECTION_CARD_TEXT_LINE_GAP = 4;
export const HOME_SECTION_CARD_META_COLOR = '#808080';
export const HOME_SECTION_CARD_BORDER_RADIUS = 12;
export const HOME_SECTION_CARD_IMAGE_BORDER_RADIUS = 16;

/** Compact (mobil) mockup genisligi — web home-event-vertical */
export const COMPACT_CARD_WIDTH = 220;

export const MOBILE_HOME_SECTION_GAP_BETWEEN = 40;
export const MOBILE_HOME_SECTION_HEADER_GAP = 20;
export const HOME_SECTION_FOOTER_GAP = 48;
export const HOME_SECTION_CARD_GAP = 12;
export const PAGE_GUTTER = 16;

export const SECTION_BG = '#E6E6E6';
export const NAV_BORDER_COLOR = '#EBEBEB';
export const CONTROL_BORDER = '#D8DDE3';

export const EVENT_CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 7,
  elevation: 2,
} as const;

const DESIGN_SCALE = COMPACT_CARD_WIDTH / HOME_SECTION_CARD_WIDTH;

export const COMPACT = {
  width: COMPACT_CARD_WIDTH,
  imageHeight: Math.round(HOME_SECTION_CARD_IMAGE_HEIGHT * DESIGN_SCALE),
  textPaddingX: Math.round(HOME_SECTION_CARD_TEXT_PADDING_X * DESIGN_SCALE),
  textPaddingY: Math.round(
    Math.max(10, HOME_SECTION_CARD_TEXT_PADDING_Y * DESIGN_SCALE),
  ),
  textLineGap: Math.round(
    Math.max(3, HOME_SECTION_CARD_TEXT_LINE_GAP * DESIGN_SCALE),
  ),
  borderRadius: Math.round(HOME_SECTION_CARD_BORDER_RADIUS * DESIGN_SCALE),
  imageBottomRadius: Math.round(
    HOME_SECTION_CARD_IMAGE_BORDER_RADIUS * DESIGN_SCALE,
  ),
  titleSize: 13,
  metaSize: 11,
  priceSize: 15,
  priceSuffixSize: 11,
  buySize: 13,
} as const;
