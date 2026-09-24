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
import { readFollowedVenueIds } from "../lib/followedVenues";
import { useIsTablet } from "../lib/responsive";
import { resolveRemoteImageUrl } from "../lib/remoteImage";
import {
  fetchVenueCategories,
  type CategoryItem,
} from "../lib/definitions";
import {
  fetchVenuesWithFeaturedOrder,
  type VenueItem,
  venueImageCacheKey,
} from "../lib/venues";
import { formatCityLabel } from "../lib/cities";
import { useAuth } from "./context/AuthContext";
import { AppText as Text } from "@/components/ui/AppText";

const VENUE_CARD_IMAGE_WIDTH = { phone: 88, tablet: 104 };
const VENUE_CARD_MIN_HEIGHT = { phone: 88, tablet: 100 };

function getVenueCategoryLabel(
  venue: VenueItem,
  categoryLabels: Record<string, string>,
): string {
  return venue.categories
    .map((id) => categoryLabels[id])
    .filter(Boolean)
    .join(", ");
}

function VenueInfoRow({
  icon,
  label,
  isTablet,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  isTablet: boolean;
}) {
  if (!label) return null;
  return (
    <View style={styles.infoRow}>
      <Ionicons
        name={icon}
        size={isTablet ? 15 : 13}
        color={AppColors.cardText}
        style={styles.infoIcon}
      />
      <Text
        style={[styles.infoText, isTablet && styles.infoTextTablet]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </View>
  );
}

function FollowedVenuesSkeleton({ isTablet }: { isTablet: boolean }) {
  const imageWidth = isTablet
    ? VENUE_CARD_IMAGE_WIDTH.tablet
    : VENUE_CARD_IMAGE_WIDTH.phone;
  const cardMinHeight = isTablet
    ? VENUE_CARD_MIN_HEIGHT.tablet
    : VENUE_CARD_MIN_HEIGHT.phone;

  return (
    <>
      {Array.from({ length: 4 }).map((_, idx) => (
        <View key={`followed-venue-skel-${idx}`} style={styles.venueCard}>
          <View
            style={[
              styles.skeletonImage,
              {
                width: imageWidth,
                minHeight: cardMinHeight,
              },
            ]}
          />
          <View style={[styles.venueCardBody, isTablet && styles.venueCardBodyTablet]}>
            <View style={[styles.skeletonLine, { width: "36%", height: 12 }]} />
            <View style={[styles.skeletonLine, { width: "84%", height: 15, marginTop: 5 }]} />
            <View style={styles.titleDivider} />
            <View style={[styles.skeletonLine, { width: "56%", height: 12 }]} />
          </View>
        </View>
      ))}
    </>
  );
}

export default function FollowedVenuesScreen() {
  const router = useRouter();
  const isTablet = useIsTablet();
  const { user } = useAuth();
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [venueCategories, setVenueCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setVenues([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [allVenues, followedIds, categories] = await Promise.all([
        fetchVenuesWithFeaturedOrder(),
        readFollowedVenueIds(user.id),
        fetchVenueCategories(),
      ]);
      const followedSet = new Set(followedIds);
      setVenueCategories(categories);
      setVenues(allVenues.filter((venue) => followedSet.has(venue.id)));
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
  const categoryLabels = useMemo(
    () => Object.fromEntries(venueCategories.map((c) => [c.value, c.label])),
    [venueCategories],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, isTablet && styles.headerTablet]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={isTablet ? 26 : 22} color={AppColors.cardText} />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, isTablet && styles.pageTitleTablet]}>
          Takip Edilen Mekanlar
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={contentStyle}
        refreshControl={appRefreshControl(refreshing, onRefresh)}
      >
        {loading ? (
          <FollowedVenuesSkeleton isTablet={isTablet} />
        ) : venues.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyCard, isTablet && styles.emptyCardTablet]}>
              <View style={[styles.emptyIconWrap, isTablet && styles.emptyIconWrapTablet]}>
                <Ionicons
                  name="location-outline"
                  size={isTablet ? 34 : 30}
                  color={AppColors.cardText}
                />
              </View>
              <Text style={[styles.emptyTitle, isTablet && styles.emptyTitleTablet]}>
                Takip ettiğin mekan bulunmuyor
              </Text>
              <Text style={[styles.emptySubtitle, isTablet && styles.emptySubtitleTablet]}>
                Beğendiğin mekanları takip ederek burada kolayca ulaşabilirsin.
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.emptyAction, isTablet && styles.emptyActionTablet]}
                onPress={() => router.push("/(tabs)/venues" as import("expo-router").Href)}
              >
                <Text style={[styles.emptyActionText, isTablet && styles.emptyActionTextTablet]}>
                  Mekanları Keşfet
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          venues.map((venue) => {
            const categoryLabel = getVenueCategoryLabel(venue, categoryLabels);
            const imageWidth = isTablet
              ? VENUE_CARD_IMAGE_WIDTH.tablet
              : VENUE_CARD_IMAGE_WIDTH.phone;
            const cardMinHeight = isTablet
              ? VENUE_CARD_MIN_HEIGHT.tablet
              : VENUE_CARD_MIN_HEIGHT.phone;
            const logoUri = resolveRemoteImageUrl(
              venue.logoUrl,
              venueImageCacheKey(venue),
            );
            const cityLabel = formatCityLabel(venue.city);

            return (
              <TouchableOpacity
                key={venue.id}
                style={styles.venueCard}
                activeOpacity={0.85}
                onPress={() =>
                  router.push(`/venues/${venue.id}` as import("expo-router").Href)
                }
              >
                <RemoteCardImage
                  uri={logoUri}
                  recyclingKey={venue.id}
                  contentFit="cover"
                  style={[
                    styles.venueCardImage,
                    { width: imageWidth, minHeight: cardMinHeight },
                  ]}
                  fallbackSource={require("../assets/images/img-placeholder.jpg")}
                />
                <View style={[styles.venueCardBody, isTablet && styles.venueCardBodyTablet]}>
                  {categoryLabel ? (
                    <Text
                      style={[styles.category, isTablet && styles.categoryTablet]}
                      numberOfLines={1}
                    >
                      {categoryLabel}
                    </Text>
                  ) : null}
                  <Text style={[styles.title, isTablet && styles.titleTablet]} numberOfLines={2}>
                    {venue.name}
                  </Text>
                  <View style={styles.titleDivider} />
                  <View style={styles.infoList}>
                    {cityLabel ? (
                      <VenueInfoRow
                        icon="location"
                        label={cityLabel}
                        isTablet={isTablet}
                      />
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
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
  venueCard: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 12,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "stretch",
  },
  venueCardImage: {
    alignSelf: "stretch",
    backgroundColor: "#E8ECF0",
  },
  skeletonImage: {
    alignSelf: "stretch",
    backgroundColor: "#E8ECF0",
  },
  venueCardBody: {
    flex: 1,
    paddingVertical: 8,
    paddingRight: 10,
    paddingLeft: 10,
    justifyContent: "center",
  },
  venueCardBodyTablet: {
    paddingVertical: 10,
    paddingRight: 12,
    paddingLeft: 12,
  },
  title: {
    color: AppColors.heading,
    fontSize: 14,
    fontFamily: "PoppinsSemiBold",
    lineHeight: 18,
  },
  titleTablet: {
    fontSize: 15,
    lineHeight: 20,
  },
  titleDivider: {
    height: 1,
    backgroundColor: "rgba(52, 61, 72, 0.1)",
    marginTop: 4,
    marginBottom: 3,
  },
  category: {
    color: AppColors.accent,
    fontSize: 10,
    fontFamily: "PoppinsSemiBold",
    marginBottom: 1,
  },
  categoryTablet: {
    fontSize: 11,
  },
  infoList: {
    gap: 3,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoIcon: {
    width: 14,
  },
  infoText: {
    color: AppColors.cardText,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "PoppinsMedium",
  },
  infoTextTablet: {
    fontSize: 13,
    lineHeight: 17,
  },
  emptyText: {
    color: AppColors.cardText,
    opacity: 0.8,
    textAlign: "center",
    marginTop: 28,
    fontSize: 14,
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
});
