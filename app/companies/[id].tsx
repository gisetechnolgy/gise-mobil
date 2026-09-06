import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  EventCardImage,
  prefetchEventImages,
} from "../components/EventCardImage";
import HtmlContent from "../components/HtmlContent";
import { RemoteCardImage } from "../components/RemoteCardImage";
import { AppColors } from "../../constants/colors";
import { useTranslation } from "../context/LocaleContext";
import { appRefreshControl } from "../../lib/appRefreshControl";
import { formatCityLabel } from "../../lib/cities";
import {
  fetchCompanyById,
  companyImageCacheKey,
  type CompanyItem,
} from "../../lib/companies";
import { fetchCategories } from "../../lib/definitions";
import {
  EventItem,
  eventImageCacheKey,
  fetchEventsForOrganisationCompany,
  formatEventDateLong,
  formatEventTime,
  htmlToPlainText,
} from "../../lib/events";
import { useIsTablet } from "../../lib/responsive";
import { resolveRemoteImageUrl } from "../../lib/remoteImage";
import { useAuth } from "../context/AuthContext";
import { isCompanyFollowed, toggleCompanyFollow } from "../../lib/followedCompanies";
import { AppText as Text } from "@/components/ui/AppText";

const SKELETON = "#D8DCE2";
const EVENT_CARD_IMAGE_WIDTH = { phone: 128, tablet: 156 };
const EVENT_CARD_MIN_HEIGHT = { phone: 128, tablet: 148 };

function SkeletonBlock({
  width = "100%",
  height,
  borderRadius = 12,
  style,
}: {
  width?: number | `${number}%` | "100%";
  height: number;
  borderRadius?: number;
  style?: object;
}) {
  return (
    <View
      style={[
        { width, height, borderRadius, backgroundColor: SKELETON },
        style,
      ]}
    />
  );
}

function getEventCategoryLabel(
  event: EventItem,
  categoryLabels: Record<string, string>,
): string {
  if (event.category && categoryLabels[event.category]) {
    return categoryLabels[event.category];
  }
  return event.categoryLabel?.trim() || event.category?.trim() || "";
}

function formatVenueLine(event: EventItem): string {
  const venue = event.venueName?.trim();
  const city = formatCityLabel(event.city);
  if (venue && city) return `${venue} / ${city}`;
  return venue || city || "Mekan bilgisi yok";
}

function EventInfoRow({
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

function EventCardSkeleton({ isTablet }: { isTablet: boolean }) {
  const imageWidth = isTablet
    ? EVENT_CARD_IMAGE_WIDTH.tablet
    : EVENT_CARD_IMAGE_WIDTH.phone;
  const cardMinHeight = isTablet
    ? EVENT_CARD_MIN_HEIGHT.tablet
    : EVENT_CARD_MIN_HEIGHT.phone;

  return (
    <View style={styles.eventCard}>
      <SkeletonBlock
        width={imageWidth}
        height={cardMinHeight}
        borderRadius={0}
        style={styles.eventCardImage}
      />
      <View style={[styles.eventCardBody, isTablet && styles.eventCardBodyTablet]}>
        <SkeletonBlock width="36%" height={11} borderRadius={6} />
        <SkeletonBlock
          width="88%"
          height={15}
          borderRadius={6}
          style={{ marginTop: 8 }}
        />
        <View style={styles.titleDivider} />
        <SkeletonBlock width="72%" height={12} borderRadius={6} style={{ marginTop: 4 }} />
        <SkeletonBlock width="58%" height={12} borderRadius={6} style={{ marginTop: 6 }} />
        <SkeletonBlock width="42%" height={12} borderRadius={6} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

export default function CompanyDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [company, setCompany] = useState<CompanyItem | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventCategoryLabels, setEventCategoryLabels] = useState<
    Record<string, string>
  >({});
  const [companyLoading, setCompanyLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFollowed, setIsFollowed] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!id) return;
      const silent = options?.silent ?? false;
      if (!silent) {
        setCompanyLoading(true);
        setEventsLoading(true);
      }
      setError(null);
      try {
        const [companyData, eventCategories] = await Promise.all([
          fetchCompanyById(id),
          fetchCategories(),
        ]);
        if (!companyData) {
          setError(t("companyNotFound"));
          setCompany(null);
          setEvents([]);
          return;
        }
        setCompany(companyData);
        setEventCategoryLabels(
          Object.fromEntries(eventCategories.map((c) => [c.value, c.label])),
        );
        if (!silent) setCompanyLoading(false);

        const upcoming = await fetchEventsForOrganisationCompany(id, {
          status: "upcoming",
        });
        setEvents(upcoming);
        void prefetchEventImages(upcoming);
      } catch {
        setError(t("companyLoadError"));
      } finally {
        if (!silent) {
          setCompanyLoading(false);
          setEventsLoading(false);
        }
      }
    },
    [id],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user?.id || !company?.id) {
      setIsFollowed(false);
      return;
    }
    void (async () => {
      const followed = await isCompanyFollowed(user.id, company.id);
      setIsFollowed(followed);
    })();
  }, [user?.id, company?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const bannerUri = resolveRemoteImageUrl(
    company?.bannerUrl,
    company ? companyImageCacheKey(company) : null,
  );
  const logoUri = resolveRemoteImageUrl(
    company?.logoUrl,
    company ? `${company.id}-logo` : null,
  );
  const companyAboutText = company?.about ? htmlToPlainText(company.about) : "";

  return (
    <SafeAreaView edges={["left", "right"]} style={styles.safe}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />

      {error && !companyLoading && !company ? (
        <View style={[styles.loader, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backFloating}>
            <Ionicons name="chevron-back" size={24} color={AppColors.cardText} />
          </TouchableOpacity>
          <Text style={styles.errorText}>{error ?? t("companyNotFound")}</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={appRefreshControl(refreshing, onRefresh)}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View style={[styles.bannerWrap, isTablet && styles.bannerWrapTablet]}>
            {companyLoading ? (
              <View style={[StyleSheet.absoluteFillObject, styles.bannerSkeleton]} />
            ) : bannerUri ? (
              <RemoteCardImage
                uri={bannerUri}
                recyclingKey={company?.id ?? "company-banner"}
                contentFit="cover"
                style={StyleSheet.absoluteFillObject}
              />
            ) : (
              <View style={[StyleSheet.absoluteFillObject, styles.bannerFallback]} />
            )}
            <View style={styles.bannerOverlay} />
            <TouchableOpacity
              onPress={() => router.back()}
              style={[styles.backFloating, { top: insets.top + 4 }]}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={[styles.bannerTitleWrap, { paddingTop: insets.top + 8 }]}>
              {companyLoading ? (
                <SkeletonBlock
                  width={isTablet ? "52%" : "58%"}
                  height={isTablet ? 28 : 24}
                  borderRadius={8}
                />
              ) : (
                <Text
                  style={[styles.bannerTitle, isTablet && styles.bannerTitleTablet]}
                  numberOfLines={2}
                >
                  {company?.name}
                </Text>
              )}
            </View>
          </View>

          <View style={[styles.body, isTablet && styles.bodyTablet]}>
            {companyLoading || !company ? (
              <>
                <View style={[styles.summaryRow, isTablet && styles.summaryRowTablet]}>
                  <SkeletonBlock
                    width={isTablet ? 116 : 100}
                    height={isTablet ? 116 : 100}
                    borderRadius={isTablet ? 14 : 12}
                  />
                  <View style={[styles.summaryCard, isTablet && styles.summaryCardTablet]}>
                    <SkeletonBlock width="38%" height={13} borderRadius={6} />
                    <SkeletonBlock width="52%" height={14} borderRadius={6} style={{ marginTop: 8 }} />
                    <SkeletonBlock width="46%" height={14} borderRadius={6} style={{ marginTop: 8 }} />
                  </View>
                </View>
                <View style={styles.actionRow}>
                  <View style={{ flex: 1.2 }}>
                    <SkeletonBlock height={isTablet ? 44 : 40} borderRadius={isTablet ? 10 : 8} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <SkeletonBlock height={isTablet ? 44 : 40} borderRadius={isTablet ? 10 : 8} />
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={[styles.summaryRow, isTablet && styles.summaryRowTablet]}>
                  <RemoteCardImage
                    uri={logoUri}
                    recyclingKey={`${company.id}-logo`}
                    contentFit="cover"
                    style={[styles.summaryThumb, isTablet && styles.summaryThumbTablet]}
                  />
                  <View style={[styles.summaryCard, isTablet && styles.summaryCardTablet]}>
                    <View style={styles.summaryMeta}>
                      {company.city ? (
                        <View style={styles.summaryInfoRow}>
                          <Ionicons
                            name="location"
                            size={isTablet ? 18 : 16}
                            color={AppColors.cardText}
                          />
                          <Text
                            style={[styles.summaryInfoText, isTablet && styles.summaryInfoTextTablet]}
                            numberOfLines={1}
                          >
                            {formatCityLabel(company.city)}
                          </Text>
                        </View>
                      ) : null}
                      {company.phone ? (
                        <TouchableOpacity
                          style={styles.summaryInfoRow}
                          onPress={() => void Linking.openURL(`tel:${company.phone}`)}
                        >
                          <Ionicons
                            name="call"
                            size={isTablet ? 18 : 16}
                            color={AppColors.cardText}
                          />
                          <Text
                            style={[styles.summaryInfoText, isTablet && styles.summaryInfoTextTablet]}
                            numberOfLines={1}
                          >
                            {company.phone}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={async () => {
                      if (!user?.id || !company?.id || followBusy) return;
                      setFollowBusy(true);
                      try {
                        const next = await toggleCompanyFollow(user.id, company.id);
                        setIsFollowed(next);
                      } finally {
                        setFollowBusy(false);
                      }
                    }}
                    style={[styles.actionBtnPrimary, styles.actionBtnFollow, isTablet && styles.actionBtnTablet]}
                  >
                    <Ionicons
                      name={isFollowed ? "checkmark-circle" : "person-add"}
                      size={20}
                      color={AppColors.navText}
                    />
                    <Text style={[styles.actionBtnText, isTablet && styles.actionBtnTextTablet]}>
                      {followBusy ? "..." : isFollowed ? t("followingBtn") : t("follow")}
                    </Text>
                  </TouchableOpacity>
                  {company.phone ? (
                    <TouchableOpacity
                      activeOpacity={0.88}
                      onPress={() => void Linking.openURL(`tel:${company.phone}`)}
                      style={[styles.actionBtnPrimary, styles.actionBtnCall, isTablet && styles.actionBtnTablet]}
                    >
                      <Ionicons name="call" size={20} color={AppColors.navText} />
                      <Text style={[styles.actionBtnText, isTablet && styles.actionBtnTextTablet]}>
                        Ara
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {companyAboutText ? (
                  <View style={[styles.infoCard, isTablet && styles.infoCardTablet]}>
                    <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet]}>
                      Bilgi
                    </Text>
                    <HtmlContent
                      html={company.about!}
                      style={{
                        fontSize: isTablet ? 15 : 14,
                        lineHeight: isTablet ? 22 : 20,
                        color: AppColors.cardText,
                      }}
                    />
                  </View>
                ) : null}
              </>
            )}

            <Text style={[styles.eventsHeading, isTablet && styles.eventsHeadingTablet]}>
              Bilet almak istediğiniz etkinliği seçin
            </Text>

            {eventsLoading ? (
              <View style={styles.eventsList}>
                {Array.from({ length: 2 }).map((_, idx) => (
                  <EventCardSkeleton key={`company-event-skel-${idx}`} isTablet={isTablet} />
                ))}
              </View>
            ) : events.length === 0 ? (
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyCard, isTablet && styles.emptyCardTablet]}>
                  <View
                    style={[styles.emptyIconWrap, isTablet && styles.emptyIconWrapTablet]}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={isTablet ? 34 : 30}
                      color={AppColors.cardText}
                    />
                  </View>
                  <Text style={[styles.emptyTitle, isTablet && styles.emptyTitleTablet]}>
                    Yaklaşan etkinlik bulunmuyor
                  </Text>
                  <Text style={[styles.emptySubtitle, isTablet && styles.emptySubtitleTablet]}>
                    Bu şirkete ait yeni etkinlikler eklendiğinde burada görünecek.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.eventsList}>
                {events.map((event) => {
                  const categoryLabel = getEventCategoryLabel(
                    event,
                    eventCategoryLabels,
                  );
                  const imageWidth = isTablet
                    ? EVENT_CARD_IMAGE_WIDTH.tablet
                    : EVENT_CARD_IMAGE_WIDTH.phone;
                  const cardMinHeight = isTablet
                    ? EVENT_CARD_MIN_HEIGHT.tablet
                    : EVENT_CARD_MIN_HEIGHT.phone;

                  return (
                    <TouchableOpacity
                      key={event.id}
                      style={styles.eventCard}
                      activeOpacity={0.85}
                      onPress={() => router.push(`/events/${event.id}`)}
                    >
                      <EventCardImage
                        imageUrl={event.imageUrl}
                        cacheKey={eventImageCacheKey(event)}
                        recyclingKey={event.id}
                        contentFit="cover"
                        style={[
                          styles.eventCardImage,
                          { width: imageWidth, minHeight: cardMinHeight },
                        ]}
                      />
                      <View
                        style={[
                          styles.eventCardBody,
                          isTablet && styles.eventCardBodyTablet,
                        ]}
                      >
                        {categoryLabel ? (
                          <Text
                            style={[styles.category, isTablet && styles.categoryTablet]}
                            numberOfLines={1}
                          >
                            {categoryLabel}
                          </Text>
                        ) : null}
                        <Text
                          style={[styles.title, isTablet && styles.titleTablet]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {event.title}
                        </Text>
                        <View style={styles.titleDivider} />
                        <View style={styles.infoList}>
                          <EventInfoRow
                            icon="location"
                            label={formatVenueLine(event)}
                            isTablet={isTablet}
                          />
                          <EventInfoRow
                            icon="calendar"
                            label={formatEventDateLong(event.startsAt)}
                            isTablet={isTablet}
                          />
                          <EventInfoRow
                            icon="time"
                            label={formatEventTime(event.startsAt)}
                            isTablet={isTablet}
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.background,
  },
  backFloating: {
    position: "absolute",
    left: 12,
    zIndex: 2,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerWrap: {
    height: 200,
    backgroundColor: AppColors.navBg,
  },
  bannerWrapTablet: {
    height: 240,
  },
  bannerFallback: {
    backgroundColor: AppColors.navBg,
  },
  bannerSkeleton: {
    backgroundColor: SKELETON,
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  bannerTitleWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 56,
  },
  bannerTitle: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "PoppinsBold",
    textAlign: "center",
  },
  bannerTitleTablet: {
    fontSize: 28,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
  },
  bodyTablet: {
    paddingHorizontal: 26,
    paddingTop: 18,
    gap: 18,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  summaryRowTablet: {
    gap: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: AppColors.cardBg,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    justifyContent: "center",
    minHeight: 100,
  },
  summaryCardTablet: {
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    minHeight: 116,
  },
  summaryThumb: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: "#E8ECF0",
  },
  summaryThumbTablet: {
    width: 116,
    height: 116,
    borderRadius: 14,
  },
  summaryMeta: {
    minWidth: 0,
    gap: 6,
    justifyContent: "center",
  },
  summaryInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryInfoText: {
    flex: 1,
    color: AppColors.cardText,
    fontSize: 14,
    fontFamily: "PoppinsMedium",
  },
  summaryInfoTextTablet: {
    fontSize: 15,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: AppColors.accent,
  },
  actionBtnFollow: {
    flex: 1.2,
  },
  actionBtnCall: {
    flex: 0.75,
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: AppColors.secondaryButton,
  },
  actionBtnTablet: {
    minHeight: 44,
    borderRadius: 10,
  },
  actionBtnText: {
    color: AppColors.navText,
    fontSize: 13,
    fontFamily: "PoppinsBold",
  },
  actionBtnTextTablet: {
    fontSize: 14,
  },
  infoCard: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 2,
    gap: 4,
  },
  infoCardTablet: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 6,
  },
  sectionTitle: {
    color: AppColors.heading,
    fontSize: 16,
    fontFamily: "PoppinsBold",
  },
  sectionTitleTablet: {
    fontSize: 18,
  },
  eventsHeading: {
    color: AppColors.heading,
    fontSize: 16,
    fontFamily: "PoppinsBold",
    lineHeight: 22,
  },
  eventsHeadingTablet: {
    fontSize: 18,
    lineHeight: 24,
  },
  eventsList: {
    gap: 12,
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
  eventCard: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 12,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "stretch",
  },
  eventCardImage: {
    alignSelf: "stretch",
    backgroundColor: "#E8ECF0",
  },
  eventCardBody: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 12,
    paddingLeft: 12,
    justifyContent: "center",
  },
  eventCardBodyTablet: {
    paddingVertical: 14,
    paddingRight: 14,
    paddingLeft: 14,
  },
  category: {
    color: AppColors.accent,
    fontSize: 11,
    fontFamily: "PoppinsSemiBold",
    marginBottom: 2,
  },
  categoryTablet: {
    fontSize: 12,
  },
  title: {
    color: AppColors.heading,
    fontSize: 15,
    fontFamily: "PoppinsSemiBold",
    lineHeight: 19,
  },
  titleTablet: {
    fontSize: 17,
    lineHeight: 22,
  },
  titleDivider: {
    height: 1,
    backgroundColor: "rgba(52, 61, 72, 0.1)",
    marginTop: 6,
    marginBottom: 4,
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
    flex: 1,
    color: AppColors.cardText,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "PoppinsMedium",
  },
  infoTextTablet: {
    fontSize: 13,
    lineHeight: 17,
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
