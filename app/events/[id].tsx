import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { appRefreshControl } from "../../lib/appRefreshControl";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import {
  EventCardImage,
  prefetchEventImages,
} from "../components/EventCardImage";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { AppColors } from "../../constants/colors";
import { formatCityLabel } from "../../lib/cities";
import { formatDressRuleText } from "../../lib/dressCodes";
import { fetchCategories } from "../../lib/definitions";
import { shouldDenyManagerEventAccess } from "../../lib/eventAccess";
import { useIsTablet } from "../../lib/responsive";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/LocaleContext";
import { AppText as Text } from "@/components/ui/AppText";
import {
  EventItem,
  eventImageCacheKey,
  fetchEventById,
  formatEventDate,
  htmlToPlainText,
} from "../../lib/events";
const SUMMARY_THUMB_SIZE = { phone: 112, tablet: 124 };

function getEventCategoryLabel(
  event: EventItem,
  categoryLabels: Record<string, string>,
): string {
  if (event.category && categoryLabels[event.category]) {
    return categoryLabels[event.category];
  }
  return event.categoryLabel?.trim() || event.category?.trim() || "";
}

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
        {
          width,
          height,
          borderRadius,
          backgroundColor: "#E5E7EB",
        },
        style,
      ]}
    />
  );
}

type SummaryInfoIcon = "hash" | "location" | "calendar";

function SummaryInfoRow({
  icon,
  label,
  isTablet,
  onPress,
  textStyle,
}: {
  icon: SummaryInfoIcon;
  label: string;
  isTablet: boolean;
  onPress?: () => void;
  textStyle?: object | object[] | false;
}) {
  if (!label) return null;

  const content = (
    <Text
      style={[
        styles.summaryInfoText,
        textStyle,
        isTablet && styles.summaryInfoTextTablet,
      ]}
      numberOfLines={2}
    >
      {label}
    </Text>
  );

  return (
    <View style={styles.summaryInfoRow}>
      <View style={styles.summaryIconSlot}>
        {icon === "hash" ? (
          <Text style={[styles.summaryHashIcon, isTablet && styles.summaryHashIconTablet]}>
            #
          </Text>
        ) : (
          <Ionicons
            name={icon === "calendar" ? "calendar" : "location"}
            size={isTablet ? 15 : 14}
            color={AppColors.cardText}
          />
        )}
      </View>
      {onPress ? (
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.7}
          style={styles.summaryInfoTextWrap}
        >
          {content}
        </TouchableOpacity>
      ) : (
        content
      )}
    </View>
  );
}

function RuleRow({
  icon,
  label,
  value,
  isTablet,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  isTablet: boolean;
}) {
  return (
    <View style={styles.ruleRow}>
      <View style={styles.ruleIconSlot}>
        <Ionicons
          name={icon}
          size={isTablet ? 24 : 22}
          color={AppColors.cardText}
        />
      </View>
      <View style={styles.ruleTextWrap}>
        <Text
          style={[styles.ruleLabel, isTablet && styles.ruleLabelTablet]}
        >
          {label}
        </Text>
        <Text
          style={[styles.ruleValue, isTablet && styles.ruleValueTablet]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function EventDetailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isVenueLayoutModalVisible, setIsVenueLayoutModalVisible] =
    useState(false);
  const [categoryLabels, setCategoryLabels] = useState<Record<string, string>>(
    {},
  );

  const loadEvent = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!id) return;
      const silent = options?.silent ?? false;
      if (!silent) setLoading(true);
      try {
        const data = await fetchEventById(id);
        setEvent(data);
        void prefetchEventImages([data]);
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
    void fetchCategories().then((categories) => {
      setCategoryLabels(
        Object.fromEntries(categories.map((c) => [c.value, c.label])),
      );
    });
  }, [locale]);

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
      const [, categories] = await Promise.all([
        loadEvent({ silent: true }),
        fetchCategories(true),
      ]);
      setCategoryLabels(
        Object.fromEntries(categories.map((c) => [c.value, c.label])),
      );
    } finally {
      setRefreshing(false);
    }
  }, [loadEvent]);

  const openPurchase = () => {
    if (!event?.id) return;
    router.push(`/events/buy/${event.id}` as import("expo-router").Href);
  };

  const cityText = formatCityLabel(event?.city);
  const categoryLabel = event
    ? getEventCategoryLabel(event, categoryLabels)
    : "";
  const dressRuleText = formatDressRuleText(event?.rules?.dress, locale);
  const ctaBtnHeight = 48;
  const ctaBarBottomPadding =
    insets.bottom + Math.max(insets.bottom, 16);
  const scrollBottomPadding = 10 + ctaBtnHeight + ctaBarBottomPadding + 24;

  const heroHeight = isTablet ? 330 : 245;
  const summaryThumbSize = isTablet
    ? SUMMARY_THUMB_SIZE.tablet
    : SUMMARY_THUMB_SIZE.phone;

  return (
    <SafeAreaView
      edges={["left", "right"]}
      className="flex-1"
      style={{ backgroundColor: AppColors.background }}
    >
      <StatusBar style="light" />
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: true,
          fullScreenGestureEnabled: false,
        }}
      />
      {!event && !loading ? (
        <View className="flex-1 items-center justify-center px-5">
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ position: "absolute", left: 12, top: insets.top + 2 }}
          >
            <Ionicons name="chevron-back" size={22} color={AppColors.cardText} />
          </TouchableOpacity>
          <Text className="text-app-navy text-center">
            {t("eventNotFound")}
          </Text>
        </View>
      ) : (
        <View className="flex-1">
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
            refreshControl={appRefreshControl(refreshing, onRefresh)}
          >
            <View>
              {loading ? (
                <SkeletonBlock height={heroHeight} borderRadius={0} />
              ) : event ? (
                <EventCardImage
                  imageUrl={event.imageUrl}
                  cacheKey={eventImageCacheKey(event)}
                  recyclingKey={`${event.id}-hero`}
                  priority="high"
                  className="w-full"
                  style={{ height: heroHeight }}
                />
              ) : (
                <View style={{ height: heroHeight, backgroundColor: "#D8DCE2" }} />
              )}
              <View className="absolute inset-0 bg-black/30" />
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.back()}
                className="absolute items-center justify-center"
                style={{ left: 12, top: insets.top + 2, width: 28, height: 28 }}
              >
                <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <View
                className="absolute inset-0 items-center justify-center px-5"
                style={{ paddingTop: insets.top + 28 }}
              >
                {loading ? (
                  <>
                    <SkeletonBlock
                      width={"85%"}
                      height={24}
                      style={styles.skeletonMb8}
                    />
                    <SkeletonBlock width={"60%"} height={24} />
                  </>
                ) : event ? (
                  <Text
                    className="text-white text-center"
                    style={[
                      styles.heroTitle,
                      isTablet && styles.heroTitleTablet,
                    ]}
                    numberOfLines={3}
                  >
                    {event.title}
                  </Text>
                ) : null}
              </View>
            </View>

            <View className="px-4 pt-4 gap-3">
              {loading ? (
                <>
                  <View style={[styles.summaryRow, isTablet && styles.summaryRowTablet]}>
                    <SkeletonBlock
                      width={summaryThumbSize}
                      height={summaryThumbSize}
                      borderRadius={isTablet ? 14 : 12}
                    />
                    <View
                      style={[
                        styles.summaryCard,
                        isTablet && styles.summaryCardTablet,
                        { minHeight: summaryThumbSize },
                      ]}
                    >
                      <SkeletonBlock width="45%" height={14} style={styles.skeletonMb8} />
                      <SkeletonBlock width="80%" height={14} style={styles.skeletonMb8} />
                      <SkeletonBlock width="50%" height={14} />
                    </View>
                  </View>
                  <View className="bg-white rounded-2xl p-4">
                    <SkeletonBlock width={"45%"} height={20} style={styles.skeletonMb12} />
                    <SkeletonBlock width={"100%"} height={14} style={styles.skeletonMb8} />
                    <SkeletonBlock width={"100%"} height={14} style={styles.skeletonMb8} />
                    <SkeletonBlock width={"88%"} height={14} />
                  </View>
                  <View className="bg-white rounded-2xl p-4">
                    <SkeletonBlock width={"50%"} height={20} style={styles.skeletonMb12} />
                    <SkeletonBlock width={"100%"} height={14} style={styles.skeletonMb8} />
                    <SkeletonBlock width={"100%"} height={14} style={styles.skeletonMb8} />
                    <SkeletonBlock width={"72%"} height={14} />
                  </View>
                </>
              ) : event ? (
                <>
              <View style={[styles.summaryRow, isTablet && styles.summaryRowTablet]}>
                <EventCardImage
                  imageUrl={event.imageUrl}
                  cacheKey={eventImageCacheKey(event)}
                  recyclingKey={`${event.id}-thumb`}
                  style={{
                    width: summaryThumbSize,
                    height: summaryThumbSize,
                    borderRadius: isTablet ? 14 : 12,
                    backgroundColor: "#E8ECF0",
                  }}
                />
                <View
                  style={[
                    styles.summaryCard,
                    isTablet && styles.summaryCardTablet,
                    { minHeight: summaryThumbSize },
                  ]}
                >
                  <View style={styles.summaryMeta}>
                    {!!categoryLabel && (
                      <SummaryInfoRow
                        icon="hash"
                        label={categoryLabel}
                        isTablet={isTablet}
                      />
                    )}
                    <SummaryInfoRow
                      icon="location"
                      label={event.venueName || "—"}
                      isTablet={isTablet}
                      onPress={
                        event.venueId
                          ? () =>
                              router.push(
                                `/venues/${event.venueId}` as import("expo-router").Href,
                              )
                          : undefined
                      }
                      textStyle={event.venueId ? styles.summaryInfoLink : undefined}
                    />
                    <SummaryInfoRow
                      icon="location"
                      label={cityText}
                      isTablet={isTablet}
                    />
                    <SummaryInfoRow
                      icon="calendar"
                      label={formatEventDate(event.startsAt)}
                      isTablet={isTablet}
                      textStyle={[
                        styles.summaryInfoDate,
                        isTablet && styles.summaryInfoDateTablet,
                      ]}
                    />
                  </View>
                </View>
              </View>

              <View className="bg-white rounded-2xl p-4">
                <Text
                  style={[
                    styles.sectionTitle,
                    isTablet && styles.sectionTitleTablet,
                  ]}
                >
                  {t("eventDetail")}
                </Text>
                <Text
                  style={[
                    styles.bodyText,
                    isTablet && styles.bodyTextTablet,
                  ]}
                >
                  {htmlToPlainText(event.description) ||
                    t("noEventDescription")}
                </Text>
              </View>

              {!!event.venueLayoutImageUrl && (
                <View className="bg-white rounded-2xl p-4">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-3">
                      <Text
                        style={[
                          styles.sectionTitle,
                          isTablet && styles.sectionTitleTablet,
                        ]}
                      >
                        {t("venueLayout")}
                      </Text>
                      <Text
                        style={[
                          styles.sectionSubtitle,
                          isTablet && styles.sectionSubtitleTablet,
                        ]}
                      >
                        {t("venueLayoutHint")}
                      </Text>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setIsVenueLayoutModalVisible(true)}
                      className="rounded-lg overflow-hidden bg-[#F3F4F6] self-center"
                      style={{
                        width: isTablet ? 132 : 92,
                        height: isTablet ? 78 : 56,
                      }}
                    >
                      <EventCardImage
                        imageUrl={event.venueLayoutImageUrl}
                        cacheKey={event.venueLayoutImageUrl}
                        recyclingKey={`${event.id}-layout-thumb`}
                        className="w-full h-full"
                        style={{ width: "100%", height: "100%" }}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View className="bg-white rounded-2xl p-4">
                <Text
                  style={[
                    styles.sectionTitle,
                    isTablet && styles.sectionTitleTablet,
                  ]}
                >
                  {t("thingsToKnow")}
                </Text>
                {!!event.rules?.age && (
                  <RuleRow
                    icon="ban"
                    label={t("ageRule")}
                    value={event.rules.age}
                    isTablet={isTablet}
                  />
                )}
                {event.rules?.couples !== null &&
                  event.rules?.couples !== undefined && (
                    <RuleRow
                      icon="people"
                      label={t("coupleRule")}
                      value={t("coupleRuleValue")}
                      isTablet={isTablet}
                    />
                  )}
                {!!dressRuleText && (
                  <RuleRow
                    icon="shirt"
                    label={t("dressRule")}
                    value={dressRuleText}
                    isTablet={isTablet}
                  />
                )}
                <Text
                  style={[
                    styles.detailsText,
                    isTablet && styles.detailsTextTablet,
                  ]}
                >
                  {htmlToPlainText(event.details) ||
                    t("noEventDetails")}
                </Text>
              </View>
                </>
              ) : null}
            </View>
          </ScrollView>
          <View style={[styles.ctaWrap, { paddingBottom: ctaBarBottomPadding }]}>
            {!user?.isSaleMode ? (
              loading ? (
                <SkeletonBlock width={"100%"} height={48} borderRadius={16} />
              ) : event ? (
            <TouchableOpacity
              activeOpacity={0.85}
              className="h-12 rounded-2xl items-center justify-center"
              style={{ backgroundColor: AppColors.navBg }}
              onPress={openPurchase}
            >
              <Text style={[styles.ctaText, isTablet && styles.ctaTextTablet]}>
                {t("buy")}
              </Text>
            </TouchableOpacity>
              ) : null
            ) : null}
          </View>
          {!!event?.venueLayoutImageUrl && (
            <Modal
              animationType="fade"
              transparent
              visible={isVenueLayoutModalVisible}
              onRequestClose={() => setIsVenueLayoutModalVisible(false)}
            >
              <Pressable
                style={styles.venueLayoutModalOverlay}
                onPress={() => setIsVenueLayoutModalVisible(false)}
              >
                <Pressable
                  style={styles.venueLayoutModalCard}
                  onPress={() => {}}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setIsVenueLayoutModalVisible(false)}
                    style={styles.venueLayoutModalCloseBtn}
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
                    style={styles.venueLayoutModalImage}
                  />
                </Pressable>
              </Pressable>
            </Modal>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heroTitle: {
    color: "#FFFFFF",
    fontFamily: "PoppinsSemiBold",
    fontSize: 18,
    lineHeight: 22,
    textTransform: "uppercase",
  },
  heroTitleTablet: {
    fontSize: 24,
    lineHeight: 30,
  },
  sectionTitle: {
    color: AppColors.cardText,
    fontFamily: "PoppinsBold",
    fontSize: 15,
    lineHeight: 20,
  },
  sectionTitleTablet: {
    fontSize: 17,
    lineHeight: 22,
  },
  sectionSubtitle: {
    color: AppColors.cardText,
    opacity: 0.7,
    fontFamily: "PoppinsRegular",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  sectionSubtitleTablet: {
    fontSize: 13,
    lineHeight: 18,
  },
  bodyText: {
    color: AppColors.cardText,
    fontFamily: "PoppinsRegular",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  bodyTextTablet: {
    fontSize: 14,
    lineHeight: 21,
  },
  detailsText: {
    color: AppColors.cardText,
    fontFamily: "PoppinsRegular",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 14,
  },
  detailsTextTablet: {
    fontSize: 14,
    lineHeight: 22,
  },
  ruleRow: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  ruleIconSlot: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  ruleTextWrap: {
    marginLeft: 10,
    flex: 1,
  },
  ruleLabel: {
    color: AppColors.cardText,
    opacity: 0.65,
    fontFamily: "PoppinsRegular",
    fontSize: 13,
    lineHeight: 16,
  },
  ruleLabelTablet: {
    fontSize: 14,
    lineHeight: 17,
  },
  ruleValue: {
    color: AppColors.cardText,
    fontFamily: "PoppinsBold",
    fontSize: 15,
    lineHeight: 21,
    marginTop: 2,
  },
  ruleValueTablet: {
    fontSize: 16,
    lineHeight: 22,
  },
  ctaText: {
    color: "#FFFFFF",
    fontFamily: "PoppinsBold",
    fontSize: 15,
  },
  ctaTextTablet: {
    fontSize: 16,
  },
  skeletonMb8: {
    marginBottom: 8,
  },
  skeletonMb12: {
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  summaryRowTablet: {
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: AppColors.cardBg,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  summaryCardTablet: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  summaryMeta: {
    minWidth: 0,
    gap: 5,
    justifyContent: "center",
  },
  summaryInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryIconSlot: {
    width: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryHashIcon: {
    color: AppColors.cardText,
    fontFamily: "PoppinsMedium",
    fontSize: 14,
    lineHeight: 17,
  },
  summaryHashIconTablet: {
    fontSize: 15,
    lineHeight: 18,
  },
  summaryInfoTextWrap: {
    flex: 1,
  },
  summaryInfoText: {
    flex: 1,
    color: AppColors.cardText,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "PoppinsRegular",
  },
  summaryInfoTextTablet: {
    fontSize: 14,
    lineHeight: 18,
  },
  summaryInfoLink: {
    textDecorationLine: "underline",
  },
  summaryInfoDate: {
    flex: 1,
    color: AppColors.cardText,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "PoppinsRegular",
  },
  summaryInfoDateTablet: {
    fontSize: 14,
    lineHeight: 18,
  },
  ctaWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  venueLayoutModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  venueLayoutModalCard: {
    width: "100%",
    maxHeight: "80%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingTop: 40,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  venueLayoutModalCloseBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  venueLayoutModalImage: {
    width: "100%",
    height: 360,
  },
});
