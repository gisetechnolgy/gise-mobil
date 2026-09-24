import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
import { AppColors } from "../../constants/colors";
import { tabBarScrollPadding } from "../../constants/tabBar";
import { useTranslation } from "../context/_LocaleContext";
import { appRefreshControl } from "../../lib/appRefreshControl";
import { fetchPageById, type CmsPage } from "../../lib/pages";
import { useIsTablet } from "../../lib/responsive";
import { AppText as Text } from "@/components/ui/AppText";

type Props = {
  pageId: string;
  fallbackTitle?: string;
};

/** Panel CMS sayfası — WebView yok, `GET /pages/:id` */
export function CmsPageScreen({ pageId, fallbackTitle }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const [page, setPage] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!pageId) return;
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
    [pageId, t],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const title = page?.title?.trim() || fallbackTitle || t("page");

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

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={AppColors.heading} />
        </View>
      ) : error || !page ? (
        <View style={styles.loader}>
          <Text style={styles.error}>{error ?? t("pageNotFound")}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            isTablet && styles.contentTablet,
            { paddingBottom: tabBarScrollPadding(isTablet, insets.bottom) },
          ]}
          refreshControl={appRefreshControl(refreshing, onRefresh)}
        >
          {page.content ? (
            <View style={styles.htmlWrap}>
              <HtmlContent html={page.content} />
            </View>
          ) : (
            <Text style={styles.empty}>{t("pageEmpty")}</Text>
          )}
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
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  error: {
    color: AppColors.cardText,
    fontFamily: "PoppinsMedium",
    fontSize: 15,
    textAlign: "center",
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
  htmlWrap: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 16,
    padding: 16,
  },
  empty: {
    color: "rgba(52, 61, 72, 0.65)",
    fontFamily: "PoppinsRegular",
    fontSize: 15,
  },
});
