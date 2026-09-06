import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { EventCardImage } from './components/EventCardImage';
import { RemoteCardImage } from './components/RemoteCardImage';
import { AppColors } from '../constants/colors';
import { formatVenueLine } from '../lib/formatVenueLine';
import { formatCityLabel } from '../lib/cities';
import { useTranslation } from './context/LocaleContext';
import {
  EventItem,
  eventImageCacheKey,
  formatEventDateLong,
  formatEventTime,
} from '../lib/events';
import { searchPlatform } from '../lib/search';
import { useIsTablet } from '../lib/responsive';
import { resolveRemoteImageUrl } from '../lib/remoteImage';
import { venueImageCacheKey, type VenueItem } from '../lib/venues';
import { AppText as Text } from "@/components/ui/AppText";

const SEARCH_BG = AppColors.background;
const EVENT_CARD_IMAGE_WIDTH = { phone: 128, tablet: 156 };
const EVENT_CARD_MIN_HEIGHT = { phone: 128, tablet: 148 };
const VENUE_CARD_IMAGE_WIDTH = { phone: 88, tablet: 104 };
const VENUE_CARD_MIN_HEIGHT = { phone: 88, tablet: 100 };

function InfoRow({
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
      <Text style={[styles.infoText, isTablet && styles.infoTextTablet]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function SearchResultSkeleton({
  eventsOnly,
  isTablet,
}: {
  eventsOnly: boolean;
  isTablet: boolean;
}) {
  const eventImageWidth = isTablet
    ? EVENT_CARD_IMAGE_WIDTH.tablet
    : EVENT_CARD_IMAGE_WIDTH.phone;
  const eventCardMinHeight = isTablet
    ? EVENT_CARD_MIN_HEIGHT.tablet
    : EVENT_CARD_MIN_HEIGHT.phone;
  const venueImageWidth = isTablet
    ? VENUE_CARD_IMAGE_WIDTH.tablet
    : VENUE_CARD_IMAGE_WIDTH.phone;
  const venueCardMinHeight = isTablet
    ? VENUE_CARD_MIN_HEIGHT.tablet
    : VENUE_CARD_MIN_HEIGHT.phone;

  return (
    <>
      <View style={styles.section}>
        {!eventsOnly ? (
          <View style={[styles.skeletonLine, { width: 110, height: 14, marginBottom: 4 }]} />
        ) : null}
        {Array.from({ length: 4 }).map((_, idx) => (
          <View key={`search-event-skel-${idx}`} style={styles.eventCard}>
            <View
              style={[
                styles.skeletonImage,
                {
                  width: eventImageWidth,
                  minHeight: eventCardMinHeight,
                },
              ]}
            />
            <View style={[styles.eventCardBody, isTablet && styles.eventCardBodyTablet]}>
              <View style={[styles.skeletonLine, { width: '86%', height: 16 }]} />
              <View style={styles.titleDivider} />
              <View style={styles.infoList}>
                <View style={[styles.skeletonLine, { width: '82%', height: 12 }]} />
                <View style={[styles.skeletonLine, { width: '64%', height: 12 }]} />
                <View style={[styles.skeletonLine, { width: '42%', height: 12 }]} />
              </View>
            </View>
          </View>
        ))}
      </View>

      {!eventsOnly ? (
        <View style={styles.section}>
          <View style={[styles.skeletonLine, { width: 90, height: 14, marginBottom: 4 }]} />
          {Array.from({ length: 3 }).map((_, idx) => (
            <View key={`search-venue-skel-${idx}`} style={styles.venueCard}>
              <View
                style={[
                  styles.skeletonImage,
                  {
                    width: venueImageWidth,
                    minHeight: venueCardMinHeight,
                  },
                ]}
              />
              <View style={[styles.venueCardBody, isTablet && styles.venueCardBodyTablet]}>
                <View style={[styles.skeletonLine, { width: '76%', height: 15 }]} />
                <View style={styles.titleDivider} />
                <View style={styles.infoList}>
                  <View style={[styles.skeletonLine, { width: '48%', height: 12 }]} />
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
}

function SearchEmptyState({
  query,
  isTablet,
}: {
  query: string;
  isTablet: boolean;
}) {
  const { t, tReplace } = useTranslation();
  return (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyCard, isTablet && styles.emptyCardTablet]}>
        <View style={[styles.emptyIconWrap, isTablet && styles.emptyIconWrapTablet]}>
          <Ionicons
            name="search"
            size={isTablet ? 34 : 30}
            color={AppColors.cardText}
          />
        </View>
        <Text style={[styles.emptyTitle, isTablet && styles.emptyTitleTablet]}>
          {t("noSearchResults")}
        </Text>
        <Text style={[styles.emptySubtitle, isTablet && styles.emptySubtitleTablet]}>
          {tReplace("noSearchResultsDetail", { query: query.trim() })}
        </Text>
      </View>
    </View>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const rawParams = useLocalSearchParams<{ scope?: string | string[] }>();
  const scopeParam = Array.isArray(rawParams.scope)
    ? rawParams.scope[0]
    : rawParams.scope;
  const searchScope =
    scopeParam === 'events' || scopeParam === 'venues' ? scopeParam : 'all';
  const eventsOnly = searchScope === 'events';
  const isTablet = useIsTablet();
  const inputRef = useRef<TextInput>(null);
  const searchSeqRef = useRef(0);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [venues, setVenues] = useState<VenueItem[]>([]);

  const executeSearch = useCallback(async (text: string, seq: number) => {
    const trimmed = text.trim();
    if (!trimmed) {
      if (seq === searchSeqRef.current) {
        setEvents([]);
        setVenues([]);
        setLoading(false);
      }
      return;
    }

    try {
      const res = await searchPlatform(trimmed, {
        limit: 10,
        scope: searchScope,
      });
      if (seq !== searchSeqRef.current) return;
      setEvents(res.events);
      setVenues(res.venues);
    } catch {
      if (seq !== searchSeqRef.current) return;
      setEvents([]);
      setVenues([]);
    } finally {
      if (seq === searchSeqRef.current) {
        setLoading(false);
      }
    }
  }, [searchScope]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      searchSeqRef.current += 1;
      setEvents([]);
      setVenues([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const seq = ++searchSeqRef.current;

    const timer = setTimeout(() => {
      void executeSearch(query, seq);
    }, 280);

    return () => clearTimeout(timer);
  }, [query, executeSearch]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  const hasQuery = query.trim().length > 0;
  const hasResults = events.length > 0 || venues.length > 0;
  const searchPlaceholder = eventsOnly
    ? t("searchEventsOnly")
    : t("searchAll");
  const searchHint = eventsOnly
    ? t("searchHintEventsOnly")
    : t("searchHintAll");

  const title = useMemo(() => t("search"), [t]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, isTablet && styles.headerTablet]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={AppColors.cardText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isTablet && styles.headerTitleTablet]}>
          {title}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <View style={[styles.searchRow, isTablet && styles.searchRowTablet]}>
        <Ionicons name="search" size={20} color="rgba(52,61,72,0.55)" />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={(text) => {
            setQuery(text);
          }}
          placeholder={searchPlaceholder}
          placeholderTextColor="rgba(52,61,72,0.45)"
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, isTablet && styles.inputTablet]}
        />
        {query.length > 0 ? (
          <TouchableOpacity
            onPress={() => {
              setQuery('');
              setEvents([]);
              setVenues([]);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="close-circle"
              size={20}
              color="rgba(52,61,72,0.45)"
            />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scroll,
          isTablet && styles.scrollTablet,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {!hasQuery ? (
          <Text style={styles.hint}>{searchHint}</Text>
        ) : loading ? (
          <SearchResultSkeleton eventsOnly={eventsOnly} isTablet={isTablet} />
        ) : !hasResults ? (
          <SearchEmptyState query={query} isTablet={isTablet} />
        ) : (
          <>
            {events.length > 0 ? (
              <View style={styles.section}>
                {!eventsOnly ? (
                  <Text style={styles.sectionTitle}>{t("defaultEventsSection")}</Text>
                ) : null}
                {events.map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    style={styles.eventCard}
                    activeOpacity={0.85}
                    onPress={() => {
                      Keyboard.dismiss();
                      router.replace(`/events/${event.id}` as import('expo-router').Href);
                    }}
                  >
                    <EventCardImage
                      imageUrl={event.imageUrl}
                      cacheKey={eventImageCacheKey(event)}
                      recyclingKey={event.id}
                      style={[
                        styles.eventCardImage,
                        {
                          width: isTablet
                            ? EVENT_CARD_IMAGE_WIDTH.tablet
                            : EVENT_CARD_IMAGE_WIDTH.phone,
                          minHeight: isTablet
                            ? EVENT_CARD_MIN_HEIGHT.tablet
                            : EVENT_CARD_MIN_HEIGHT.phone,
                        },
                      ]}
                    />
                    <View style={[styles.eventCardBody, isTablet && styles.eventCardBodyTablet]}>
                      <Text
                        style={[styles.eventTitle, isTablet && styles.eventTitleTablet]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {event.title}
                      </Text>
                      <View style={styles.titleDivider} />
                      <View style={styles.infoList}>
                        <InfoRow
                          icon="location"
                          label={formatVenueLine(event)}
                          isTablet={isTablet}
                        />
                        <InfoRow
                          icon="calendar"
                          label={formatEventDateLong(event.startsAt)}
                          isTablet={isTablet}
                        />
                        <InfoRow
                          icon="time"
                          label={formatEventTime(event.startsAt)}
                          isTablet={isTablet}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {venues.length > 0 && !eventsOnly ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t("venues")}</Text>
                {venues.map((venue) => (
                  <TouchableOpacity
                    key={venue.id}
                    style={styles.venueCard}
                    activeOpacity={0.85}
                    onPress={() => {
                      Keyboard.dismiss();
                      router.replace(
                        `/venues/${venue.id}` as import('expo-router').Href,
                      );
                    }}
                  >
                    <RemoteCardImage
                      uri={resolveRemoteImageUrl(
                        venue.logoUrl,
                        venueImageCacheKey(venue),
                      )}
                      recyclingKey={venue.id}
                      style={[
                        styles.venueCardImage,
                        {
                          width: isTablet
                            ? VENUE_CARD_IMAGE_WIDTH.tablet
                            : VENUE_CARD_IMAGE_WIDTH.phone,
                          minHeight: isTablet
                            ? VENUE_CARD_MIN_HEIGHT.tablet
                            : VENUE_CARD_MIN_HEIGHT.phone,
                        },
                      ]}
                      contentFit="cover"
                      fallbackSource={require("../assets/images/img-placeholder.jpg")}
                    />
                    <View style={[styles.venueCardBody, isTablet && styles.venueCardBodyTablet]}>
                      <Text
                        style={[styles.venueTitle, isTablet && styles.venueTitleTablet]}
                        numberOfLines={2}
                      >
                        {venue.name}
                      </Text>
                      {venue.city ? (
                        <>
                          <View style={styles.titleDivider} />
                          <View style={styles.infoList}>
                            <InfoRow
                              icon="location"
                              label={formatCityLabel(venue.city)}
                              isTablet={isTablet}
                            />
                          </View>
                        </>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: SEARCH_BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  headerTablet: {
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontFamily: 'PoppinsSemiBold',
    color: '#000000',
  },
  headerTitleTablet: {
    fontSize: 20,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: AppColors.cardBg,
  },
  searchRowTablet: {
    marginHorizontal: 24,
    paddingVertical: 14,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: AppColors.cardText,
    fontFamily: 'PoppinsRegular',
    padding: 0,
  },
  inputTablet: {
    fontSize: 17,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  scrollTablet: {
    paddingHorizontal: 24,
  },
  hint: {
    marginTop: 24,
    textAlign: 'center',
    color: 'rgba(52,61,72,0.55)',
    fontSize: 14,
    fontFamily: 'PoppinsRegular',
    lineHeight: 20,
  },
  section: {
    marginTop: 8,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'PoppinsBold',
    color: AppColors.heading,
    marginBottom: 4,
  },
  eventCard: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  eventCardImage: {
    alignSelf: 'stretch',
    backgroundColor: '#E8ECF0',
  },
  eventCardBody: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 12,
    paddingLeft: 12,
    justifyContent: 'center',
  },
  eventCardBodyTablet: {
    paddingVertical: 14,
    paddingRight: 14,
    paddingLeft: 14,
  },
  eventTitle: {
    fontSize: 15,
    fontFamily: 'PoppinsSemiBold',
    color: AppColors.heading,
    lineHeight: 19,
  },
  eventTitleTablet: {
    fontSize: 17,
    lineHeight: 22,
  },
  venueCard: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  venueCardImage: {
    alignSelf: 'stretch',
    backgroundColor: '#E8ECF0',
  },
  venueCardBody: {
    flex: 1,
    paddingVertical: 8,
    paddingRight: 10,
    paddingLeft: 10,
    justifyContent: 'center',
  },
  venueCardBodyTablet: {
    paddingVertical: 10,
    paddingRight: 12,
    paddingLeft: 12,
  },
  venueTitle: {
    fontSize: 14,
    fontFamily: 'PoppinsSemiBold',
    color: AppColors.heading,
    lineHeight: 18,
  },
  venueTitleTablet: {
    fontSize: 15,
    lineHeight: 20,
  },
  titleDivider: {
    height: 1,
    backgroundColor: 'rgba(52, 61, 72, 0.1)',
    marginTop: 6,
    marginBottom: 4,
  },
  infoList: {
    gap: 3,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoIcon: {
    width: 14,
  },
  infoText: {
    flex: 1,
    color: AppColors.cardText,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'PoppinsMedium',
  },
  infoTextTablet: {
    fontSize: 13,
    lineHeight: 17,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    paddingTop: 8,
    paddingBottom: 20,
  },
  emptyCard: {
    width: '100%',
    backgroundColor: AppColors.cardBg,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyCardTablet: {
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 36,
  },
  emptyIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyIconWrapTablet: {
    marginBottom: 18,
  },
  emptyTitle: {
    color: AppColors.heading,
    fontSize: 16,
    fontFamily: 'PoppinsBold',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyTitleTablet: {
    fontSize: 18,
    lineHeight: 24,
  },
  emptySubtitle: {
    marginTop: 8,
    color: 'rgba(52, 61, 72, 0.65)',
    fontSize: 13,
    fontFamily: 'PoppinsMedium',
    textAlign: 'center',
    lineHeight: 18,
  },
  emptySubtitleTablet: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  skeletonImage: {
    alignSelf: 'stretch',
    backgroundColor: '#E8ECF0',
  },
  skeletonLine: {
    borderRadius: 6,
    backgroundColor: '#D8DCE2',
  },
});
