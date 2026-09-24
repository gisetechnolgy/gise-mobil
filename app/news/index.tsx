import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { RemoteCardImage } from "../components/_RemoteCardImage";
import { AppColors } from "../../constants/colors";
import { useTranslation } from "../context/_LocaleContext";
import { appRefreshControl } from "../../lib/appRefreshControl";
import {
  fetchNewsList,
  formatNewsDate,
  newsImageUrl,
  type NewsItem,
} from "../../lib/news";
import { useIsTablet } from "../../lib/responsive";
import { AppText as Text } from "@/components/ui/AppText";

function NewsSkeleton({ isTablet }: { isTablet: boolean }) {
  return (
    <View style={{ padding: isTablet ? 26 : 20, gap: isTablet ? 16 : 12 }}>
      {Array.from({ length: 3 }).map((_, idx) => (
        <View key={`news-skel-${idx}`} style={[styles.card, isTablet && styles.cardTablet]}>
          <View style={[styles.skeletonThumb, isTablet && styles.thumbTablet]} />
          <View style={styles.body}>
            <View style={[styles.skeletonLine, { width: "36%", height: 12 }]} />
            <View style={[styles.skeletonLine, { width: "84%", height: 18, marginTop: 8 }]} />
            <View style={[styles.skeletonLine, { width: "72%", height: 14, marginTop: 8 }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function NewsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const isTablet = useIsTablet();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await fetchNewsList();
      setItems(data);
    } catch {
      setError(t("newsListLoadError"));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

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

  const contentStyle = {
    padding: isTablet ? 26 : 20,
    gap: isTablet ? 16 : 12,
    paddingBottom: isTablet ? 150 : 120,
    flexGrow: 1,
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />
      <View style={[styles.header, isTablet && styles.headerTablet]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={AppColors.cardText} />
        </TouchableOpacity>
        <Text style={[styles.title, isTablet && styles.titleTablet]}>{t("news")}</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <NewsSkeleton isTablet={isTablet} />
      ) : error ? (
        <ScrollView
          contentContainerStyle={[contentStyle, { justifyContent: "center" }]}
          refreshControl={appRefreshControl(refreshing, onRefresh)}
        >
          <Text style={styles.error}>{error}</Text>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={contentStyle}
          refreshControl={appRefreshControl(refreshing, onRefresh)}
        >
          {items.length === 0 ? (
            <Text style={styles.muted}>Henüz blog bulunmuyor.</Text>
          ) : (
            items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, isTablet && styles.cardTablet]}
                activeOpacity={0.85}
                onPress={() =>
                  router.push(`/news/${item.id}` as import("expo-router").Href)
                }
              >
                <RemoteCardImage
                  uri={newsImageUrl(item)}
                  recyclingKey={item.id}
                  style={[styles.thumb, isTablet && styles.thumbTablet]}
                />
                <View style={styles.body}>
                  <Text style={styles.date}>{formatNewsDate(item.date)}</Text>
                  <Text
                    style={[styles.newsTitle, isTablet && styles.newsTitleTablet]}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  {item.subtitle ? (
                    <Text style={styles.subtitle} numberOfLines={2}>
                      {item.subtitle.replace(/<[^>]+>/g, "")}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))
          )}
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
  headerTablet: { paddingHorizontal: 18, paddingBottom: 10 },
  backBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  title: { color: "#000000", fontSize: 20, fontFamily: "PoppinsSemiBold" },
  titleTablet: { fontSize: 26 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 14,
    overflow: "hidden",
  },
  cardTablet: { borderRadius: 18 },
  thumb: { width: "100%", height: 180 },
  skeletonThumb: { width: "100%", height: 180, backgroundColor: "#E8ECF0" },
  thumbTablet: { height: 220 },
  body: { padding: 14, gap: 6 },
  date: { color: AppColors.navBg, fontSize: 13, fontFamily: "PoppinsBold" },
  newsTitle: { color: AppColors.cardText, fontSize: 18, fontFamily: "PoppinsBold" },
  newsTitleTablet: { fontSize: 22 },
  subtitle: { color: "#5f6f7d", fontSize: 14, lineHeight: 20 },
  muted: { color: "rgba(25,58,88,0.75)", textAlign: "center" },
  error: { color: "#b91c1c", textAlign: "center" },
  skeletonLine: { borderRadius: 6, backgroundColor: "#D8DCE2" },
});
