import { useRouter } from "expo-router";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import {
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import {
  formatHomeSectionTitle,
  homeSectionTitleStyle,
  homeSeeAllStyle,
} from "../../constants/homeTypography";
import type {
  SectionLoadingProps,
  SectionReloadHandle,
} from "../../lib/sectionReload";
import { useIsTablet } from "../../lib/responsive";
import {
  fetchFeaturedVenuesForHome,
  type VenueItem,
} from "../../lib/venues";
import { useTranslation } from "../context/LocaleContext";
import HomeFeaturedVenueCard, {
  getHomeFeaturedVenueCardWidth,
  HomeFeaturedVenueCardSkeleton,
} from "./HomeFeaturedVenueCard";
import { AppText as Text } from "@/components/ui/AppText";

const FeaturedVenuesSection = forwardRef<
  SectionReloadHandle,
  SectionLoadingProps
>(function FeaturedVenuesSection({ onLoadingChange }, ref) {
  const router = useRouter();
  const { t } = useTranslation();
  const isTablet = useIsTablet();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = getHomeFeaturedVenueCardWidth(screenWidth, isTablet);

  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) setLoading(true);
    try {
      const data = await fetchFeaturedVenuesForHome(6);
      setVenues(data);
    } catch {
      setVenues([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      reload: () => load({ silent: true }),
    }),
    [load],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  if (!loading && venues.length === 0) return null;

  return (
    <View style={{ marginTop: 16, marginBottom: 8 }}>
      <View
        style={{
          paddingHorizontal: 20,
          marginBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text style={{ flex: 1, ...homeSectionTitleStyle(isTablet) }}>
          {formatHomeSectionTitle(t("featuredVenues"))}
        </Text>
        <TouchableOpacity
          onPress={() =>
            router.push("/(tabs)/venues" as import("expo-router").Href)
          }
          hitSlop={8}
        >
          <Text style={homeSeeAllStyle(isTablet)}>{t("showAll")}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          gap: isTablet ? 12 : 10,
          paddingBottom: 4,
        }}
      >
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <HomeFeaturedVenueCardSkeleton key={`sk-${i}`} width={cardWidth} />
            ))
          : venues.map((venue) => (
              <HomeFeaturedVenueCard
                key={venue.id}
                venue={venue}
                width={cardWidth}
              />
            ))}
      </ScrollView>
    </View>
  );
});

export default FeaturedVenuesSection;
