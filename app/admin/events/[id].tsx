import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { EventCardImage } from '../../components/_EventCardImage';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/_LocaleContext';
import { AppColors } from '../../../constants/colors';
import { appRefreshControl } from '../../../lib/appRefreshControl';
import { formatCityLabel } from '../../../lib/cities';
import { fetchCategories } from '../../../lib/definitions';
import { shouldDenyManagerEventAccess } from '../../../lib/eventAccess';
import {
  EventAdminRecord,
  EventStatsRecord,
  fetchEventAdminById,
  fetchEventStats,
  fetchUsedTicketsCount,
  formatEventRevenue,
  updateEventAdminFlags,
} from '../../../lib/eventAdmin';
import {
  eventImageCacheKey,
  formatEventDate,
  type EventItem,
} from '../../../lib/events';
import { useIsTablet } from '../../../lib/responsive';
import { isAdminRole } from '../../../lib/roles';
import { AppText as Text } from '@/components/ui/AppText';

const SUMMARY_THUMB_SIZE = { phone: 112, tablet: 124 };

function getEventCategoryLabel(
  event: EventItem,
  categoryLabels: Record<string, string>,
): string {
  if (event.category && categoryLabels[event.category]) {
    return categoryLabels[event.category];
  }
  return event.categoryLabel?.trim() || event.category?.trim() || '';
}

type SummaryInfoIcon = 'hash' | 'location' | 'calendar';

function SummaryInfoRow({
  icon,
  label,
  isTablet,
  textStyle,
}: {
  icon: SummaryInfoIcon;
  label: string;
  isTablet: boolean;
  textStyle?: object | object[] | false;
}) {
  if (!label) return null;

  return (
    <View style={styles.summaryInfoRow}>
      <View style={styles.summaryIconSlot}>
        {icon === 'hash' ? (
          <Text style={[styles.summaryHashIcon, isTablet && styles.summaryHashIconTablet]}>
            #
          </Text>
        ) : (
          <Ionicons
            name={icon === 'calendar' ? 'calendar' : 'location'}
            size={isTablet ? 15 : 14}
            color={AppColors.cardText}
          />
        )}
      </View>
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
    </View>
  );
}

function SkeletonBlock({
  width = '100%',
  height,
  borderRadius = 12,
  style,
}: {
  width?: number | `${number}%` | '100%';
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
          backgroundColor: '#E5E7EB',
        },
        style,
      ]}
    />
  );
}

function StatCard({
  label,
  value,
  loading,
  isTablet,
}: {
  label: string;
  value: string;
  loading?: boolean;
  isTablet: boolean;
}) {
  return (
    <View style={[styles.statCard, isTablet && styles.statCardTablet]}>
      {loading ? (
        <SkeletonBlock width="60%" height={22} borderRadius={8} />
      ) : (
        <Text style={[styles.statValue, isTablet && styles.statValueTablet]}>
          {value}
        </Text>
      )}
      <Text style={[styles.statLabel, isTablet && styles.statLabelTablet]}>
        {label}
      </Text>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  disabled,
  isTablet,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  isTablet: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuRow, isTablet && styles.menuRowTablet]}
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={icon} size={isTablet ? 24 : 22} color={AppColors.cardText} />
      <Text style={[styles.menuRowText, isTablet && styles.menuRowTextTablet]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function AdminToggleRow({
  label,
  value,
  loading,
  disabled,
  onValueChange,
}: {
  label: string;
  value: boolean;
  loading?: boolean;
  disabled?: boolean;
  onValueChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={styles.toggleSwitchCol}>
        {loading ? (
          <SkeletonBlock width={51} height={31} borderRadius={16} />
        ) : (
          <Switch
            value={value}
            onValueChange={onValueChange}
            disabled={disabled}
            trackColor={{
              false: 'rgba(52,61,72,0.2)',
              true: AppColors.accent,
            }}
            thumbColor="#fff"
            ios_backgroundColor="rgba(52,61,72,0.2)"
          />
        )}
      </View>
    </View>
  );
}

function EventInfoCard({
  event,
  loading,
  isTablet,
  categoryLabel,
}: {
  event: EventAdminRecord | null;
  loading: boolean;
  isTablet: boolean;
  categoryLabel: string;
}) {
  const summaryThumbSize = isTablet
    ? SUMMARY_THUMB_SIZE.tablet
    : SUMMARY_THUMB_SIZE.phone;

  if (loading || !event) {
    return (
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
    );
  }

  const cityText = formatCityLabel(event.city);

  return (
    <View style={[styles.summaryRow, isTablet && styles.summaryRowTablet]}>
      <EventCardImage
        imageUrl={event.imageUrl}
        cacheKey={eventImageCacheKey(event)}
        recyclingKey={`${event.id}-admin-thumb`}
        style={{
          width: summaryThumbSize,
          height: summaryThumbSize,
          borderRadius: isTablet ? 14 : 12,
          backgroundColor: '#E8ECF0',
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
            label={event.venueName || '—'}
            isTablet={isTablet}
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
  );
}

export default function AdminEventDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { user } = useAuth();
  const { locale, t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<EventAdminRecord | null>(null);
  const [stats, setStats] = useState<EventStatsRecord | null>(null);
  const [usedTickets, setUsedTickets] = useState(0);
  const [eventLoading, setEventLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggleBusy, setToggleBusy] = useState<'active' | 'verified' | null>(null);
  const [categoryLabels, setCategoryLabels] = useState<Record<string, string>>({});

  const canEditFlags = isAdminRole(user?.crole);
  const isAdminMode = !!user?.isSaleMode;

  const loadEvent = useCallback(async () => {
    if (!id) return;
    setEventLoading(true);
    try {
      const eventData = await fetchEventAdminById(id);
      setEvent(eventData);
    } catch {
      setEvent(null);
    } finally {
      setEventLoading(false);
    }
  }, [id]);

  const loadStats = useCallback(async () => {
    if (!id) return;
    setStatsLoading(true);
    try {
      const [statsData, usedCount] = await Promise.all([
        fetchEventStats(id),
        fetchUsedTicketsCount(id).catch(() => 0),
      ]);
      setStats(statsData);
      setUsedTickets(usedCount);
    } catch {
      setStats(null);
      setUsedTickets(0);
    } finally {
      setStatsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!isAdminMode) {
      router.replace(id ? `/events/${id}` : '/(tabs)/events');
      return;
    }
    void loadEvent();
    void loadStats();
  }, [loadEvent, loadStats, isAdminMode, id, router]);

  useEffect(() => {
    if (!event || !user) return;
    if (
      shouldDenyManagerEventAccess(user, {
        venueId: event.venueId,
        organisationCompanyIds: event.organisationCompanyIds,
      })
    ) {
      router.replace('/(admin-tabs)/events');
    }
  }, [event, user, router]);

  useEffect(() => {
    void fetchCategories().then((categories) => {
      setCategoryLabels(
        Object.fromEntries(categories.map((c) => [c.value, c.label])),
      );
    });
  }, [locale]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [, , categories] = await Promise.all([
        loadEvent(),
        loadStats(),
        fetchCategories(true),
      ]);
      setCategoryLabels(
        Object.fromEntries(categories.map((c) => [c.value, c.label])),
      );
    } finally {
      setRefreshing(false);
    }
  }, [loadEvent, loadStats]);

  const onToggleFlag = useCallback(
    async (field: 'isActive' | 'isVerified', next: boolean) => {
      if (!event || !canEditFlags || toggleBusy) return;

      const previous = event;
      setEvent({ ...event, [field]: next });
      setToggleBusy(field);

      try {
        const updated = await updateEventAdminFlags(event.id, { [field]: next });
        setEvent(updated);
      } catch {
        setEvent(previous);
        Alert.alert(t('updateFailed'), t('updateFailedMessage'));
      } finally {
        setToggleBusy(null);
      }
    },
    [event, canEditFlags, toggleBusy, t],
  );

  const scrollBottom = insets.bottom + 120;
  const heroHeight = isTablet ? 330 : 245;
  const showNotFound = !eventLoading && !event;
  const categoryLabel = event
    ? getEventCategoryLabel(event, categoryLabels)
    : '';

  if (!isAdminMode) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scrollBottom }}
        refreshControl={appRefreshControl(refreshing, onRefresh)}
      >
        <View>
          {eventLoading ? (
            <SkeletonBlock height={heroHeight} borderRadius={0} />
          ) : event ? (
            <EventCardImage
              imageUrl={event.imageUrl}
              cacheKey={eventImageCacheKey(event)}
              recyclingKey={`${event.id}-admin-hero`}
              priority="high"
              style={{ width: '100%', height: heroHeight }}
            />
          ) : (
            <View style={[styles.heroFallback, { height: heroHeight }]} />
          )}
          <View style={styles.heroOverlay} />
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { top: insets.top + 2 }]}
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={[styles.heroTitleWrap, { paddingTop: insets.top + 28 }]}>
            {eventLoading ? (
              <>
                <SkeletonBlock width="85%" height={22} style={styles.skeletonMb8} />
                <SkeletonBlock width="60%" height={22} />
              </>
            ) : event ? (
              <Text
                style={[styles.heroTitle, isTablet && styles.heroTitleTablet]}
                numberOfLines={3}
              >
                {event.title}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={[styles.body, isTablet && styles.bodyTablet]}>
          {showNotFound ? (
            <View style={styles.notFoundWrap}>
              <Text style={styles.errorText}>{t('adminEventNotFound')}</Text>
            </View>
          ) : (
            <>
              <EventInfoCard
                event={event}
                loading={eventLoading}
                isTablet={isTablet}
                categoryLabel={categoryLabel}
              />

              <View style={[styles.card, isTablet && styles.cardTablet]}>
                <AdminToggleRow
                  label={t('showOnWebMobile')}
                  value={event?.isActive ?? false}
                  loading={eventLoading}
                  disabled={!canEditFlags || toggleBusy === 'active' || !event}
                  onValueChange={(v) => void onToggleFlag('isActive', v)}
                />
                <View style={styles.toggleDivider} />
                <AdminToggleRow
                  label={t('adminApproval')}
                  value={event?.isVerified ?? false}
                  loading={eventLoading}
                  disabled={!canEditFlags || toggleBusy === 'verified' || !event}
                  onValueChange={(v) => void onToggleFlag('isVerified', v)}
                />
              </View>

              <View style={styles.statsRow}>
                <StatCard
                  label={t('soldProducts')}
                  value={String(stats?.totalSales ?? 0)}
                  loading={statsLoading}
                  isTablet={isTablet}
                />
                <StatCard
                  label={t('usedTickets')}
                  value={String(usedTickets)}
                  loading={statsLoading}
                  isTablet={isTablet}
                />
                <StatCard
                  label={t('totalRevenue')}
                  value={formatEventRevenue(stats?.totalRevenue ?? 0)}
                  loading={statsLoading}
                  isTablet={isTablet}
                />
              </View>
            </>
          )}

          <View style={styles.menuList}>
            <MenuRow
              icon="information-circle-outline"
              label={t('eventDetailsMenu')}
              isTablet={isTablet}
              disabled={!id}
              onPress={() => id && router.push(`/events/${id}`)}
            />
            <MenuRow
              icon="create-outline"
              label={t('stockViewEdit')}
              isTablet={isTablet}
              disabled={!id}
              onPress={() =>
                id &&
                router.push({
                  pathname: '/admin/events/stock-edit',
                  params: { eventId: id },
                })
              }
            />
            <MenuRow
              icon="bar-chart-outline"
              label={t('stockStats')}
              isTablet={isTablet}
              disabled={!id}
              onPress={() =>
                id &&
                router.push({
                  pathname: '/admin/events/stock-stats',
                  params: { eventId: id },
                })
              }
            />
            <MenuRow
              icon="receipt-outline"
              label={t('viewSales')}
              isTablet={isTablet}
              disabled={!id}
              onPress={() =>
                id &&
                router.push({
                  pathname: '/admin/events/sales',
                  params: { eventId: id },
                })
              }
            />
            <MenuRow
              icon="ticket-outline"
              label={t('viewTickets')}
              isTablet={isTablet}
              disabled={!id}
              onPress={() =>
                id &&
                router.push({
                  pathname: '/admin/events/tickets',
                  params: { eventId: id },
                })
              }
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  notFoundWrap: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  errorText: {
    color: AppColors.cardText,
    textAlign: 'center',
  },
  skeletonMb8: {
    marginBottom: 8,
  },
  heroFallback: {
    backgroundColor: '#D8DCE2',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  backBtn: {
    position: 'absolute',
    left: 12,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 18,
    lineHeight: 22,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  heroTitleTablet: {
    fontSize: 24,
    lineHeight: 30,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  bodyTablet: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    justifyContent: 'center',
  },
  summaryCardTablet: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  summaryMeta: {
    minWidth: 0,
    gap: 5,
    justifyContent: 'center',
  },
  summaryInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryIconSlot: {
    width: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryHashIcon: {
    color: AppColors.cardText,
    fontFamily: 'PoppinsMedium',
    fontSize: 14,
    lineHeight: 17,
  },
  summaryHashIconTablet: {
    fontSize: 15,
    lineHeight: 18,
  },
  summaryInfoText: {
    flex: 1,
    color: AppColors.cardText,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'PoppinsRegular',
  },
  summaryInfoTextTablet: {
    fontSize: 14,
    lineHeight: 18,
  },
  summaryInfoDate: {
    flex: 1,
    color: AppColors.cardText,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'PoppinsRegular',
  },
  summaryInfoDateTablet: {
    fontSize: 14,
    lineHeight: 18,
  },
  card: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  cardTablet: {
    borderRadius: 16,
    paddingHorizontal: 18,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
  },
  toggleLabel: {
    flex: 1,
    color: AppColors.cardText,
    fontFamily: 'PoppinsRegular',
    fontSize: 16,
    paddingRight: 12,
  },
  toggleSwitchCol: {
    width: 51,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  toggleDivider: {
    height: 1,
    backgroundColor: 'rgba(52,61,72,0.1)',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: AppColors.cardBg,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 88,
  },
  statCardTablet: {
    borderRadius: 16,
    minHeight: 100,
    paddingHorizontal: 12,
  },
  statLabel: {
    color: 'rgba(52,61,72,0.65)',
    fontSize: 11,
    fontFamily: 'PoppinsMedium',
    textAlign: 'center',
    marginTop: 6,
  },
  statLabelTablet: {
    fontSize: 12,
  },
  statValue: {
    color: AppColors.cardText,
    fontSize: 20,
    fontFamily: 'PoppinsBold',
    textAlign: 'center',
  },
  statValueTablet: {
    fontSize: 24,
  },
  menuList: {
    gap: 10,
    marginTop: 4,
  },
  menuRow: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuRowTablet: {
    borderRadius: 16,
    paddingVertical: 18,
  },
  menuRowText: {
    flex: 1,
    color: AppColors.cardText,
    fontFamily: 'PoppinsRegular',
    fontSize: 16,
  },
  menuRowTextTablet: {
    fontSize: 18,
  },
});
