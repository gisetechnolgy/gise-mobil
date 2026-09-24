import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
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
  DETAIL_PAGE_BG,
  DETAIL_THUMB_MIN_HEIGHT,
  DETAIL_THUMB_RADIUS,
  DETAIL_THUMB_WIDTH,
  LIST_CARD,
  PAST_EVENTS_PAGE,
} from "../../constants/mobileDetail";
import { GISE_WEB_URL } from "../../lib/appConfig";
import { appRefreshControl } from "../../lib/appRefreshControl";
import { formatCityLabel } from "../../lib/cities";
import {
  EventItem,
  fetchEventsForOrganisationCompany,
} from "../../lib/events";
import {
  enrichEventsWithPriceInfo,
  type ActivePriceInfo,
} from "../../lib/startingPrice";
import {
  isCompanyFollowed,
  toggleCompanyFollow,
} from "../../lib/followedCompanies";
import {
  companyImageCacheKey,
  fetchCompanyById,
  type CompanyItem,
} from "../../lib/companies";
import { resolveRemoteImageUrl } from "../../lib/remoteImage";
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

type PricedEvent = EventItem & { priceInfo?: ActivePriceInfo | null };

async function withPrices(events: EventItem[]): Promise<PricedEvent[]> {
  return enrichEventsWithPriceInfo(events);
}

export default function CompanyDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const scrollRef = useRef<ScrollView>(null);

  const [company, setCompany] = useState<CompanyItem | null>(null);
  const [upcoming, setUpcoming] = useState<PricedEvent[]>([]);
  const [past, setPast] = useState<PricedEvent[]>([]);
  const [pastVisible, setPastVisible] = useState(PAST_EVENTS_PAGE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followed, setFollowed] = useState(false);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!id) return;
      const silent = options?.silent ?? false;
      if (!silent) setLoading(true);
      try {
        const [c, up, pa] = await Promise.all([
          fetchCompanyById(id),
          fetchEventsForOrganisationCompany(id, { status: "upcoming" }),
          fetchEventsForOrganisationCompany(id, {
            status: "past",
            perPage: 30,
          }),
        ]);
        setCompany(c);
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
    void isCompanyFollowed(user.id, id).then(setFollowed);
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
    resolveRemoteImageUrl(company?.bannerUrl) ||
    resolveRemoteImageUrl(company?.logoUrl);
  const thumbUrl =
    resolveRemoteImageUrl(company?.logoUrl) ||
    resolveRemoteImageUrl(company?.bannerUrl);

  const cityLabel = formatCityLabel(company?.city);
  const addressLabel = [cityLabel, company?.address].filter(Boolean).join(", ");

  const mapsHref = (() => {
    if (company?.coordinates) {
      const [lat, lng] = company.coordinates.split(",").map((p) => p.trim());
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
    if (!company) return;
    const url =
      company.companyUrl ||
      `${GISE_WEB_URL}/organizasyon-sirketleri/${company.id}`;
    try {
      await Share.share({ message: `${company.name}\n${url}`, url });
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

      {!company && !loading ? (
        <View style={styles.notFound}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={AppColors.cardText} />
          </TouchableOpacity>
          <Text style={{ marginTop: 12 }}>{t("companyNotFound")}</Text>
        </View>
      ) : loading && !company ? (
        <View style={styles.notFound}>
          <ActivityIndicator color={DETAIL_ACCENT} size="large" />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: 40,
            }}
            refreshControl={appRefreshControl(refreshing, onRefresh)}
          >
            <ImmersiveDetailHero
              title={company?.name || " "}
              imageUrl={bannerUrl}
              cacheKey={company ? companyImageCacheKey(company) : null}
              recyclingKey={company ? `${company.id}-hero` : "c-hero"}
            />

            <View style={styles.body}>
              {company ? (
                <>
                  <DetailCard>
                    <View style={styles.summaryInner}>
                      <View style={styles.thumbWrap}>
                        <RemoteCardImage
                          uri={thumbUrl}
                          recyclingKey={`${company.id}-thumb`}
                          style={StyleSheet.absoluteFill}
                          contentFit="cover"
                        />
                      </View>
                      <View style={styles.summaryMeta}>
                        <DetailMetaRow
                          icon="location-outline"
                          label={addressLabel}
                          href={mapsHref}
                        />
                        <DetailMetaRow
                          icon="call-outline"
                          label={company.phone || ""}
                          href={company.phone ? `tel:${company.phone}` : null}
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
                          void toggleCompanyFollow(user.id, company.id).then(
                            setFollowed,
                          );
                        }}
                      />
                      {company.youtube ? (
                        <DetailActionButton
                          icon="play-circle-outline"
                          label={t("media")}
                          onPress={() => {
                            void Linking.openURL(
                              company.youtube!.startsWith("http")
                                ? company.youtube!
                                : `https://www.youtube.com/watch?v=${company.youtube}`,
                            );
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

                  {company.about?.trim() ? (
                    <DetailCard>
                      <ClampedHtmlSection
                        title={t("about")}
                        html={company.about}
                      />
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
                            {t("noEventsCompany")}
                          </Text>
                          <Text style={styles.emptyHint}>
                            {t("noEventsCompanyHint")}
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
});
