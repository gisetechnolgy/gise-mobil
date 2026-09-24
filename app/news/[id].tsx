import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import HtmlContent from "../components/HtmlContent";
import { RemoteCardImage } from "../components/_RemoteCardImage";
import { AppColors } from "../../constants/colors";
import { useTranslation } from "../context/_LocaleContext";
import { appRefreshControl } from "../../lib/appRefreshControl";
import {
  fetchNewsById,
  formatNewsDate,
  newsImageUrl,
  type NewsItem,
} from "../../lib/news";
import { useIsTablet } from "../../lib/responsive";
import { AppText as Text } from "@/components/ui/AppText";

export default function NewsDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!id) return;
      const silent = options?.silent ?? false;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const data = await fetchNewsById(id);
        if (!data) {
          setError(t("newsNotFound"));
          setItem(null);
        } else {
          setItem(data);
        }
      } catch {
        setError(t("newsLoadError"));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id],
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

  return (
    <SafeAreaView edges={["left", "right"]} style={styles.safe}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 2 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={AppColors.cardText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Haber</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={AppColors.accent} />
        </View>
      ) : error || !item ? (
        <View style={styles.loader}>
          <Text style={styles.error}>{error ?? t("newsNotFound")}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            isTablet && styles.contentTablet,
          ]}
          refreshControl={appRefreshControl(refreshing, onRefresh)}
        >
          <RemoteCardImage
            uri={newsImageUrl(item, 800)}
            recyclingKey={item.id}
            style={[styles.banner, isTablet && styles.bannerTablet]}
          />
          <Text style={styles.date}>{formatNewsDate(item.date)}</Text>
          <Text style={[styles.title, isTablet && styles.titleTablet]}>
            {item.title}
          </Text>
          {item.subtitle ? (
            <Text style={styles.subtitle}>
              {item.subtitle.replace(/<[^>]+>/g, "")}
            </Text>
          ) : null}
          {item.content ? (
            <View style={styles.htmlWrap}>
              <HtmlContent html={item.content} />
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.background },
  header: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  backBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#000000", fontSize: 18, fontFamily: "PoppinsSemiBold" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  contentTablet: { padding: 22, gap: 14 },
  banner: { width: "100%", height: 220, borderRadius: 16, overflow: "hidden" },
  bannerTablet: { height: 280, borderRadius: 20 },
  date: { color: AppColors.navBg, fontSize: 14, fontFamily: "PoppinsBold" },
  title: { color: AppColors.cardText, fontSize: 24, fontFamily: "PoppinsBold" },
  titleTablet: { fontSize: 30 },
  subtitle: { color: "#4b5563", fontSize: 16, lineHeight: 22 },
  htmlWrap: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  error: { color: "#b91c1c", textAlign: "center" },
});
