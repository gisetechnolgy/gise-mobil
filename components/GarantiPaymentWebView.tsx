import { useEffect, useRef } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from '@/components/ui/AppText';
import {
  buildGaranti3dPostHtml,
  extractPaymentReturnInfo,
  extractSaleIdFromPaymentUrl,
  isGarantiCallbackUrl,
  isPaymentReturnUrl,
  type PaymentReturnInfo,
} from '../lib/garanti3dHtml';
import { fetchSaleById } from '../lib/payments';

type Props = {
  visible: boolean;
  title: string;
  action: string;
  fields: Record<string, string>;
  /** Kullanıcı X'e bastı (banka akışı tamamlanmadı). */
  onClose: () => void;
  /** Banka dönüş URL'si yakalandı. */
  onComplete: (result: PaymentReturnInfo) => void;
};

const CALLBACK_POLL_MS = 1500;

export function GarantiPaymentWebView({
  visible,
  title,
  action,
  fields,
  onClose,
  onComplete,
}: Props) {
  const html = buildGaranti3dPostHtml({ action, fields });
  // Aynı dönüş URL'si birden çok event'ten (shouldStart + navChange + error) gelebilir.
  const completedRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollSaleIdRef = useRef<string | null>(null);

  const clearPoll = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollSaleIdRef.current = null;
  };

  const finish = (info: PaymentReturnInfo) => {
    if (completedRef.current) return;
    completedRef.current = true;
    clearPoll();
    onComplete(info);
  };

  const tryComplete = (url: string) => {
    if (!url || !isPaymentReturnUrl(url)) return false;
    const info = extractPaymentReturnInfo(url);
    if (info) {
      finish(info);
      return true;
    }
    return false;
  };

  /** Callback POST'u geçtikten sonra deep link kaçarsa sale status ile bitir. */
  const startCallbackPoll = (url: string) => {
    const saleId = extractSaleIdFromPaymentUrl(url);
    if (!saleId || pollSaleIdRef.current === saleId) return;
    pollSaleIdRef.current = saleId;

    const tick = async () => {
      if (completedRef.current || pollSaleIdRef.current !== saleId) return;
      try {
        const sale = await fetchSaleById(saleId);
        const st = Number(sale.status);
        if (st === 1 || st === 2 || st === 3) {
          const extras = (sale.extras ?? {}) as Record<string, unknown>;
          finish({
            saleId,
            err: null,
            verify: extras.bankVerifyPending === true ? 'pending' : null,
          });
          return;
        }
      } catch {
        /* retry */
      }
      if (!completedRef.current && pollSaleIdRef.current === saleId) {
        pollTimerRef.current = setTimeout(() => void tick(), CALLBACK_POLL_MS);
      }
    };

    pollTimerRef.current = setTimeout(() => void tick(), CALLBACK_POLL_MS);
  };

  useEffect(() => {
    if (!visible) clearPoll();
    return () => clearPoll();
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => {
        completedRef.current = false;
        clearPoll();
      }}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <Ionicons name="close" size={24} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.closeBtn} />
        </View>
        <WebView
          originWhitelist={['*', 'cocobongoloyalty://*', 'http://*', 'https://*']}
          source={{ html, baseUrl: action }}
          onShouldStartLoadWithRequest={(req) => {
            const url = req.url ?? '';
            // Banka callback POST'unu ASLA iptal etme — API finalize etsin.
            if (isGarantiCallbackUrl(url)) {
              startCallbackPoll(url);
              return true;
            }
            // Nihai deep link / özet: WebView'da açma, native sonuca geç.
            if (tryComplete(url)) return false;
            return true;
          }}
          onNavigationStateChange={(nav) => {
            const url = nav.url ?? '';
            if (isGarantiCallbackUrl(url)) {
              startCallbackPoll(url);
              return;
            }
            tryComplete(url);
          }}
          onOpenWindow={(e) => {
            const url = e.nativeEvent?.targetUrl;
            if (!url || isGarantiCallbackUrl(url)) return;
            tryComplete(url);
          }}
          onError={(e) => {
            // Android: 302 → custom scheme bazen ERR_UNKNOWN_URL_SCHEME olarak düşer;
            // URL hâlâ dönüş URL'si ise sonucu buradan yakala.
            const url = e.nativeEvent?.url ?? '';
            if (url && !isGarantiCallbackUrl(url)) tryComplete(url);
          }}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          setSupportMultipleWindows={false}
          // Kart verisi form POST'unda; geri/ileri cache'i istemiyoruz.
          cacheEnabled={false}
          incognito
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'PoppinsBold',
    fontSize: 16,
    color: '#111827',
  },
});
