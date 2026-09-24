/** Floating PersistentTabBar — scroll içeriği barın üstünde bitsin */
export const TAB_BAR_SCROLL_BOTTOM = {
  phone: 100,
  tablet: 120,
} as const;

export function tabBarScrollPadding(
  isTablet: boolean,
  safeBottom = 0,
): number {
  return (
    (isTablet ? TAB_BAR_SCROLL_BOTTOM.tablet : TAB_BAR_SCROLL_BOTTOM.phone) +
    safeBottom
  );
}
