import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppColors } from "../../constants/colors";
import {
  DETAIL_ACCENT,
  DETAIL_BODY_GAP,
  DETAIL_BODY_OVERLAP,
  DETAIL_BODY_PX,
  DETAIL_LAYOUT_THUMB,
  DETAIL_PAGE_BG,
  DETAIL_THUMB_MIN_HEIGHT,
  DETAIL_THUMB_RADIUS,
  DETAIL_THUMB_WIDTH,
  LIST_CARD,
  PAST_EVENTS_PAGE,
} from "../../constants/mobileDetail";
import { appRefreshControl } from "../../lib/appRefreshControl";
import { formatCityLabel } from "../../lib/cities";
import { fetchVenueCategories } from "../../lib/definitions";
import {
  EventItem,
  fetchEventsForVenue,
} from "../../lib/events";
import {
  enrichEventsWithPriceInfo,
  type ActivePriceInfo,
} from "../../lib/startingPrice";
import { GISE_WEB_URL } from "../../lib/appConfig";
import {
  isVenueFollowed,
  toggleVenueFollow,
} from "../../lib/followedVenues";
import {
  fetchVenueById,
  venueImageCacheKey,
  type VenueItem,
} from "../../lib/venues";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/_LocaleContext";
import { RemoteCardImage } from "../components/_RemoteCardImage";
import ClampedHtmlSection from "../components/detail/ClampedHtmlSection";
import DetailActionButton, {
  DetailActionsRow,
} from "../components/detail/DetailActionButton";
import DetailCard from "../components/detail/DetailCard";
import DetailMetaRow from "../components/detail/DetailMetaRow";
import HomeEventHorizontalCard from "../components/detail/HomeEventHorizontalCard";
import ImmersiveDetailHero from "../components/detail/ImmersiveDetailHero";
import { AppText as Text } from "@/components/ui/AppText";
import { resolveRemoteImageUrl } from "../../lib/remoteImage";

type PricedEvent = EventItem & { priceInfo?: ActivePriceInfo | null };

async function withPrices(events: EventItem[]): Promise<PricedEvent[]> {
  return enrichEventsWithPriceInfo(events);
}

export default function VenueDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [venue, setVenue] = useState<VenueItem | null>(null);
  const [upcoming, setUpcoming] = useState<PricedEvent[]>([]);
  const [past, setPast] = useState<PricedEvent[]>([]);
  const [pastVisible, setPastVisible] = useState(PAST_EVENTS_PAGE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [categoryLabels, setCategoryLabels] = useState<Record<string, string>>(
    {},
  );
  const [layoutModal, setLayoutModal] = useState(false);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!id) return;
      const silent = options?.silent ?? false;
      if (!silent) setLoading(true);
      try {
        const [v, cats, up, pa] = await Promise.all([
          fetchVenueById(id),
          fetchVenueCategories(),
          fetchEventsForVenue(id, { status: "upcoming" }),
          fetchEventsForVenue(id, { status: "past", perPage: 30 }),
        ]);
        setVenue(v);
        setCategoryLabels(
          Object.fromEntries(cats.map((c) => [c.value, c.label])),
        );
        const [upP, paP] = await Promise.all([withPrices(up), withPrices(pa)]);
        setUpcoming(upP);
        setPast(paP);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user?.id || !id) {
      setFollowed(false);
      return;
    }
    void isVenueFollowed(user.id, id).then(setFollowed);
  }, [user?.id, id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const bannerUrl =
    resolveRemoteImageUrl(venue?.bannerUrl) ||
    resolveRemoteImageUrl(venue?.logoUrl);
  const thumbUrl =
    resolveRemoteImageUrl(venue?.logoUrl) ||
    resolveRemoteImageUrl(venue?.bannerUrl);
  const layoutUrl = resolveRemoteImageUrl(venue?.layoutUrl);

  const categoryLabel = (venue?.categories || [])
    .map((cid) => categoryLabels[cid])
    .filter(Boolean)
    .join(", ");
  const cityLabel = formatCityLabel(venue?.city);
  const addressLabel = [cityLabel, venue?.address].filter(Boolean).join(", ");

  const mapsHref = (() => {
    if (venue?.coordinates) {
      const [lat, lng] = venue.coordinates.split(",").map((p) => p.trim());
      if (lat && lng) {
        return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      }
    }
    if (addressLabel) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLabel)}`;
    }
    return null;
  })();

  const onShare = async () => {
    if (!venue) return;
    const url = venue.venueUrl || `${GISE_WEB_URL}/mekanlar/${venue.id}`;
    try {
      await Share.share({ message: `${venue.name}\n${url}`, url });
    } catch {
      /* cancelled */
    }
  };

  const visiblePast = past.slice(0, pastVisible);
  const hasMorePast = past.length > pastVisible;

  return (
    <SafeAreaView edges={["left", "right"]} style={styles.page}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />

      {!venue && !loading ? (
        <View style={styles.notFound}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={AppColors.cardText} />
          </TouchableOpacity>
          <Text style={{ marginTop: 12 }}>{t("venueNotFound")}</Text>
        </View>
      ) : loading && !venue ? (
        <View style={styles.notFound}>
          <ActivityIndicator color={DETAIL_ACCENT} size="large" />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: 40,
            }}
            refreshControl={appRefreshControl(refreshing, onRefresh)}
          >
            <ImmersiveDetailHero
              title={venue?.name || " "}
              imageUrl={bannerUrl}
              cacheKey={venue ? venueImageCacheKey(venue) : null}
              recyclingKey={venue ? `${venue.id}-hero` : "v-hero"}
            />

            <View style={styles.body}>
              {venue ? (
                <>
                  <DetailCard>
                    <View style={styles.summaryInner}>
                      <View style={styles.thumbWrap}>
                        <RemoteCardImage
                          uri={thumbUrl}
                          recyclingKey={`${venue.id}-thumb`}
                          style={StyleSheet.absoluteFill}
                          contentFit="cover"
                        />
                      </View>
                      <View style={styles.summaryMeta}>
                        <DetailMetaRow
                          icon="pricetag-outline"
                          label={categoryLabel}
                        />
                        <DetailMetaRow
                          icon="location-outline"
                          label={addressLabel}
                          href={mapsHref}
                        />
                        <DetailMetaRow
                          icon="call-outline"
                          label={venue.phone || ""}
                          href={venue.phone ? `tel:${venue.phone}` : null}
                        />
                      </View>
                    </View>
                    <DetailActionsRow>
                      <DetailActionButton
                        icon={followed ? "heart" : "heart-outline"}
                        label={followed ? t("followingBtn") : t("follow")}
                        onPress={() => {
                          if (!user?.id) {
                            router.push("/(auth)/login");
                            return;
                          }
                          void toggleVenueFollow(user.id, venue.id).then(
                            setFollowed,
                          );
                        }}
                      />
                      {layoutUrl || venue.youtube ? (
                        <DetailActionButton
                          icon="play-circle-outline"
                          label={t("media")}
                          onPress={() => {
                            if (venue.youtube && !layoutUrl) {
                              void Linking.openURL(
                                venue.youtube.startsWith("http")
                                  ? venue.youtube
                                  : `https://www.youtube.com/watch?v=${venue.youtube}`,
                              );
                              return;
                            }
                            if (layoutUrl) setLayoutModal(true);
                          }}
                        />
                      ) : null}
                      <DetailActionButton
                        icon="share-outline"
                        label={t("share")}
                        onPress={() => void onShare()}
                        flex={0.7}
                      />
                    </DetailActionsRow>
                  </DetailCard>

                  {venue.about?.trim() ? (
                    <DetailCard>
                      <ClampedHtmlSection
                        title={t("about")}
                        html={venue.about}
                      />
                    </DetailCard>
                  ) : null}

                  {layoutUrl ? (
                    <DetailCard>
                      <View style={styles.layoutRow}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                          <Text style={[styles.cardTitle, { marginBottom: 4 }]}>
                            {t("venueLayout")}
                          </Text>
                          <Text style={styles.layoutHint}>
                            {t("venueLayoutHint")}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => setLayoutModal(true)}
                          style={styles.layoutThumb}
                        >
                          <RemoteCardImage
                            uri={layoutUrl}
                            recyclingKey={`${venue.id}-layout`}
                            style={StyleSheet.absoluteFill}
                            contentFit="cover"
                          />
                        </TouchableOpacity>
                      </View>
                    </DetailCard>
                  ) : null}

                  <View>
                    <DetailCard>
                      <Text style={styles.cardTitle}>
                        {t("upcomingEvents")}
                      </Text>
                      {upcoming.length > 0 ? (
                        <View style={{ gap: LIST_CARD.gap }}>
                          {upcoming.map((event) => (
                            <HomeEventHorizontalCard
                              key={event.id}
                              event={event}
                            />
                          ))}
                        </View>
                      ) : (
                        <View style={styles.empty}>
                          <Text style={styles.emptyTitle}>
                            {t("noEventsVenue")}
                          </Text>
                          <Text style={styles.emptyHint}>
                            {t("noEventsVenueHint")}
                          </Text>
                        </View>
                      )}
                    </DetailCard>

                    {past.length > 0 ? (
                      <DetailCard style={{ marginTop: DETAIL_BODY_GAP }}>
                        <Text style={styles.cardTitle}>{t("pastEvents")}</Text>
                        <View style={{ gap: LIST_CARD.gap }}>
                          {visiblePast.map((event) => (
                            <HomeEventHorizontalCard
                              key={event.id}
                              event={event}
                            />
                          ))}
                        </View>
                        {hasMorePast ? (
                          <TouchableOpacity
                            onPress={() =>
                              setPastVisible((n) => n + PAST_EVENTS_PAGE)
                            }
                            style={styles.loadMore}
                          >
                            <Text style={styles.loadMoreText}>
                              {t("loadMore")}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </DetailCard>
                    ) : null}
                  </View>
                </>
              ) : null}
            </View>
          </ScrollView>

          {layoutUrl && layoutModal ? (
            <View style={styles.modalOverlay}>
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                onPress={() => setLayoutModal(false)}
              />
              <View style={styles.modalCard}>
                <TouchableOpacity
                  onPress={() => setLayoutModal(false)}
                  style={{ alignSelf: "flex-end", padding: 4 }}
                >
                  <Ionicons name="close" size={22} color={AppColors.cardText} />
                </TouchableOpacity>
                <RemoteCardImage
                  uri={layoutUrl}
                  recyclingKey={`${venue?.id}-layout-modal`}
                  style={{ width: "100%", height: 360 }}
                  contentFit="contain"
                />
              </View>
            </View>
          ) : null}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: DETAIL_PAGE_BG },
  body: {
    paddingHorizontal: DETAIL_BODY_PX,
    marginTop: DETAIL_BODY_OVERLAP,
    gap: DETAIL_BODY_GAP,
    zIndex: 3,
  },
  summaryInner: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  thumbWrap: {
    width: DETAIL_THUMB_WIDTH,
    height: DETAIL_THUMB_MIN_HEIGHT,
    borderRadius: DETAIL_THUMB_RADIUS,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
    flexShrink: 0,
  },
  summaryMeta: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    gap: 8,
    paddingTop: 2,
  },
  cardTitle: {
    marginBottom: 10,
    fontFamily: "PoppinsBold",
    fontSize: 16,
    color: "#0F2137",
  },
  layoutRow: { flexDirection: "row", alignItems: "center" },
  layoutHint: {
    fontFamily: "PoppinsRegular",
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 16,
  },
  layoutThumb: {
    width: DETAIL_LAYOUT_THUMB.width,
    height: DETAIL_LAYOUT_THUMB.height,
    borderRadius: DETAIL_LAYOUT_THUMB.radius,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F3F4F6",
  },
  empty: { paddingVertical: 12, alignItems: "center" },
  emptyTitle: {
    fontFamily: "PoppinsSemiBold",
    fontSize: 14,
    color: "#0F2137",
    textAlign: "center",
  },
  emptyHint: {
    marginTop: 4,
    fontFamily: "PoppinsRegular",
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  loadMore: {
    marginTop: 12,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: DETAIL_ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreText: {
    fontFamily: "PoppinsBold",
    fontSize: 13,
    color: "#FFFFFF",
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 50,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
  },
});
