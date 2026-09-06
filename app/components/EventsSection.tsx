import { useRouter } from "expo-router";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import {
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";
import { homeSectionTitleStyle, formatHomeSectionTitle, homeSeeAllStyle } from "../../constants/homeTypography";
import { EventItem, fetchUpcomingEvents } from "../../lib/events";
import type {
  SectionLoadingProps,
  SectionReloadHandle,
} from "../../lib/sectionReload";
import { useIsTablet } from "../../lib/responsive";
import { prefetchEventImages } from "./EventCardImage";
import { AppText as Text } from "@/components/ui/AppText";
import HomeEventCard, {
  getHomeEventCardWidth,
  HomeEventCardSkeleton,
} from "./HomeEventCard";

type Props = SectionLoadingProps & {
  onSeeAll?: () => void;
};

const EventsSection = forwardRef<SectionReloadHandle, Props>(
  function EventsSection({ onSeeAll, onLoadingChange }, ref) {
    const router = useRouter();
    const isTablet = useIsTablet();
    const { width: screenWidth } = useWindowDimensions();
    const cardWidth = getHomeEventCardWidth(screenWidth, isTablet);
    const [events, setEvents] = useState<EventItem[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(
      async (options?: { silent?: boolean; refresh?: boolean }) => {
        const silent = options?.silent ?? false;
        if (!silent) setLoading(true);
        try {
          const res = await fetchUpcomingEvents(undefined, {
            refresh: options?.refresh,
          });
          setEvents(res.items);
          void prefetchEventImages(res.items);
        } finally {
          if (!silent) setLoading(false);
        }
      },
      [],
    );

    useImperativeHandle(
      ref,
      () => ({
        reload: (opts) => load({ silent: true, refresh: opts?.refresh }),
      }),
      [load],
    );

    useEffect(() => {
      void load();
    }, [load]);

    useEffect(() => {
      onLoadingChange?.(loading);
    }, [loading, onLoadingChange]);

    const visibleEvents = useMemo(() => events.slice(0, 8), [events]);

    if (!loading && visibleEvents.length === 0) {
      return null;
    }

    return (
      <View className="mt-4">
        <View className="flex-row items-center justify-between px-5 mb-2">
          <Text style={homeSectionTitleStyle(isTablet)}>
            {formatHomeSectionTitle("Etkinlikler")}
          </Text>
          <TouchableOpacity
            onPress={onSeeAll ?? (() => router.push("/(tabs)/events"))}
          >
            <Text style={homeSeeAllStyle(isTablet)}>
              Tümünü Göster
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 4,
            paddingBottom: 10,
            gap: isTablet ? 18 : 14,
          }}
        >
          {loading
            ? Array.from({ length: 3 }).map((_, idx) => (
                <HomeEventCardSkeleton
                  key={`events-skeleton-${idx}`}
                  width={cardWidth}
                />
              ))
            : visibleEvents.map((event) => (
                <HomeEventCard
                  key={event.id}
                  event={event}
                  width={cardWidth}
                />
              ))}
        </ScrollView>
      </View>
    );
  },
);

export default EventsSection;
