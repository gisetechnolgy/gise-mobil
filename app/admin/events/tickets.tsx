import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/_LocaleContext';
import { AppColors } from '../../../constants/colors';
import { appRefreshControl } from '../../../lib/appRefreshControl';
import { fetchEventTicketsPage } from '../../../lib/eventAdmin';
import {
  formatTicketDate,
  type TicketItem,
} from '../../../lib/tickets';
import { useIsTablet } from '../../../lib/responsive';
import { AppText as Text } from '@/components/ui/AppText';

const PAGE_SIZE = 20;

function TicketCard({
  ticket,
  isTablet,
}: {
  ticket: TicketItem;
  isTablet: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={[styles.card, isTablet && styles.cardTablet]}>
      <View style={styles.cardTop}>
        <Text
          style={[styles.holder, isTablet && styles.holderTablet]}
          numberOfLines={1}
        >
          {ticket.holderName}
        </Text>
        <Text
          style={[
            styles.usedBadge,
            ticket.isUsed ? styles.usedBadgeOn : styles.usedBadgeOff,
          ]}
        >
          {ticket.isUsed ? t('ticketUsed') : t('ticketUnused')}
        </Text>
      </View>
      <Text style={[styles.meta, isTablet && styles.metaTablet]} numberOfLines={1}>
        {ticket.ticketLabel}
      </Text>
      <Text style={[styles.meta, isTablet && styles.metaTablet]}>
        PNR: {ticket.ticketNo || '—'}
      </Text>
      <Text style={[styles.meta, isTablet && styles.metaTablet]}>
        {formatTicketDate(ticket.createdAt)}
      </Text>
    </View>
  );
}

export default function AdminEventTicketsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { user } = useAuth();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();

  const [items, setItems] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdminMode = !!user?.isSaleMode;

  const loadInitial = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!eventId) return;
      const silent = options?.silent ?? false;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = await fetchEventTicketsPage({
          eventId,
          page: 1,
          perPage: PAGE_SIZE,
        });
        setItems(res.items);
        setPage(res.page);
        setHasMore(res.hasMore);
      } catch {
        setError(t('ticketsLoadError'));
        setItems([]);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [eventId, t],
  );

  const loadMore = useCallback(async () => {
    if (!eventId || loadingMore || loading || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetchEventTicketsPage({
        eventId,
        page: nextPage,
        perPage: PAGE_SIZE,
      });
      setItems((prev) => [...prev, ...res.items]);
      setPage(res.page);
      setHasMore(res.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }, [eventId, hasMore, loading, loadingMore, page]);

  useEffect(() => {
    if (!isAdminMode) {
      router.replace(eventId ? `/events/${eventId}` : '/(tabs)/events');
      return;
    }
    void loadInitial();
  }, [eventId, isAdminMode, loadInitial, router]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadInitial({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadInitial]);

  const refreshCtrl = appRefreshControl(refreshing, onRefresh);

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 2 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={AppColors.cardText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('viewTickets')}</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={AppColors.accent} />
        </View>
      ) : error ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            items.length === 0 && styles.emptyWrap,
          ]}
          refreshControl={refreshCtrl}
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.35}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>{t('noEventTickets')}</Text>
              <Text style={styles.emptySubtitle}>{t('noEventTicketsHint')}</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                style={{ marginVertical: 16 }}
                color={AppColors.accent}
              />
            ) : null
          }
          renderItem={({ item }) => (
            <TicketCard ticket={item} isTablet={isTablet} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 17,
    color: AppColors.heading,
  },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 10, paddingBottom: 40 },
  emptyWrap: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  emptyCard: { alignItems: 'center', gap: 8 },
  emptyTitle: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 16,
    color: AppColors.heading,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorText: {
    fontFamily: 'PoppinsRegular',
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
  card: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  cardTablet: { padding: 16, borderRadius: 16 },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  holder: {
    flex: 1,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 15,
    color: AppColors.heading,
  },
  holderTablet: { fontSize: 16 },
  usedBadge: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  usedBadgeOn: {
    color: '#166534',
    backgroundColor: '#DCFCE7',
  },
  usedBadgeOff: {
    color: '#92400E',
    backgroundColor: '#FEF3C7',
  },
  meta: {
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    color: '#6B7280',
  },
  metaTablet: { fontSize: 14 },
});
