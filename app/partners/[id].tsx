import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppColors } from "../../constants/colors";
import {
  COMPACT,
  EVENT_CARD_SHADOW,
  HOME_SECTION_CARD_GAP,
  NAV_BORDER_COLOR,
  PAGE_GUTTER,
  SECTION_BG,
} from "../../constants/homeSection";
import { tabBarScrollPadding } from "../../constants/tabBar";
import { useLocale, useTranslation } from "../context/_LocaleContext";
import { useIsTablet } from "../../lib/responsive";
import {
  fetchLoyaltyAppsPage,
  storeUrlForDevice,
  type LoyaltyMobileApp,
} from "../../lib/loyaltyApps";
import {
  formatHomeSectionTitle,
  homeSectionTitleStyle,
} from "../../constants/homeTypography";
import { AppText as Text } from "@/components/ui/AppText";

const PARTNERS: Record<
  string,
  {
    title: { tr: string; en: string };
    blurb: { tr: string; en: string };
    url: string;
  }
> = {
  kupon: {
    title: { tr: "Kupon Kıbrıs", en: "Kupon Kıbrıs" },
    blurb: {
      tr: "İndirim kuponları için PracticApp ürünü.",
      en: "PracticApp product for discount coupons.",
    },
    url: "https://kuponkibris.com",
  },
  bostamasa: {
    title: { tr: "Boşta Masa", en: "Boşta Masa" },
    blurb: {
      tr: "Restoran rezervasyonu için PracticApp ürünü.",
      en: "PracticApp product for restaurant reservations.",
    },
    url: "https://bostamasa.com",
  },
  kariyer: {
    title: { tr: "Kariyer Kıbrıs", en: "Kariyer Kıbrıs" },
    blurb: {
      tr: "İş ilanları için PracticApp ürünü.",
      en: "PracticApp product for job listings.",
    },
    url: "https://kariyerkibris.com",
  },
  support: {
    title: { tr: "Destek", en: "Support" },
    blurb: {
      tr: "Yardım merkezi ayrı bir servistir. Ticket açmak için aşağıdan gidebilirsiniz.",
      en: "Help centre is a separate service. Open it below to create a ticket.",
    },
    url: "https://destek.gisekibris.com",
  },
};

function openAppStore(app: LoyaltyMobileApp) {
  const url = storeUrlForDevice(app);
  if (url) void Linking.openURL(url);
}

function accentPair(color: string | null): [string, string] {
  const base = color?.trim() || AppColors.accent;
  return [base, "#0E1F58"];
}

/** HomeEventCard grid — görsel/yazı/URL panelden */
function LoyaltyAppCard({
  app,
  downloadLabel,
}: {
  app: LoyaltyMobileApp;
  downloadLabel: string;
}) {
  const displayName =
    app.title.length > 30 ? `${app.title.slice(0, 30)}...` : app.title;
  const [c0, c1] = accentPair(app.accentColor);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => openAppStore(app)}
      style={[
        styles.card,
        EVENT_CARD_SHADOW,
        { borderRadius: COMPACT.borderRadius },
      ]}
    >
      <View
        style={[
          styles.cover,
          {
            aspectRatio: 1,
            borderTopLeftRadius: COMPACT.borderRadius,
            borderTopRightRadius: COMPACT.borderRadius,
            borderBottomLeftRadius: COMPACT.imageBottomRadius,
            borderBottomRightRadius: COMPACT.imageBottomRadius,
          },
        ]}
      >
        {app.imageUrl ? (
          <Image
            source={{ uri: app.imageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            recyclingKey={app.id}
          />
        ) : (
          <LinearGradient
            colors={[c0, c1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        {!app.imageUrl ? (
          <View style={styles.coverIcon}>
            <Ionicons name="phone-portrait" size={36} color="#FFFFFF" />
          </View>
        ) : null}
        {app.category ? (
          <View style={styles.badgeWrap}>
            <View style={styles.badge}>
              <Text style={styles.badgeText} numberOfLines={1}>
                {app.category}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.content,
          {
            paddingHorizontal: COMPACT.textPaddingX,
            paddingVertical: COMPACT.textPaddingY,
            gap: COMPACT.textLineGap,
            minHeight: 88,
          },
        ]}
      >
        <Text style={styles.title} numberOfLines={1}>
          {displayName}
        </Text>
        {app.subtitle ? (
          <Text style={styles.meta} numberOfLines={2}>
            {app.subtitle}
          </Text>
        ) : null}
        <View style={styles.footer}>
          <View />
          <Text style={styles.buyLabel}>{downloadLabel}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function LoyaltyMobileAppsScreen() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { width: screenW } = useWindowDimensions();
  const [apps, setApps] = useState<LoyaltyMobileApp[]>([]);
  const [pageHeading, setPageHeading] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await fetchLoyaltyAppsPage(locale === "en" ? "en" : "tr");
      setApps(page.apps);
      setPageHeading(page.heading);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const cols = isTablet ? 3 : 2;
  const gap = HOME_SECTION_CARD_GAP;
  const cardW = (screenW - PAGE_GUTTER * 2 - gap * (cols - 1)) / cols;

  return (
    <SafeAreaView edges={["left", "right"]} style={styles.safe}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 2 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={AppColors.cardText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {t("loyaltyAppsTitle")}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: PAGE_GUTTER,
          paddingTop: 16,
          paddingBottom: tabBarScrollPadding(isTablet, insets.bottom),
        }}
        showsVerticalScrollIndicator={false}
      >
        {pageHeading ? (
          <Text style={[homeSectionTitleStyle(isTablet), styles.pageHeading]}>
            {formatHomeSectionTitle(pageHeading)}
          </Text>
        ) : null}

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={AppColors.heading} />
          </View>
        ) : (
          <View style={[styles.grid, { gap }]}>
            {apps.map((app) => (
              <View key={app.id} style={{ width: cardW }}>
                <LoyaltyAppCard
                  app={app}
                  downloadLabel={t("loyaltyDownload")}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function PartnerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const partnerId = Array.isArray(id) ? id[0] : id;

  if (partnerId === "loyalty") {
    return <LoyaltyMobileAppsScreen />;
  }

  const partner = PARTNERS[partnerId ?? ""] ?? null;
  const { t } = useTranslation();
  const { locale } = useLocale();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();

  const title = useMemo(() => {
    if (!partner) return t("pageNotFound");
    return locale === "en" ? partner.title.en : partner.title.tr;
  }, [locale, partner, t]);

  return (
    <SafeAreaView edges={["left", "right"]} style={styles.safe}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 2 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={AppColors.cardText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <View
        style={[
          styles.body,
          { paddingBottom: tabBarScrollPadding(isTablet, insets.bottom) },
        ]}
      >
        {partner ? (
          <>
            <Text style={styles.blurb}>
              {locale === "en" ? partner.blurb.en : partner.blurb.tr}
            </Text>
            <TouchableOpacity
              style={styles.cta}
              activeOpacity={0.85}
              onPress={() => void Linking.openURL(partner.url)}
            >
              <Text style={styles.ctaText}>{t("openExternal")}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.blurb}>{t("pageNotFound")}</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SECTION_BG },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: NAV_BORDER_COLOR,
    backgroundColor: AppColors.cardBg,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: AppColors.cardText,
    fontFamily: "PoppinsSemiBold",
    fontSize: 17,
  },
  pageHeading: {
    marginBottom: 14,
  },
  loading: { paddingVertical: 48, alignItems: "center" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  card: {
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    width: "100%",
  },
  cover: {
    width: "100%",
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  coverIcon: { zIndex: 1 },
  badgeWrap: {
    position: "absolute",
    top: 8,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 5,
  },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: "90%",
    backgroundColor: AppColors.accent,
  },
  badgeText: {
    fontFamily: "PoppinsBold",
    fontSize: 11,
    lineHeight: 14,
    color: "#FFFFFF",
  },
  content: { flexGrow: 1 },
  title: {
    color: AppColors.heading,
    fontFamily: "PoppinsBold",
    fontSize: COMPACT.titleSize,
    lineHeight: Math.round(COMPACT.titleSize * 1.25),
  },
  meta: {
    color: "#808080",
    fontFamily: "PoppinsRegular",
    fontSize: COMPACT.metaSize,
    lineHeight: Math.round(COMPACT.metaSize * 1.25),
  },
  footer: {
    marginTop: "auto",
    paddingTop: 4,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  buyLabel: {
    color: AppColors.accent,
    fontFamily: "PoppinsBold",
    fontSize: COMPACT.buySize,
    flexShrink: 0,
    marginTop: 1,
  },
  body: { padding: 20, gap: 16 },
  blurb: {
    color: "rgba(52, 61, 72, 0.8)",
    fontFamily: "PoppinsRegular",
    fontSize: 15,
    lineHeight: 22,
  },
  cta: {
    alignSelf: "flex-start",
    backgroundColor: AppColors.heading,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  ctaText: {
    color: "#FFF",
    fontFamily: "PoppinsSemiBold",
    fontSize: 14,
  },
});
