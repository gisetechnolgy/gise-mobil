import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RemoteCardImage } from "./components/_RemoteCardImage";
import { AppColors } from "../constants/colors";
import { appRefreshControl } from "../lib/appRefreshControl";
import { readFollowedCompanyIds } from "../lib/followedCompanies";
import { useIsTablet } from "../lib/responsive";
import { resolveRemoteImageUrl } from "../lib/remoteImage";
import {
  fetchCompaniesSorted,
  type CompanyItem,
  companyImageCacheKey,
} from "../lib/companies";
import { useAuth } from "./context/AuthContext";
import { AppText as Text } from "@/components/ui/AppText";

const COMPANY_CARD_IMAGE_WIDTH = { phone: 88, tablet: 104 };
const COMPANY_CARD_MIN_HEIGHT = { phone: 88, tablet: 100 };

function FollowedCompaniesSkeleton({ isTablet }: { isTablet: boolean }) {
  const imageWidth = isTablet
    ? COMPANY_CARD_IMAGE_WIDTH.tablet
    : COMPANY_CARD_IMAGE_WIDTH.phone;
  const cardMinHeight = isTablet
    ? COMPANY_CARD_MIN_HEIGHT.tablet
    : COMPANY_CARD_MIN_HEIGHT.phone;

  return (
    <>
      {Array.from({ length: 4 }).map((_, idx) => (
        <View key={`followed-company-skel-${idx}`} style={styles.companyCard}>
          <View
            style={[
              styles.skeletonImage,
              {
                width: imageWidth,
                minHeight: cardMinHeight,
              },
            ]}
          />
          <View style={[styles.companyCardBody, isTablet && styles.companyCardBodyTablet]}>
            <View style={[styles.skeletonLine, { width: "72%", height: 15 }]} />
          </View>
        </View>
      ))}
    </>
  );
}

export default function FollowedCompaniesScreen() {
  const router = useRouter();
  const isTablet = useIsTablet();
  const { user } = useAuth();
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setCompanies([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [allCompanies, followedIds] = await Promise.all([
        fetchCompaniesSorted(),
        readFollowedCompanyIds(user.id),
      ]);
      const followedSet = new Set(followedIds);
      setCompanies(allCompanies.filter((company) => followedSet.has(company.id)));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const contentStyle = useMemo(
    () => ({
      paddingHorizontal: isTablet ? 26 : 20,
      paddingTop: isTablet ? 12 : 10,
      gap: isTablet ? 16 : 12,
      paddingBottom: isTablet ? 150 : 120,
      flexGrow: 1,
    }),
    [isTablet],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, isTablet && styles.headerTablet]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={isTablet ? 26 : 22} color={AppColors.cardText} />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, isTablet && styles.pageTitleTablet]}>
          Takip Edilen Şirketler
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={contentStyle}
        refreshControl={appRefreshControl(refreshing, onRefresh)}
      >
        {loading ? (
          <FollowedCompaniesSkeleton isTablet={isTablet} />
        ) : companies.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyCard, isTablet && styles.emptyCardTablet]}>
              <View style={[styles.emptyIconWrap, isTablet && styles.emptyIconWrapTablet]}>
                <Ionicons
                  name="business-outline"
                  size={isTablet ? 34 : 30}
                  color={AppColors.cardText}
                />
              </View>
              <Text style={[styles.emptyTitle, isTablet && styles.emptyTitleTablet]}>
                Takip ettiğin şirket bulunmuyor
              </Text>
              <Text style={[styles.emptySubtitle, isTablet && styles.emptySubtitleTablet]}>
                Beğendiğin şirketleri takip ederek burada kolayca ulaşabilirsin.
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.emptyAction, isTablet && styles.emptyActionTablet]}
                onPress={() => router.push("/companies" as import("expo-router").Href)}
              >
                <Text style={[styles.emptyActionText, isTablet && styles.emptyActionTextTablet]}>
                  Şirketleri Keşfet
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {companies.map((company) => {
              const imageWidth = isTablet
                ? COMPANY_CARD_IMAGE_WIDTH.tablet
                : COMPANY_CARD_IMAGE_WIDTH.phone;
              const cardMinHeight = isTablet
                ? COMPANY_CARD_MIN_HEIGHT.tablet
                : COMPANY_CARD_MIN_HEIGHT.phone;
              const logoUri = resolveRemoteImageUrl(
                company.logoUrl,
                companyImageCacheKey(company),
              );

              return (
                <TouchableOpacity
                  key={company.id}
                  style={styles.companyCard}
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push(`/companies/${company.id}` as import("expo-router").Href)
                  }
                >
                  <RemoteCardImage
                    uri={logoUri}
                    recyclingKey={company.id}
                    contentFit="cover"
                    style={[
                      styles.companyCardImage,
                      { width: imageWidth, minHeight: cardMinHeight },
                    ]}
                  />
                  <View style={[styles.companyCardBody, isTablet && styles.companyCardBodyTablet]}>
                    <Text style={[styles.title, isTablet && styles.titleTablet]} numberOfLines={2}>
                      {company.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.discoverButton, isTablet && styles.discoverButtonTablet]}
              onPress={() => router.push("/companies" as import("expo-router").Href)}
            >
              <Text style={[styles.discoverButtonText, isTablet && styles.discoverButtonTextTablet]}>
                Şirketleri Keşfet
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  headerTablet: {
    minHeight: 56,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    color: "#000000",
    fontSize: 20,
    fontFamily: "PoppinsSemiBold",
  },
  pageTitleTablet: {
    fontSize: 26,
  },
  companyCard: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 12,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "stretch",
  },
  companyCardImage: {
    alignSelf: "stretch",
    backgroundColor: "#E8ECF0",
  },
  skeletonImage: {
    alignSelf: "stretch",
    backgroundColor: "#E8ECF0",
  },
  companyCardBody: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  companyCardBodyTablet: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  title: {
    color: AppColors.heading,
    fontSize: 16,
    fontFamily: "PoppinsSemiBold",
    lineHeight: 20,
  },
  titleTablet: {
    fontSize: 18,
    lineHeight: 22,
  },
  skeletonLine: {
    borderRadius: 6,
    backgroundColor: "#D8DCE2",
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "flex-start",
    width: "100%",
    paddingTop: 8,
    paddingBottom: 20,
  },
  emptyCard: {
    width: "100%",
    backgroundColor: AppColors.cardBg,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
  },
  emptyCardTablet: {
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 36,
  },
  emptyIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyIconWrapTablet: {
    marginBottom: 18,
  },
  emptyTitle: {
    color: AppColors.heading,
    fontSize: 16,
    fontFamily: "PoppinsBold",
    textAlign: "center",
    lineHeight: 22,
  },
  emptyTitleTablet: {
    fontSize: 18,
    lineHeight: 24,
  },
  emptySubtitle: {
    marginTop: 8,
    color: "rgba(52, 61, 72, 0.65)",
    fontSize: 13,
    fontFamily: "PoppinsMedium",
    textAlign: "center",
    lineHeight: 18,
  },
  emptySubtitleTablet: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyAction: {
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: AppColors.accent,
  },
  emptyActionTablet: {
    marginTop: 22,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyActionText: {
    color: AppColors.navText,
    fontSize: 14,
    fontFamily: "PoppinsBold",
  },
  emptyActionTextTablet: {
    fontSize: 15,
  },
  discoverButton: {
    marginTop: 8,
    width: "100%",
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: AppColors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  discoverButtonTablet: {
    marginTop: 10,
    minHeight: 48,
    borderRadius: 10,
    paddingVertical: 14,
  },
  discoverButtonText: {
    color: AppColors.navText,
    fontSize: 14,
    fontFamily: "PoppinsBold",
  },
  discoverButtonTextTablet: {
    fontSize: 15,
  },
});
