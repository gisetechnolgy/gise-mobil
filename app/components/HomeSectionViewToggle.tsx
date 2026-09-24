import { StyleSheet, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { SiteIcon } from "@/components/icons/SiteIcon";
import { getHomeSectionChrome } from "../../constants/homeTypography";
import { useTranslation } from "../context/_LocaleContext";

export type HomeViewMode = "list" | "grid";

type Props = {
  view: HomeViewMode;
  onChange: (mode: HomeViewMode) => void;
  /**
   * Sabit yükseklik — etkinlikler toolbar’da Filtre select (34) ile aynı boy.
   * Verilmezse ana sayfa chrome ölçeği kullanılır.
   */
  height?: number;
};

/** Web HomeSectionViewToggle — ekran genişliğine göre ölçeklenir */
export default function HomeSectionViewToggle({
  view,
  onChange,
  height: heightProp,
}: Props) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const chrome = getHomeSectionChrome(width);

  const height = heightProp ?? chrome.height;
  const segmentW = heightProp != null ? height : chrome.toggleSegment;
  const iconSize =
    heightProp != null
      ? Math.max(14, Math.round(height * 0.42))
      : chrome.toggleIcon;
  const radius = heightProp != null ? 8 : chrome.toggleRadius;

  return (
    <View
      style={[
        styles.wrap,
        {
          width: segmentW * 2,
          height,
          borderRadius: radius,
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.thumb,
          { borderRadius: radius },
          view === "list" ? styles.thumbLeft : styles.thumbRight,
        ]}
      />
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t("listView")}
        accessibilityState={{ selected: view === "list" }}
        onPress={() => onChange("list")}
        style={styles.segment}
        activeOpacity={0.85}
      >
        <SiteIcon icon="vList" size={iconSize} color="#1A1A1A" />
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t("gridView")}
        accessibilityState={{ selected: view === "grid" }}
        onPress={() => onChange("grid")}
        style={styles.segment}
        activeOpacity={0.85}
      >
        <SiteIcon icon="vGrid" size={iconSize} color="#1A1A1A" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#F0F0F0",
    overflow: "hidden",
    flexShrink: 0,
  },
  thumb: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "50%",
    backgroundColor: "#FFFFFF",
  },
  thumbLeft: { left: 0 },
  thumbRight: { left: "50%" },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
});
