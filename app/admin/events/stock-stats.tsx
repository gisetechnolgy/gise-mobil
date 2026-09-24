import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/_LocaleContext';
import { AppColors } from '../../../constants/colors';
import { appRefreshControl } from '../../../lib/appRefreshControl';
import {
  fetchEventStockStats,
  type StockProductStat,
} from '../../../lib/stockStats';
import { useIsTablet } from '../../../lib/responsive';
import { AppText as Text } from '@/components/ui/AppText';

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

function StatLine({
  label,
  value,
  isTablet,
}: {
  label: string;
  value: string;
  isTablet: boolean;
}) {
  return (
    <View style={styles.statLine}>
      <Text style={[styles.statLineLabel, isTablet && styles.statLineLabelTablet]}>
        {label}
      </Text>
      <Text style={[styles.statLineValue, isTablet && styles.statLineValueTablet]}>
        {value}
      </Text>
    </View>
  );
}

function ProductCard({
  product,
  isTablet,
}: {
  product: StockProductStat;
  isTablet: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={[styles.productCard, isTablet && styles.productCardTablet]}>
      <View style={styles.productHeader}>
        <Text
          style={[styles.productTitle, isTablet && styles.productTitleTablet]}
          numberOfLines={3}
        >
          {product.title}
        </Text>
        <Text
          style={[
            styles.productStatus,
            !product.isOnSale && styles.productStatusOff,
            isTablet && styles.productStatusTablet,
          ]}
        >
          {product.isOnSale ? t('stockOnSale') : t('stockClosed')}
        </Text>
      </View>
      <View style={[styles.productStatsBox, isTablet && styles.productStatsBoxTablet]}>
        <StatLine
          label="T. Stok"
          value={`${product.totalStock} ad.`}
          isTablet={isTablet}
        />
        <StatLine
          label="Kalan"
          value={`${product.remaining} ad.`}
          isTablet={isTablet}
        />
        <StatLine
          label={t('stockUsedSold')}
          value={`${product.used} / ${product.sold} ad.`}
          isTablet={isTablet}
        />
      </View>
    </View>
  );
}

function ProductCardSkeleton({ isTablet }: { isTablet: boolean }) {
  return (
    <View style={[styles.productCard, isTablet && styles.productCardTablet]}>
      <View style={styles.productHeader}>
        <SkeletonBlock width="72%" height={16} style={{ marginBottom: 4 }} />
        <SkeletonBlock width={56} height={14} />
      </View>
      <View style={[styles.productStatsBox, isTablet && styles.productStatsBoxTablet]}>
        <SkeletonBlock width="100%" height={14} style={{ marginBottom: 10 }} />
        <SkeletonBlock width="100%" height={14} style={{ marginBottom: 10 }} />
        <SkeletonBlock width="100%" height={14} />
      </View>
    </View>
  );
}

export default function AdminEventStockStatsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { user } = useAuth();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const [products, setProducts] = useState<StockProductStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdminMode = !!user?.isSaleMode;

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!eventId) return;
      const silent = options?.silent ?? false;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const rows = await fetchEventStockStats(eventId);
        setProducts(rows);
      } catch {
        setError(t('stockStatsLoadError'));
        setProducts([]);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [eventId, t],
  );

  useEffect(() => {
    if (!isAdminMode) {
      router.replace(eventId ? `/events/${eventId}` : '/(tabs)/events');
      return;
    }
    void load();
  }, [load, isAdminMode, eventId, router]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  if (!isAdminMode) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
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
          Stok İstatistikleri
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          isTablet && styles.contentTablet,
          { paddingBottom: insets.bottom + 24 },
        ]}
        refreshControl={appRefreshControl(refreshing, onRefresh)}
      >
        <Text style={[styles.sectionLabel, isTablet && styles.sectionLabelTablet]}>
          Bilet
        </Text>

        {loading ? (
          <View style={styles.list}>
            {Array.from({ length: 4 }).map((_, idx) => (
              <ProductCardSkeleton key={`stock-skel-${idx}`} isTablet={isTablet} />
            ))}
          </View>
        ) : error ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : products.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>Bu etkinlik için stok kaydı bulunamadı.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isTablet={isTablet}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: AppColors.background,
  },
  headerTablet: {
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: AppColors.cardText,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 18,
  },
  headerTitleTablet: {
    fontSize: 20,
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  contentTablet: {
    paddingHorizontal: 20,
  },
  sectionLabel: {
    color: AppColors.cardText,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 15,
    marginBottom: 12,
  },
  sectionLabelTablet: {
    fontSize: 16,
    marginBottom: 14,
  },
  list: {
    gap: 12,
  },
  productCard: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 14,
    padding: 14,
  },
  productCardTablet: {
    borderRadius: 16,
    padding: 16,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  productTitle: {
    flex: 1,
    color: AppColors.cardText,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
    lineHeight: 20,
    textTransform: 'uppercase',
  },
  productTitleTablet: {
    fontSize: 15,
    lineHeight: 22,
  },
  productStatus: {
    color: '#16A34A',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  productStatusOff: {
    color: 'rgba(52,61,72,0.55)',
  },
  productStatusTablet: {
    fontSize: 14,
  },
  productStatsBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  productStatsBoxTablet: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  statLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statLineLabel: {
    color: 'rgba(52,61,72,0.75)',
    fontFamily: 'PoppinsMedium',
    fontSize: 14,
  },
  statLineLabelTablet: {
    fontSize: 15,
  },
  statLineValue: {
    color: AppColors.cardText,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
    textAlign: 'right',
  },
  statLineValueTablet: {
    fontSize: 15,
  },
  emptyWrap: {
    paddingVertical: 32,
    alignItems: 'center',
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
});
