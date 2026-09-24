import React from "react";
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DEFAULT_HERO_BANNER_URL } from "../../constants/hero";
import { useIsTablet } from "../../lib/responsive";
import { resolveAssetUrl, useBranding } from "../context/BrandingContext";
import { useTranslation } from "../context/_LocaleContext";
import { AppText as Text } from "@/components/ui/AppText";

const GISE_LOGO = require("../../assets/images/gisekibris-logo.png");

interface Props {
  children: React.ReactNode;
  /** Logo + slogan üst bloğunu gizlemek için (örn. forgot/verify success ekranlarında). */
  hideHeader?: boolean;
  /** İçerik scroll wrapper'ına ek style. */
  contentStyle?: StyleProp<ViewStyle>;
  /** Sağ üstte gösterilecek aksiyon (örn. "EN" dil seçici). Yoksa hiçbir şey çizilmez. */
  rightHeaderAction?: React.ReactNode;
}

/** Logo / slogan ile form arası (≈1–2 tık) */
const GAP_BEFORE_FORM = 14;
/** Logo ile slogan arası */
const GAP_LOGO_TO_SLOGAN = 8;

/**
 * gişeKıbrıs tarzı auth ekran kabuğu:
 * - Ana sayfa hero ile aynı arka plan görseli
 * - Üstte hafif koyu overlay
 * - Platform logosu + slogan
 * - İçerik
 *
 * Her auth ekranı (login/register/verify/forgot) bu wrapper'ı kullanır.
 */
export default function AuthScreenLayout({
  children,
  hideHeader,
  contentStyle,
  rightHeaderAction,
}: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const { branding } = useBranding();
  const heroUri =
    resolveAssetUrl(branding?.mobileBannerUrl) ?? DEFAULT_HERO_BANNER_URL;
  const heroSource: ImageSourcePropType = { uri: heroUri };
  const showBrandHeader = !hideHeader;
  const topSpacerHeight = Math.min(
    Math.max(Math.round(windowHeight * 0.17), 56),
    168,
  );

  return (
    <View style={styles.bg}>
      <ImageBackground
        source={heroSource}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
      />
      {/* Görselin üstüne koyu overlay — okunurluk için */}
      <View style={styles.overlay} pointerEvents="none" />

      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
        >
          {/* Sağ üst aksiyon (opsiyonel) */}
          {rightHeaderAction !== undefined && (
            <View style={styles.topRow}>{rightHeaderAction}</View>
          )}

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.scroll, styles.scrollGrow]}
            showsVerticalScrollIndicator={false}
          >
            {showBrandHeader ? (
              <View style={{ height: topSpacerHeight }} />
            ) : null}
            {showBrandHeader ? <BrandHeader /> : null}
            <View style={[styles.authContent, contentStyle]}>{children}</View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function BrandHeader() {
  const isTablet = useIsTablet();
  const { branding } = useBranding();
  const { t } = useTranslation();

  const logoWidth = isTablet ? 280 : 220;
  const logoHeight = isTablet ? 96 : 76;
  const slogan = branding?.loginSlogan?.trim() || t("platformSlogan");

  return (
    <View style={styles.header}>
      <Image
        source={GISE_LOGO}
        resizeMode="contain"
        accessibilityLabel="gişeKıbrıs"
        style={[
          styles.logo,
          {
            width: logoWidth,
            height: logoHeight,
            marginBottom: GAP_LOGO_TO_SLOGAN,
          },
        ]}
      />
      <Text style={[styles.slogan, { marginBottom: GAP_BEFORE_FORM }]}>
        {slogan}
      </Text>
    </View>
  );
}

/**
 * Dil seçici (placeholder — şimdilik sadece TR/EN toggle UI; gerçek i18n sonra).
 * `onPress` verilmezse tıklanamaz, sadece dekoratif.
 */
export function LanguageBadge({
  current,
  onPress,
}: {
  current: "TR" | "EN";
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={styles.langBadge}
    >
      <Text style={styles.langText}>{current}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "#0a0a14",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(8, 8, 18, 0.55)",
  },
  safe: {
    flex: 1,
  },
  flex: { flex: 1 },
  topRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 4,
    minHeight: 28,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  scrollGrow: {
    flexGrow: 1,
  },
  authContent: {
    flexGrow: 1,
    width: "100%",
  },
  header: {
    alignItems: "center",
  },
  logo: {
    tintColor: "#fff",
    opacity: 0.95,
  },
  slogan: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
    fontFamily: "PoppinsMedium",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  langBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  langText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "PoppinsSemiBold",
    letterSpacing: 1,
  },
});
