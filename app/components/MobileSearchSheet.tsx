import { useEffect, useMemo, useState } from "react";
import { Keyboard, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsTablet } from "../../lib/responsive";
import SearchPanelContent from "./SearchPanelContent";

type Props = {
  visible: boolean;
  /** Header altından başlasın — measured height */
  topOffset: number;
  query: string;
  scope?: "all" | "events" | "venues";
};

/**
 * Search sheet: header altından ekran dibine kadar beyaz kaplar
 * (arka plan sızmasın). Liste içeriği tab bar üstünde kalsın diye
 * alttan padding alır.
 */
export default function MobileSearchSheet({
  visible,
  topOffset,
  query,
  scope = "all",
}: Props) {
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  /** PersistentTabBar ile aynı ölçü — sadece scroll padding için */
  const tabBarClearance = useMemo(() => {
    const bottomOffset = Math.max(insets.bottom, 12) + 8;
    const barHeight = isTablet ? 82 : 68;
    return bottomOffset + barHeight + 10;
  }, [insets.bottom, isTablet]);

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      return;
    }

    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [visible]);

  if (!visible || topOffset <= 0) return null;

  // Panel her zaman dibe kadar beyaz; klavye açıksa üstünde biter.
  const bottomInset = keyboardHeight > 0 ? keyboardHeight : 0;
  // Klavye yokken tab bar kadar, varken ekstra gerekmez (sheet zaten klavyenin üstünde).
  const contentBottomPad =
    keyboardHeight > 0 ? 24 : tabBarClearance;

  return (
    <View
      style={[
        styles.sheet,
        {
          top: topOffset,
          bottom: bottomInset,
        },
      ]}
      pointerEvents="auto"
    >
      <SearchPanelContent
        query={query}
        scope={scope}
        bottomPadding={contentBottomPad}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    backgroundColor: "#FFFFFF",
    elevation: 16,
    overflow: "hidden",
  },
});
