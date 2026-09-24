import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import HtmlContent from "../components/HtmlContent";
import PressKitContent from "../components/PressKitContent";
import InAppPdfViewer from "../../components/InAppPdfViewer";
import { AppColors } from "../../constants/colors";
import {
  CORPORATE_DEFAULT_SLUG,
  getCorporateNavItem,
  localizeCorporateLabel,
} from "../../constants/corporateNav";
import { tabBarScrollPadding } from "../../constants/tabBar";
import { useLocale, useTranslation } from "../context/_LocaleContext";
import { appRefreshControl } from "../../lib/appRefreshControl";
import { fetchPageById, type CmsPage } from "../../lib/pages";
import { useIsTablet } from "../../lib/responsive";
import { AppText as Text } from "@/components/ui/AppText";

export default function CorporateSlugScreen() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const params = useLocalSearchParams<{ slug: string }>();
  const slugRaw = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const slug = slugRaw || CORPORATE_DEFAULT_SLUG;

  const navItem = useMemo(
    () => getCorporateNavItem(slug) ?? getCorporateNavItem(CORPORATE_DEFAULT_SLUG),
    [slug],
  );
  const navLabel = navItem
    ? localizeCorporateLabel(navItem.label, locale)
    : t("corporate");

  const [page, setPage] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(navItem?.type === "page");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageId = navItem?.pageId || navItem?.slug || "";
  const isPdf = navItem?.type === "pdf";

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!navItem || navItem.type !== "page" || !pageId) {
        setLoading(false);
        return;
      }
      const silent = options?.silent ?? false;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const data = await fetchPageById(pageId);
        if (!data) {
          setError(t("pageNotFound"));
          setPage(null);
        } else {
          setPage(data);
        }
      } catch {
        setError(t("pageLoadError"));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [navItem, pageId, t],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    if (navItem?.type !== "page") return;
    setRefreshing(true);
    try {
      await load({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [load, navItem?.type]);

  const headerTitle =
    navItem?.type === "page" && page?.title?.trim()
      ? page.title
      : navLabel;

  const renderBody = () => {
    if (!navItem) {
      return <Text style={styles.error}>{t("pageNotFound")}</Text>;
    }

    if (navItem.type === "presskit") {
      return <PressKitContent />;
    }

    if (error || !page) {
      return <Text style={styles.error}>{error ?? t("pageNotFound")}</Text>;
    }

    return page.content ? (
      <View style={styles.card}>
        <HtmlContent html={page.content} />
      </View>
    ) : (
      <Text style={styles.empty}>{t("pageEmpty")}</Text>
    );
  };

  return (
    <SafeAreaView edges={["left", "right"]} style={styles.safe}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 2 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={AppColors.cardText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {headerTitle}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {isPdf && navItem?.href ? (
        <View
          style={[
            styles.pdfWrap,
            { paddingBottom: tabBarScrollPadding(isTablet, insets.bottom) },
          ]}
        >
          <InAppPdfViewer url={navItem.href} />
        </View>
      ) : navItem?.type === "page" && loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={AppColors.heading} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            isTablet && styles.contentTablet,
            { paddingBottom: tabBarScrollPadding(isTablet, insets.bottom) },
          ]}
          refreshControl={
            navItem?.type === "page"
              ? appRefreshControl(refreshing, onRefresh)
              : undefined
          }
        >
          {renderBody()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(52, 61, 72, 0.12)",
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  contentTablet: {
    paddingHorizontal: 32,
    maxWidth: 720,
    alignSelf: "center",
    width: "100%",
  },
  pdfWrap: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  card: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 16,
    padding: 16,
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    minHeight: 180,
  },
  error: {
    color: AppColors.cardText,
    fontFamily: "PoppinsMedium",
    fontSize: 15,
    textAlign: "center",
  },
  empty: {
    color: "rgba(52, 61, 72, 0.65)",
    fontFamily: "PoppinsRegular",
    fontSize: 15,
  },
});
