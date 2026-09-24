import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppColors } from '../../constants/colors';
import {
  fetchRefundEligibleItems,
  submitCustomerRefund,
  type CustomerRefundResult,
  type RefundEligibleItem,
} from '../../lib/customerRefund';
import { useTranslation } from '../context/_LocaleContext';
import { AppText as Text } from '@/components/ui/AppText';

type Props = {
  visible: boolean;
  saleId: string | null;
  onClose: () => void;
  onSuccess: (
    result: CustomerRefundResult,
    refundedItems: Array<{ productId: string; count: number }>,
  ) => void;
};

export default function CustomerRefundModal({
  visible,
  saleId,
  onClose,
  onSuccess,
}: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<RefundEligibleItem[]>([]);
  const [itemsInProcess, setItemsInProcess] = useState<RefundEligibleItem[]>(
    [],
  );
  const [itemsNotRefundable, setItemsNotRefundable] = useState<
    RefundEligibleItem[]
  >([]);
  const [pending, setPending] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!visible || !saleId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setItems([]);
    setItemsInProcess([]);
    setItemsNotRefundable([]);
    setPending(false);
    setCounts({});

    void (async () => {
      try {
        const data = await fetchRefundEligibleItems(saleId);
        if (cancelled) return;
        setItems(data.items);
        setItemsInProcess(data.itemsInProcess);
        setItemsNotRefundable(data.itemsNotRefundable);
        setPending(!!data.pendingRefund);
        const initial: Record<string, number> = {};
        for (const item of data.items) {
          initial[`${item.groupKey}:${item.productId}`] = 0;
        }
        setCounts(initial);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : t('refundFailed'),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, saleId, t]);

  const selectedItems = useMemo(
    () =>
      items
        .map((item) => {
          const key = `${item.groupKey}:${item.productId}`;
          const count = counts[key] || 0;
          if (count <= 0) return null;
          return {
            groupKey: item.groupKey,
            productId: item.productId,
            count,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x != null),
    [items, counts],
  );

  const setCount = (key: string, next: number, max: number) => {
    const n = Math.max(0, Math.min(max, next));
    setCounts((prev) => ({ ...prev, [key]: n }));
  };

  const handleSubmit = async () => {
    if (!saleId || selectedItems.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitCustomerRefund(saleId, selectedItems);
      onSuccess(
        result ?? { status: 'done' },
        selectedItems.map((i) => ({
          productId: i.productId,
          count: i.count,
        })),
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('refundFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.root} pointerEvents="box-none">
        <Pressable
          style={styles.backdropTop}
          onPress={onClose}
          accessibilityRole="button"
        />
        <View style={styles.sheet} pointerEvents="auto" collapsable={false}>
          <Text style={styles.title}>{t('refundModalTitle')}</Text>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={AppColors.navBg} />
              <Text style={styles.muted}>{t('loading')}</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {pending ? (
                <Text style={styles.pending}>{t('refundStatusWaiting')}</Text>
              ) : null}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              {!error &&
              items.length === 0 &&
              itemsInProcess.length === 0 &&
              itemsNotRefundable.length === 0 ? (
                <Text style={styles.muted}>{t('refundModalNoItems')}</Text>
              ) : null}

              {itemsNotRefundable.map((item) => {
                const key = `closed:${item.groupKey}:${item.productId}`;
                return (
                  <View key={key} style={styles.rowMuted}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.closedWarn}>
                      {t('refundProductClosed')}
                    </Text>
                  </View>
                );
              })}

              {itemsInProcess.map((item) => {
                const key = `${item.groupKey}:${item.productId}`;
                return (
                  <View key={key} style={styles.rowMuted}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.pending}>{t('refundStatusInProcess')}</Text>
                  </View>
                );
              })}

              {items.map((item) => {
                const key = `${item.groupKey}:${item.productId}`;
                const value = counts[key] || 0;
                return (
                  <View key={key} style={styles.row}>
                    <View style={styles.rowInfo}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <Text style={styles.muted}>
                        {item.price} TL · max {item.available}
                      </Text>
                    </View>
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => setCount(key, value - 1, item.available)}
                        disabled={value <= 0}
                        hitSlop={8}
                      >
                        <Text style={styles.stepBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.stepValue}>{value}</Text>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => setCount(key, value + 1, item.available)}
                        disabled={value >= item.available}
                        hitSlop={8}
                      >
                        <Text style={styles.stepBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={styles.secondaryBtnText}>{t('no')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (submitting || selectedItems.length === 0) &&
                  styles.primaryBtnDisabled,
              ]}
              onPress={() => void handleSubmit()}
              disabled={submitting || selectedItems.length === 0}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {t('refundModalConfirm')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <Pressable
          style={styles.backdropBottom}
          onPress={onClose}
          accessibilityRole="button"
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backdropTop: {
    flex: 1,
  },
  backdropBottom: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    maxHeight: '80%',
    zIndex: 2,
    elevation: 24,
  },
  title: {
    fontFamily: 'PoppinsBold',
    fontSize: 17,
    color: '#111827',
    marginBottom: 12,
  },
  center: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 24,
  },
  scroll: {
    maxHeight: 360,
  },
  scrollContent: {
    gap: 10,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  rowMuted: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    gap: 4,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  itemTitle: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
    color: '#111827',
  },
  muted: {
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    color: '#6B7280',
  },
  pending: {
    fontFamily: 'PoppinsMedium',
    fontSize: 13,
    color: AppColors.accent,
  },
  closedWarn: {
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
    color: '#B45309',
  },
  error: {
    fontFamily: 'PoppinsMedium',
    fontSize: 13,
    color: '#DC2626',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  stepBtnText: {
    fontSize: 18,
    color: '#111827',
    fontFamily: 'PoppinsMedium',
    lineHeight: 22,
  },
  stepValue: {
    minWidth: 24,
    textAlign: 'center',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 15,
    color: '#111827',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  secondaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontFamily: 'PoppinsMedium',
    fontSize: 14,
    color: '#111827',
  },
  primaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: AppColors.navBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.45,
  },
  primaryBtnText: {
    fontFamily: 'PoppinsBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
