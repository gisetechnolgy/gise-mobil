import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { AppColors } from "../../constants/colors";
import { LIST_CARD } from "../../constants/homeSectionList";
import {
  SEARCH_CATEGORY_PILL_GAP,
  SEARCH_CATEGORY_PILL_H,
  SEARCH_DIVIDER_TO_CATEGORIES,
  SEARCH_FEATURED_CARD_GAP,
  SEARCH_FEATURED_TO_DIVIDER,
  SEARCH_PANEL_PAD_X,
  SEARCH_PANEL_PAD_Y,
  SEARCH_RESULT_ITEM_GAP,
  SEARCH_RESULT_THUMB,
  SEARCH_RESULT_THUMB_RADIUS,
  SEARCH_SECTION_TITLE_GAP,
  getSearchFeaturedCardWidth,
} from "../../constants/searchPanel";
import { formatCategoryMenuLabel } from "../../lib/categoryIcons";
import { fetchCategories, type CategoryItem } from "../../lib/definitions";
import {
  eventImageCacheKey,
  type EventItem,
} from "../../lib/events";
import {
  fetchHeroFeatured,
  type HeroFeaturedEvent,
} from "../../lib/heroFeatured";
import { searchPlatform } from "../../lib/search";
import { resolveRemoteImageUrl } from "../../lib/remoteImage";
import { venueImageCacheKey, type VenueItem } from "../../lib/venues";
import { useTranslation } from "../context/_LocaleContext";
import HomeEventHorizontalCard from "./detail/HomeEventHorizontalCard";
import { RemoteCardImage } from "./_RemoteCardImage";
import { AppText as Text } from "@/components/ui/AppText";

type Props = {
  query: string;
  scope?: "all" | "events" | "venues";
  onNavigate?: () => void;
  /** Tab bar / klavye için alt boşluk */
  bottomPadding?: number;
};

/** Web mega menu — otel konser hariç */
function isHotelConcertCategory(category: CategoryItem): boolean {
  const key = [category.value, category.label]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return (
    key.includes("hotelconcert") ||
    key.includes("hotel concert") ||
    key.includes("otel konser")
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function ResultRow({
  title,
  imageUrl,
  cacheKey,
  onPress,
}: {
  title: string;
  imageUrl: string | null;
  cacheKey: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.resultRow}
    >
      <View style={styles.resultThumb}>
        <RemoteCardImage
          uri={resolveRemoteImageUrl(imageUrl, cacheKey)}
          recyclingKey={cacheKey}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      </View>
      <Text style={styles.resultText} numberOfLines={2}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

/** Web search-dropdown + search-results-panel mobil paneli */
export default function SearchPanelContent({
  query,
  scope = "all",
  onNavigate,
  bottomPadding,
}: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const trimmed = query.trim();
  const featuredCardW = getSearchFeaturedCardWidth(screenWidth);
  const [featured, setFeatured] = useState<HeroFeaturedEvent[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [venues, setVenues] = useState<VenueItem[]>([]);

  const panelPad = [
    styles.panel,
    {
      paddingBottom:
        bottomPadding != null ? bottomPadding : SEARCH_PANEL_PAD_Y + 48,
    },
  ];

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadingFeatured(true);
      try {
        const [hero, cats] = await Promise.all([
          fetchHeroFeatured({ refresh: true }),
          fetchCategories(true),
        ]);
        if (cancelled) return;
        setFeatured(hero.events);
        setCategories(cats.filter((c) => !isHotelConcertCategory(c)));
      } finally {
        if (!cancelled) setLoadingFeatured(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!trimmed) {
      setEvents([]);
      setVenues([]);
      setLoadingResults(false);
      return;
    }
    let cancelled = false;
    setLoadingResults(true);
    const tm = setTimeout(() => {
      void (async () => {
        try {
          const res = await searchPlatform(trimmed, {
            limit: 10,
            scope,
          });
          if (cancelled) return;
          setEvents(res.events);
          setVenues(scope === "events" ? [] : res.venues);
        } catch {
          if (!cancelled) {
            setEvents([]);
            setVenues([]);
          }
        } finally {
          if (!cancelled) setLoadingResults(false);
        }
      })();
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(tm);
    };
  }, [trimmed, scope]);

  const goEvent = useCallback(
    (id: string) => {
      onNavigate?.();
      router.push(`/events/${id}` as import("expo-router").Href);
    },
    [onNavigate, router],
  );

  const goVenue = useCallback(
    (id: string) => {
      onNavigate?.();
      router.push(`/venues/${id}` as import("expo-router").Href);
    },
    [onNavigate, router],
  );

  const goCategory = useCallback(
    (categoryId: string | "all") => {
      onNavigate?.();
      if (categoryId === "all") {
        router.push("/(tabs)/events");
        return;
      }
      router.push({
        pathname: "/(tabs)/events",
        params: { category: categoryId },
      });
    },
    [onNavigate, router],
  );

  if (!trimmed) {
    return (
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
        contentContainerStyle={panelPad}
      >
        <SectionTitle>{t("featuredEvents")}</SectionTitle>
        <View style={{ marginTop: SEARCH_SECTION_TITLE_GAP }}>
          {loadingFeatured ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {Array.from({ length: 3 }).map((_, i) => (
                <View
                  key={`sf-skel-${i}`}
                  style={{
                    width: featuredCardW,
                    height: LIST_CARD.height,
                    borderRadius: LIST_CARD.radius,
                    backgroundColor: "#F3F4F6",
                    marginRight: SEARCH_FEATURED_CARD_GAP,
                  }}
                />
              ))}
            </ScrollView>
          ) : featured.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: SEARCH_FEATURED_CARD_GAP,
                paddingRight: 12,
                paddingBottom: 10,
                paddingTop: 2,
              }}
            >
              {featured.map((event, index) => (
                <HomeEventHorizontalCard
                  key={`${event.id}-${index}`}
                  event={event}
                  isFeatured
                  width={featuredCardW}
                  onPress={() => goEvent(event.id)}
                />
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.info}>{t("noUpcomingEvents")}</Text>
          )}
        </View>

        <View style={styles.divider} />

        <SectionTitle>{t("eventCategories")}</SectionTitle>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            gap: SEARCH_CATEGORY_PILL_GAP,
            marginTop: SEARCH_SECTION_TITLE_GAP,
            paddingRight: 12,
          }}
        >
          <TouchableOpacity
            onPress={() => goCategory("all")}
            style={styles.pill}
            activeOpacity={0.85}
          >
            <Text style={styles.pillText}>
              {formatCategoryMenuLabel(t("allCategories"))}
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => goCategory(cat.value)}
              style={styles.pill}
              activeOpacity={0.85}
            >
              <Text style={styles.pillText}>
                {formatCategoryMenuLabel(cat.label)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      nestedScrollEnabled
      contentContainerStyle={panelPad}
    >
      {loadingResults ? (
        <Text style={styles.info}>{t("searchLoading")}</Text>
      ) : events.length === 0 && venues.length === 0 ? (
        <Text style={styles.info}>{t("noSearchResults")}</Text>
      ) : (
        <>
          {events.length > 0 ? (
            <View style={{ marginBottom: SEARCH_RESULT_ITEM_GAP }}>
              <SectionTitle>{t("events")}</SectionTitle>
              {events.map((event) => (
                <ResultRow
                  key={event.id}
                  title={event.title}
                  imageUrl={event.imageUrl}
                  cacheKey={eventImageCacheKey(event)}
                  onPress={() => goEvent(event.id)}
                />
              ))}
            </View>
          ) : null}
          {events.length > 0 && venues.length > 0 ? (
            <View style={styles.resultsDivider} />
          ) : null}
          {venues.length > 0 ? (
            <View style={{ marginBottom: SEARCH_RESULT_ITEM_GAP }}>
              <SectionTitle>{t("venues")}</SectionTitle>
              {venues.map((venue) => (
                <ResultRow
                  key={venue.id}
                  title={venue.name}
                  imageUrl={venue.logoUrl || venue.bannerUrl}
                  cacheKey={venueImageCacheKey(venue)}
                  onPress={() => goVenue(venue.id)}
                />
              ))}
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  panel: {
    paddingHorizontal: SEARCH_PANEL_PAD_X,
    paddingTop: SEARCH_PANEL_PAD_Y,
    backgroundColor: "#FFFFFF",
    flexGrow: 1,
  },
  sectionTitle: {
    fontFamily: "PoppinsBold",
    fontSize: 14,
    color: AppColors.accent,
    lineHeight: 17,
  },
  divider: {
    height: 2,
    backgroundColor: "#EBEBEB",
    marginTop: SEARCH_FEATURED_TO_DIVIDER,
    marginBottom: SEARCH_DIVIDER_TO_CATEGORIES,
  },
  resultsDivider: {
    height: 1,
    backgroundColor: "#EBEBEB",
    marginTop: 4,
    marginBottom: SEARCH_RESULT_ITEM_GAP,
  },
  pill: {
    height: SEARCH_CATEGORY_PILL_H,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  pillText: {
    fontFamily: "PoppinsSemiBold",
    fontSize: 12,
    color: AppColors.heading,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SEARCH_RESULT_ITEM_GAP,
    paddingVertical: 10,
    borderRadius: 8,
  },
  resultThumb: {
    width: SEARCH_RESULT_THUMB,
    height: SEARCH_RESULT_THUMB,
    borderRadius: SEARCH_RESULT_THUMB_RADIUS,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },
  resultText: {
    flex: 1,
    fontFamily: "PoppinsRegular",
    fontSize: 14,
    lineHeight: 20,
    color: AppColors.cardText,
  },
  info: {
    paddingVertical: 12,
    fontFamily: "PoppinsRegular",
    fontSize: 14,
    color: "#6B7280",
  },
});
