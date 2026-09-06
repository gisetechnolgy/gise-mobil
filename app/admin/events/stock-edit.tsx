import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
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
import { useTranslation } from '../../context/LocaleContext';
import { AppColors } from '../../../constants/colors';
import { appRefreshControl } from '../../../lib/appRefreshControl';
import {
  fetchEventStockEdit,
  getProductStatusDisplay,
  type StockEditProduct,
  type StockEditSection,
  type StockProductStatus,
  updateStockProduct,
} from '../../../lib/stockEdit';
import { useIsTablet } from '../../../lib/responsive';
import { AppText as Text } from '@/components/ui/AppText';
import type { TranslationKey } from '../../../lib/i18n';

function statusOptions(t: (key: TranslationKey) => string): Array<{ value: StockProductStatus; label: string }> {
  return [
    { value: 0, label: t('stockOnSale') },
    { value: 1, label: t('stockSoldOut') },
    { value: 2, label: t('stockHidden') },
  ];
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
        { width, height, borderRadius, backgroundColor: '#E5E7EB' },
        style,
      ]}
    />
  );
}

function StatCell({
  label,
  value,
  valueColor,
  isTablet,
}: {
  label: string;
  value: string;
  valueColor?: string;
  isTablet: boolean;
}) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statCellLabel, isTablet && styles.statCellLabelTablet]}>
        {label}
      </Text>
      <Text
        style={[
          styles.statCellValue,
          isTablet && styles.statCellValueTablet,
          valueColor ? { color: valueColor } : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function ProductEditPanel({
  product,
  isTablet,
  saving,
  onClose,
  onSave,
}: {
  product: StockEditProduct;
  isTablet: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (stock: number, status: StockProductStatus) => void;
}) {
  const { t } = useTranslation();
  const [stockValue, setStockValue] = useState(String(product.totalStock));
  const [status, setStatus] = useState<StockProductStatus>(product.status);

  const parsedStock = Number(stockValue);
  const canSave =
    !saving &&
    Number.isFinite(parsedStock) &&
    parsedStock >= product.sold &&
    parsedStock >= 0;

  return (
    <View style={[styles.editPanel, isTablet && styles.editPanelTablet]}>
      <View style={styles.editPanelHeader}>
        <Text style={[styles.editPanelTitle, isTablet && styles.editPanelTitleTablet]}>
          Ürün Güncelle
        </Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={22} color={AppColors.cardText} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.editFieldLabel, isTablet && styles.editFieldLabelTablet]}>
        Yeni Toplam Stok
      </Text>
      <TextInput
        value={stockValue}
        onChangeText={setStockValue}
        keyboardType="number-pad"
        style={[styles.editInput, isTablet && styles.editInputTablet]}
        placeholder="0"
        placeholderTextColor="rgba(52,61,72,0.4)"
      />

      <Text
        style={[
          styles.editFieldLabel,
          isTablet && styles.editFieldLabelTablet,
          { marginTop: 14 },
        ]}
      >
        Yeni Durum
      </Text>
      <View style={styles.statusRow}>
        {statusOptions(t).map((option) => {
          const selected = status === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.statusChip,
                isTablet && styles.statusChipTablet,
                selected && styles.statusChipSelected,
              ]}
              onPress={() => setStatus(option.value)}
            >
              <Text
                style={[
                  styles.statusChipText,
                  isTablet && styles.statusChipTextTablet,
                  selected && styles.statusChipTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[
          styles.saveBtn,
          isTablet && styles.saveBtnTablet,
          !canSave && styles.saveBtnDisabled,
        ]}
        disabled={!canSave}
        onPress={() => onSave(parsedStock, status)}
      >
        <Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet]}>
          {saving ? t('stockSaving') : t('stockUpdate')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ProductCard({
  product,
  isTablet,
  isEditing,
  saving,
  onEdit,
  onCloseEdit,
  onSave,
}: {
  product: StockEditProduct;
  isTablet: boolean;
  isEditing: boolean;
  saving: boolean;
  onEdit: () => void;
  onCloseEdit: () => void;
  onSave: (stock: number, status: StockProductStatus) => void;
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
        <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="pencil" size={20} color={AppColors.cardText} />
        </TouchableOpacity>
      </View>

      {!!product.description && (
        <Text style={[styles.productDescription, isTablet && styles.productDescriptionTablet]}>
          {product.description}
        </Text>
      )}

      <View style={[styles.statsBar, isTablet && styles.statsBarTablet]}>
        <StatCell
          label="T. Stok"
          value={`${product.totalStock} ad.`}
          isTablet={isTablet}
        />
        <StatCell
          label={t('stockSold')}
          value={`${product.sold} ad.`}
          isTablet={isTablet}
        />
        <StatCell
          label="Kalan"
          value={`${product.remaining} ad.`}
          isTablet={isTablet}
        />
        <StatCell
          label={t('stockStatus')}
          value={product.statusLabel}
          valueColor={product.statusColor}
          isTablet={isTablet}
        />
      </View>

      {isEditing ? (
        <ProductEditPanel
          product={product}
          isTablet={isTablet}
          saving={saving}
          onClose={onCloseEdit}
          onSave={onSave}
        />
      ) : null}
    </View>
  );
}

export default function AdminEventStockEditScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { user } = useAuth();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();

  const [sections, setSections] = useState<StockEditSection[]>([]);
  const [stockRecordId, setStockRecordId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const isAdminMode = !!user?.isSaleMode;

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!eventId) return;
      const silent = options?.silent ?? false;
      if (!silent) setLoading(true);
      try {
        const data = await fetchEventStockEdit(eventId);
        setStockRecordId(data.stockRecordId);
        setSections(data.sections);
      } catch {
        setSections([]);
        setStockRecordId('');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [eventId],
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

  const editingProduct = useMemo(() => {
    if (!editingKey) return null;
    for (const section of sections) {
      const found = section.products.find(
        (p) => `${p.category}:${p.id}` === editingKey,
      );
      if (found) return found;
    }
    return null;
  }, [editingKey, sections]);

  const onSaveProduct = useCallback(
    async (product: StockEditProduct, stock: number, status: StockProductStatus) => {
      if (!stockRecordId || saving) return;
      setSaving(true);
      try {
        await updateStockProduct(stockRecordId, product.category, product.id, {
          stock,
          status,
        });
        const remaining = Math.max(stock - product.sold, 0);
        const statusInfo = getProductStatusDisplay(status, remaining);
        setSections((prev) =>
          prev.map((section) => ({
            ...section,
            products: section.products.map((row) =>
              row.id === product.id && row.category === product.category
                ? {
                    ...row,
                    totalStock: stock,
                    remaining,
                    status,
                    statusLabel: statusInfo.label,
                    statusColor: statusInfo.color,
                  }
                : row,
            ),
          })),
        );
        setEditingKey(null);
      } catch {
        Alert.alert(t('updateFailed'), t('stockUpdateFailed'));
      } finally {
        setSaving(false);
      }
    },
    [stockRecordId, saving, t],
  );

  if (!isAdminMode) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, isTablet && styles.headerTablet]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={AppColors.cardText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isTablet && styles.headerTitleTablet]}>
          Stok Düzenle
        </Text>
        <View style={styles.backBtn} />
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
        {loading ? (
          <View style={styles.list}>
            {Array.from({ length: 2 }).map((_, idx) => (
              <View key={`stock-edit-skel-${idx}`}>
                <SkeletonBlock width={72} height={16} style={{ marginBottom: 12 }} />
                <SkeletonBlock height={180} borderRadius={14} />
              </View>
            ))}
          </View>
        ) : sections.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>Bu etkinlik için stok kaydı bulunamadı.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {sections.map((section) => (
              <View key={section.category}>
                <Text
                  style={[styles.sectionLabel, isTablet && styles.sectionLabelTablet]}
                >
                  {section.label}
                </Text>
                <View style={styles.sectionList}>
                  {section.products.map((product) => {
                    const key = `${product.category}:${product.id}`;
                    return (
                      <ProductCard
                        key={key}
                        product={product}
                        isTablet={isTablet}
                        isEditing={editingKey === key}
                        saving={saving && editingProduct?.id === product.id}
                        onEdit={() => setEditingKey(key)}
                        onCloseEdit={() => setEditingKey(null)}
                        onSave={(stock, status) =>
                          void onSaveProduct(product, stock, status)
                        }
                      />
                    );
                  })}
                </View>
              </View>
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
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  contentTablet: {
    paddingHorizontal: 20,
  },
  list: {
    gap: 20,
  },
  sectionLabel: {
    color: AppColors.cardText,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 15,
    marginBottom: 12,
  },
  sectionLabelTablet: {
    fontSize: 16,
  },
  sectionList: {
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
  },
  productTitle: {
    flex: 1,
    color: AppColors.cardText,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 15,
    lineHeight: 21,
    textTransform: 'uppercase',
  },
  productTitleTablet: {
    fontSize: 16,
    lineHeight: 22,
  },
  productDescription: {
    marginTop: 10,
    color: 'rgba(52,61,72,0.8)',
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    lineHeight: 19,
  },
  productDescriptionTablet: {
    fontSize: 14,
    lineHeight: 20,
  },
  statsBar: {
    marginTop: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: 'row',
  },
  statsBarTablet: {
    borderRadius: 14,
    paddingVertical: 14,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statCellLabel: {
    color: 'rgba(52,61,72,0.65)',
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    textAlign: 'center',
  },
  statCellLabelTablet: {
    fontSize: 12,
  },
  statCellValue: {
    color: AppColors.cardText,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    textAlign: 'center',
  },
  statCellValueTablet: {
    fontSize: 13,
  },
  editPanel: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(52,61,72,0.1)',
  },
  editPanelTablet: {
    marginTop: 16,
    paddingTop: 16,
  },
  editPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  editPanelTitle: {
    color: AppColors.cardText,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 16,
  },
  editPanelTitleTablet: {
    fontSize: 17,
  },
  editFieldLabel: {
    color: AppColors.cardText,
    fontFamily: 'PoppinsRegular',
    fontSize: 14,
    marginBottom: 8,
  },
  editFieldLabelTablet: {
    fontSize: 15,
  },
  editInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: AppColors.cardText,
    fontFamily: 'PoppinsRegular',
    fontSize: 16,
  },
  editInputTablet: {
    fontSize: 17,
    paddingVertical: 14,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusChip: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  statusChipTablet: {
    minHeight: 44,
    borderRadius: 12,
  },
  statusChipSelected: {
    backgroundColor: AppColors.accent,
  },
  statusChipText: {
    color: AppColors.cardText,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    textAlign: 'center',
  },
  statusChipTextTablet: {
    fontSize: 14,
  },
  statusChipTextSelected: {
    color: '#FFFFFF',
    fontFamily: 'PoppinsMedium',
  },
  saveBtn: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: AppColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnTablet: {
    minHeight: 52,
    borderRadius: 14,
  },
  saveBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 15,
  },
  saveBtnTextTablet: {
    fontSize: 16,
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
});
