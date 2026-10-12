import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppColors } from "../../constants/colors";
import {
  DETAIL_ACCENT,
  DETAIL_BODY_GAP,
  DETAIL_BODY_OVERLAP,
  DETAIL_BODY_PX,
  DETAIL_LAYOUT_THUMB,
  DETAIL_PAGE_BG,
  DETAIL_STICKY_BAR_CONTENT_HEIGHT,
  DETAIL_THUMB_MIN_HEIGHT,
  DETAIL_THUMB_RADIUS,
  DETAIL_THUMB_WIDTH,
} from "../../constants/mobileDetail";
import { GISE_WEB_URL } from "../../lib/appConfig";
import { appRefreshControl } from "../../lib/appRefreshControl";
import { formatCityLabel } from "../../lib/cities";
import { formatDressRuleText } from "../../lib/dressCodes";
import { shouldDenyManagerEventAccess } from "../../lib/eventAccess";
import {
  EventItem,
  eventImageCacheKey,
  fetchEventById,
  formatEventDate,
  htmlToPlainText,
} from "../../lib/events";
import {
  fetchEventActivePriceInfo,
  formatPriceRangeLabel,
  getActivePriceInfoFromEvent,
  type ActivePriceInfo,
} from "../../lib/startingPrice";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/_LocaleContext";
import {
  EventCardImage,
  prefetchEventImages,
} from "../components/_EventCardImage";
import ClampedHtmlSection from "../components/detail/ClampedHtmlSection";
import { DetailIconButton } from "../components/detail/DetailActionButton";
import {
  isEventFavourite,
  toggleEventFavourite,
} from "../../lib/favouriteEvents";
import DetailCard from "../components/detail/DetailCard";
import DetailMetaRow from "../components/detail/DetailMetaRow";
import ImmersiveDetailHero from "../components/detail/ImmersiveDetailHero";
import StickyCtaBar from "../components/detail/StickyCtaBar";
import { AppText as Text } from "@/components/ui/AppText";

function ChipRow({
  title,
  subtitle,
  fill,
}: {
  title: string;
  subtitle: string;
  /** Yan yana satırda eş yükseklik */
  fill?: boolean;
}) {
  return (
    <View style={[styles.chip, fill && { flex: 1 }]}>
      <Text style={styles.chipTitle}>{title}</Text>
      <Text style={styles.chipSub}>{subtitle}</Text>
    </View>
  );
}

export default function EventDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, locale } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [priceInfo, setPriceInfo] = useState<ActivePriceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [layoutModal, setLayoutModal] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);

  const loadEvent = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!id) return;
      const silent = options?.silent ?? false;
      if (!silent) setLoading(true);
      try {
        const data = await fetchEventById(id, { forListing: true });
        setEvent(data);
        void prefetchEventImages([data]);
        try {
          const price =
            getActivePriceInfoFromEvent(data) ??
            (await fetchEventActivePriceInfo(data.id, {
              commissionFee: data.commissionFee,
              isCommissionExtra: data.isCommissionExtra,
            }));
          setPriceInfo(price);
        } catch {
          setPriceInfo(null);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    void loadEvent();
  }, [loadEvent, locale]);

  useEffect(() => {
    if (!event || !user) return;
    if (
      shouldDenyManagerEventAccess(user, {
        venueId: event.venueId,
        organisationCompanyIds: event.organisationCompanyIds,
      })
    ) {
      router.replace("/(tabs)");
    }
  }, [event, user, router]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadEvent({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadEvent]);

  const openPurchase = () => {
    if (!event?.id) return;
    if (event.type === 3) {
      router.push(`/events/seats/${event.id}` as import("expo-router").Href);
      return;
    }
    router.push(`/events/buy/${event.id}` as import("expo-router").Href);
  };

  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    if (!user?.id || !id) {
      setIsFav(false);
      return;
    }
    let alive = true;
    void isEventFavourite(user.id, id).then((v) => {
      if (alive) setIsFav(v);
    });
    return () => {
      alive = false;
    };
  }, [user?.id, id]);

  const onToggleFavourite = () => {
    if (!user?.id) {
      router.push("/(auth)/login");
      return;
    }
    if (!id) return;
    setIsFav((v) => !v);
    void toggleEventFavourite(user.id, id)
      .then(setIsFav)
      .catch(() => setIsFav((v) => !v));
  };

  const onShare = async () => {
    if (!event) return;
    const url = event.eventUrl || `${GISE_WEB_URL}/etkinlikler/${event.id}`;
    try {
      await Share.share({ message: `${event.title}\n${url}`, url });
    } catch {
      /* cancelled */
    }
  };

  const cityText = formatCityLabel(event?.city);
  const dressRuleText = formatDressRuleText(event?.rules?.dress, locale);
  const detailsPlain = event ? htmlToPlainText(event.details).trim() : "";
  const rawAge = event?.rules?.age?.trim() ?? "";
  const ageRuleText = /^\d+$/.test(rawAge) ? `${rawAge}+` : rawAge;
  const couplesRuleText =
    event?.rules?.couples === 2
      ? t("coupleRuleValue")
      : event?.rules?.couples === 1
        ? t("coupleRuleNone")
        : "";
  const hasRules =
    !!ageRuleText || !!couplesRuleText || !!dressRuleText || !!detailsPlain;

  return (
    <SafeAreaView edges={["left", "right"]} style={styles.page}>
      <StatusBar style="light" />
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: true,
          fullScreenGestureEnabled: false,
        }}
      />

      {!event && !loading ? (
        <View style={styles.notFound}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.notFoundBack}
          >
            <Ionicons name="chevron-back" size={22} color={AppColors.cardText} />
          </TouchableOpacity>
          <Text style={{ textAlign: "center", color: AppColors.heading }}>
            {t("eventNotFound")}
          </Text>
        </View>
      ) : loading && !event ? (
        <View style={styles.notFound}>
          <ActivityIndicator color={DETAIL_ACCENT} size="large" />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom:
                DETAIL_STICKY_BAR_CONTENT_HEIGHT + insets.bottom + 40,
            }}
            refreshControl={appRefreshControl(refreshing, onRefresh)}
          >
            <ImmersiveDetailHero
              title={loading ? " " : event?.title || ""}
              imageUrl={event?.imageUrl || event?.bannerCardUrl}
              cacheKey={event ? eventImageCacheKey(event) : null}
              recyclingKey={event ? `${event.id}-hero` : "hero"}
            />

            <View style={styles.body}>
              {event ? (
                <>
                  <DetailCard>
                    <View style={styles.summaryInner}>
                      <View style={styles.thumbWrap}>
                        <EventCardImage
                          imageUrl={
                            event.bannerCardUrl || event.imageUrl
                          }
                          cacheKey={eventImageCacheKey({
                            id: event.id,
                            imageUrl:
                              event.bannerCardUrl || event.imageUrl,
                          })}
                          recyclingKey={`${event.id}-thumb`}
                          style={StyleSheet.absoluteFill}
                          contentFit="cover"
                        />
                      </View>
                      <View style={styles.summaryMeta}>
                        <DetailMetaRow
                          icon="location-outline"
                          label={[event.venueName?.trim(), cityText]
                            .filter(Boolean)
                            .join(", ")}
                          onPress={
                            event.venueId
                              ? () =>
                                  router.push(
                                    `/venues/${event.venueId}` as import("expo-router").Href,
                                  )
                              : undefined
                          }
                        />
                        <DetailMetaRow
                          icon="calendar-outline"
                          label={formatEventDate(event.startsAt)}
                        />
                        {priceInfo ? (
                          <DetailMetaRow
                            icon="ticket-outline"
                            label={
                              formatPriceRangeLabel(priceInfo, t("freeOfCharge")) ?? ""
                            }
                          />
                        ) : null}
                        {!user?.isSaleMode ? (
                          <View style={styles.metaActions}>
                            <DetailIconButton
                              icon="heart-outline"
                              activeIcon="heart"
                              active={isFav}
                              label={
                                isFav
                                  ? t("removeFromFavourites")
                                  : t("addToFavourites")
                              }
                              onPress={onToggleFavourite}
                            />
                            <DetailIconButton
                              icon="share-social-outline"
                              label={t("share")}
                              onPress={() => void onShare()}
                            />
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </DetailCard>

                  {htmlToPlainText(event.description).trim() ? (
                    <DetailCard>
                      <ClampedHtmlSection
                        title={t("eventDetail")}
                        html={event.description}
                      />
                    </DetailCard>
                  ) : null}

                  {event.venueLayoutImageUrl ? (
                    <DetailCard>
                      <View style={styles.layoutRow}>
                        <View style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
                          <Text style={[styles.cardTitle, { marginBottom: 4 }]}>
                            {t("venueLayout")}
                          </Text>
                          <Text style={styles.layoutHint}>
                            {t("venueLayoutHint")}
                          </Text>
                        </View>
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => setLayoutModal(true)}
                          style={styles.layoutThumb}
                        >
                          <EventCardImage
                            imageUrl={event.venueLayoutImageUrl}
                            cacheKey={event.venueLayoutImageUrl}
                            recyclingKey={`${event.id}-layout`}
                            style={StyleSheet.absoluteFill}
                            contentFit="cover"
                          />
                        </TouchableOpacity>
                      </View>
                    </DetailCard>
                  ) : null}

                  {hasRules ? (
                    <DetailCard>
                      {!detailsPlain ? (
                        <Text style={styles.cardTitle}>{t("thingsToKnow")}</Text>
                      ) : null}
                      <View style={{ gap: 8, marginTop: !detailsPlain ? 4 : 0 }}>
                        {ageRuleText || couplesRuleText ? (
                          <View style={styles.chipPair}>
                            {ageRuleText ? (
                              <View
                                style={
                                  couplesRuleText
                                    ? styles.chipPairAge
                                    : styles.chipPairGrow
                                }
                              >
                                <ChipRow
                                  title={t("ageRule")}
                                  subtitle={ageRuleText}
                                  fill
                                />
                              </View>
                            ) : null}
                            {couplesRuleText ? (
                              <View style={styles.chipPairGrow}>
                                <ChipRow
                                  title={t("coupleRule")}
                                  subtitle={couplesRuleText}
                                  fill
                                />
                              </View>
                            ) : null}
                          </View>
                        ) : null}
                        {dressRuleText ? (
                          <ChipRow
                            title={t("dressRule")}
                            subtitle={dressRuleText}
                          />
                        ) : null}
                      </View>
                      {detailsPlain ? (
                        <View style={styles.accordion}>
                          <TouchableOpacity
                            style={styles.accordionHead}
                            onPress={() => setDetailsOpen((v) => !v)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.accordionTitle}>
                              {t("thingsToKnow")}
                            </Text>
                            <View style={styles.chevronBox}>
                              <Ionicons
                                name={
                                  detailsOpen ? "chevron-up" : "chevron-down"
                                }
                                size={16}
                                color="#374151"
                              />
                            </View>
                          </TouchableOpacity>
                          {detailsOpen ? (
                            <Text style={styles.detailsBody}>{detailsPlain}</Text>
                          ) : null}
                        </View>
                      ) : null}
                    </DetailCard>
                  ) : null}
                </>
              ) : null}
            </View>
          </ScrollView>

          {!user?.isSaleMode && event ? (
            <StickyCtaBar label={t("buy")} onPress={openPurchase} />
          ) : null}

          {event?.venueLayoutImageUrl ? (
            <Modal
              animationType="fade"
              transparent
              visible={layoutModal}
              onRequestClose={() => setLayoutModal(false)}
            >
              <Pressable
                style={styles.modalOverlay}
                onPress={() => setLayoutModal(false)}
              >
                <Pressable style={styles.modalCard} onPress={() => {}}>
                  <TouchableOpacity
                    onPress={() => setLayoutModal(false)}
                    style={styles.modalClose}
                  >
                    <Ionicons
                      name="close"
                      size={22}
                      color={AppColors.cardText}
                    />
                  </TouchableOpacity>
                  <EventCardImage
                    imageUrl={event.venueLayoutImageUrl}
                    cacheKey={event.venueLayoutImageUrl}
                    recyclingKey={`${event.id}-layout-modal`}
                    contentFit="contain"
                    style={{ width: "100%", height: 360 }}
                  />
                </Pressable>
              </Pressable>
            </Modal>
          ) : null}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: DETAIL_PAGE_BG,
  },
  body: {
    paddingHorizontal: DETAIL_BODY_PX,
    marginTop: DETAIL_BODY_OVERLAP,
    gap: DETAIL_BODY_GAP,
    zIndex: 3,
  },
  summaryInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
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
  metaActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    marginBottom: 10,
    fontFamily: "PoppinsBold",
    fontSize: 16,
    color: "#0F2137",
  },
  layoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  layoutHint: {
    fontFamily: "PoppinsRegular",
    fontSize: 12,
    lineHeight: 16,
    color: "#6B7280",
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
  chip: {
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  chipPair: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
  },
  chipPairAge: {
    flexShrink: 0,
  },
  chipPairGrow: {
    flex: 1,
    minWidth: 0,
  },
  chipTitle: {
    fontFamily: "PoppinsBold",
    fontSize: 11,
    color: DETAIL_ACCENT,
  },
  chipSub: {
    fontFamily: "PoppinsRegular",
    fontSize: 11,
    color: "#1A1A1A",
    marginTop: 2,
  },
  accordion: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  accordionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accordionTitle: {
    fontFamily: "PoppinsBold",
    fontSize: 15,
    color: "#0F2137",
  },
  chevronBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  detailsBody: {
    marginTop: 10,
    fontFamily: "PoppinsRegular",
    fontSize: 13,
    lineHeight: 20,
    color: "#343D48",
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  notFoundBack: {
    position: "absolute",
    left: 12,
    top: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
  },
  modalClose: {
    alignSelf: "flex-end",
    padding: 4,
    marginBottom: 4,
  },
});
