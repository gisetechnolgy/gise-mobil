import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LocaleContext';
import { AppColors } from '../../../constants/colors';
import { appRefreshControl } from '../../../lib/appRefreshControl';
import { fetchCategories } from '../../../lib/definitions';
import {
  buildSaleShareText,
  EventSaleItem,
  fetchEventSalesPage,
} from '../../../lib/eventSales';
import { useIsTablet } from '../../../lib/responsive';
import { AppText as Text } from '@/components/ui/AppText';

function SaleCardSkeleton({ isTablet }: { isTablet: boolean }) {
  return (
    <View style={[styles.card, isTablet && styles.cardTablet]}>
      <View style={[styles.skeletonLine, { width: '68%', height: 18 }]} />
      <View style={[styles.skeletonLine, { width: '88%', height: 14, marginTop: 10 }]} />
      <View style={[styles.skeletonLine, { width: '34%', height: 14, marginTop: 10 }]} />
    </View>
  );
}

function SaleCard({
  sale,
  isTablet,
  onPress,
}: {
  sale: EventSaleItem;
  isTablet: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, isTablet && styles.cardTablet]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={styles.cardTop}>
        <Text
          style={[styles.customerName, isTablet && styles.customerNameTablet]}
          numberOfLines={2}
        >
          {sale.customerName}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={19}
          color={AppColors.cardText}
          style={styles.chevron}
        />
      </View>
      <Text style={[styles.metaLine, isTablet && styles.metaLineTablet]}>
        {sale.listMetaLine}
      </Text>
      <Text
        style={[
          styles.statusText,
          { color: sale.statusColor },
          isTablet && styles.statusTextTablet,
        ]}
      >
        {sale.statusLabel}
      </Text>
    </TouchableOpacity>
  );
}

export default function AdminEventSalesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { user } = useAuth();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { height: windowHeight } = useWindowDimensions();

  const [items, setItems] = useState<EventSaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryLabels, setCategoryLabels] = useState<Record<string, string>>(
    {},
  );
  const [selectedSale, setSelectedSale] = useState<EventSaleItem | null>(null);
  const [sharing, setSharing] = useState(false);
  const sheetSlideAnim = useRef(new Animated.Value(0)).current;

  const isAdminMode = !!user?.isSaleMode;

  const loadInitial = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!eventId) return;
      const silent = options?.silent ?? false;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = await fetchEventSalesPage(eventId, 1);
        setItems(res.items);
        setPage(res.page);
        setHasMore(res.hasMore);
      } catch {
        setError(t('salesLoadError'));
        setItems([]);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [eventId],
  );

  const loadMore = useCallback(async () => {
    if (!eventId || loadingMore || loading || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetchEventSalesPage(eventId, nextPage);
      setItems((prev) => [...prev, ...res.items]);
      setPage(res.page);
      setHasMore(res.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }, [eventId, loadingMore, loading, hasMore, page]);

  useEffect(() => {
    if (!isAdminMode) {
      router.replace(eventId ? `/events/${eventId}` : '/(tabs)/events');
      return;
    }
    void loadInitial();
    void fetchCategories().then((cats) => {
      setCategoryLabels(
        Object.fromEntries(cats.map((c) => [c.value, c.label])),
      );
    });
  }, [loadInitial, isAdminMode, eventId, router]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadInitial({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadInitial]);

  const openSaleSheet = useCallback(
    (sale: EventSaleItem) => {
      sheetSlideAnim.setValue(windowHeight);
      setSelectedSale(sale);
    },
    [sheetSlideAnim, windowHeight],
  );

  const closeSaleSheet = useCallback(() => {
    setSelectedSale(null);
  }, []);

  useEffect(() => {
    if (!selectedSale) {
      sheetSlideAnim.setValue(windowHeight);
      return;
    }
    sheetSlideAnim.setValue(windowHeight);
    Animated.timing(sheetSlideAnim, {
      toValue: 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [selectedSale, sheetSlideAnim, windowHeight]);

  const onShareSale = useCallback(async () => {
    if (!selectedSale || sharing) return;
    setSharing(true);
    try {
      const message = await buildSaleShareText(selectedSale);
      await Share.share({ message });
    } catch {
      // kullanıcı paylaşımı iptal edebilir
    } finally {
      setSharing(false);
    }
  }, [selectedSale, sharing]);

  const refreshCtrl = appRefreshControl(refreshing, onRefresh);

  if (!isAdminMode) return null;

  const selectedCategoryLabel = selectedSale?.eventCategory
    ? categoryLabels[selectedSale.eventCategory] ?? selectedSale.eventCategory
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, isTablet && styles.headerTablet]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons
            name="chevron-back"
            size={isTablet ? 26 : 22}
            color={AppColors.cardText}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isTablet && styles.headerTitleTablet]}>
          {t('salesDetails')}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {error && !loading && items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={
            loading
              ? Array.from({ length: 6 }).map((_, i) => ({
                  id: `skeleton-${i}`,
                }))
              : items
          }
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            isTablet && styles.listContentTablet,
            !loading && items.length === 0 && styles.listContentEmpty,
            { paddingBottom: insets.bottom + 24 },
          ]}
          refreshControl={refreshCtrl}
          onEndReachedThreshold={0.45}
          onEndReached={() => {
            if (!loading) void loadMore();
          }}
          renderItem={({ item }) =>
            loading ? (
              <SaleCardSkeleton isTablet={isTablet} />
            ) : (
              <SaleCard
                sale={item as EventSaleItem}
                isTablet={isTablet}
                onPress={() => openSaleSheet(item as EventSaleItem)}
              />
            )
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.center}>
                <Text style={styles.emptyText}>Bu etkinlik için satış bulunamadı.</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <SaleCardSkeleton isTablet={isTablet} />
              </View>
            ) : null
          }
        />
      )}

      <Modal
        animationType="fade"
        transparent
        visible={!!selectedSale}
        onRequestClose={closeSaleSheet}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalOverlay} onPress={closeSaleSheet} />
          <Animated.View
            style={[
              styles.sheet,
              isTablet && styles.sheetTablet,
              { transform: [{ translateY: sheetSlideAnim }] },
            ]}
          >
            {selectedSale ? (
              <>
                <Text style={[styles.sheetTitle, isTablet && styles.sheetTitleTablet]}>
                  Sale Details
                </Text>
                <Text
                  style={[styles.sheetEventName, isTablet && styles.sheetEventNameTablet]}
                  numberOfLines={3}
                >
                  {selectedSale.eventName}
                </Text>
                {selectedCategoryLabel ? (
                  <Text
                    style={[
                      styles.sheetCategory,
                      isTablet && styles.sheetCategoryTablet,
                    ]}
                  >
                    {selectedCategoryLabel}
                  </Text>
                ) : null}

                <Text
                  style={[
                    styles.sheetSectionLabel,
                    isTablet && styles.sheetSectionLabelTablet,
                  ]}
                >
                  Bilet
                </Text>

                {selectedSale.productLines.length === 0 ? (
                  <Text style={styles.sheetProductLine}>Bilet bilgisi yok</Text>
                ) : (
                  selectedSale.productLines.map((line, index) => (
                    <View
                      key={`${selectedSale.id}-product-${index}`}
                      style={styles.sheetProductRow}
                    >
                      <Text
                        style={[
                          styles.sheetProductLine,
                          isTablet && styles.sheetProductLineTablet,
                        ]}
                        numberOfLines={3}
                      >
                        {line.title}
                      </Text>
                      <Text
                        style={[
                          styles.sheetProductCount,
                          isTablet && styles.sheetProductCountTablet,
                        ]}
                      >
                        {line.count} adet
                      </Text>
                    </View>
                  ))
                )}

                <TouchableOpacity
                  activeOpacity={0.88}
                  style={[styles.shareBtn, isTablet && styles.shareBtnTablet]}
                  onPress={() => void onShareSale()}
                  disabled={sharing}
                >
                  {sharing ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text
                      style={[
                        styles.shareBtnText,
                        isTablet && styles.shareBtnTextTablet,
                      ]}
                    >
                      Biletleri Paylaş
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            ) : null}
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  headerTablet: {
    minHeight: 56,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  backBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#000000',
    fontSize: 18,
    fontFamily: 'PoppinsSemiBold',
  },
  headerTitleTablet: {
    fontSize: 24,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    gap: 12,
  },
  listContentTablet: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 16,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 12,
    padding: 14,
  },
  cardTablet: {
    borderRadius: 16,
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  customerName: {
    flex: 1,
    color: AppColors.cardText,
    fontSize: 16,
    fontFamily: 'PoppinsSemiBold',
    lineHeight: 21,
    paddingRight: 10,
  },
  customerNameTablet: {
    fontSize: 18,
    lineHeight: 24,
  },
  chevron: {
    marginTop: 1,
  },
  metaLine: {
    marginTop: 8,
    color: 'rgba(52,61,72,0.75)',
    fontSize: 14,
    fontFamily: 'PoppinsRegular',
    lineHeight: 20,
  },
  metaLineTablet: {
    fontSize: 15,
    lineHeight: 22,
  },
  statusText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'PoppinsMedium',
  },
  statusTextTablet: {
    fontSize: 15,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  emptyText: {
    color: 'rgba(52,61,72,0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: 8,
  },
  skeletonLine: {
    borderRadius: 6,
    backgroundColor: '#E8ECF0',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 28,
    zIndex: 1,
  },
  sheetTablet: {
    paddingHorizontal: 28,
    paddingBottom: 34,
  },
  sheetTitle: {
    color: AppColors.cardText,
    fontSize: 28,
    fontFamily: 'PoppinsSemiBold',
    marginBottom: 16,
  },
  sheetTitleTablet: {
    fontSize: 32,
  },
  sheetEventName: {
    color: AppColors.cardText,
    fontSize: 22,
    fontFamily: 'PoppinsSemiBold',
    lineHeight: 28,
  },
  sheetEventNameTablet: {
    fontSize: 26,
    lineHeight: 32,
  },
  sheetCategory: {
    marginTop: 4,
    color: AppColors.accent,
    fontSize: 16,
    fontFamily: 'PoppinsMedium',
  },
  sheetCategoryTablet: {
    fontSize: 17,
  },
  sheetSectionLabel: {
    marginTop: 22,
    marginBottom: 10,
    color: AppColors.cardText,
    fontSize: 18,
    fontFamily: 'PoppinsSemiBold',
  },
  sheetSectionLabelTablet: {
    fontSize: 20,
  },
  sheetProductRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  sheetProductLine: {
    flex: 1,
    color: AppColors.cardText,
    fontSize: 15,
    fontFamily: 'PoppinsRegular',
    lineHeight: 21,
    textTransform: 'uppercase',
  },
  sheetProductLineTablet: {
    fontSize: 16,
    lineHeight: 22,
  },
  sheetProductCount: {
    color: AppColors.cardText,
    fontSize: 15,
    fontFamily: 'PoppinsRegular',
  },
  sheetProductCountTablet: {
    fontSize: 16,
  },
  shareBtn: {
    marginTop: 24,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: AppColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnTablet: {
    minHeight: 56,
    borderRadius: 16,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'PoppinsSemiBold',
  },
  shareBtnTextTablet: {
    fontSize: 17,
  },
});
