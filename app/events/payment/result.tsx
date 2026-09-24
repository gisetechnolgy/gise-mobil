import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppColors } from "../../../constants/colors";
import { tReplace, type TranslationKey } from "../../../lib/i18n";
import {
  fetchPaymentErrorMessage,
  fetchSaleById,
} from "../../../lib/payments";
import { holdSeatSelection } from "../../../lib/seatedCatalog";
import { clearTicketCart, getTicketCart } from "../../../lib/ticketCart";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/_LocaleContext";
import { AppText as Text } from "@/components/ui/AppText";

/** İlk tur: 0 / 3 / 6 / 10 sn; sonra sonuç gelene kadar 3 sn aralık. */
const POLL_DELAYS_MS = [0, 3000, 6000, 10000];
const VERIFY_POLL_MS = 3000;

/** API `err` kodları → kullanıcıya gösterilecek kısa açıklama (i18n anahtarı). */
const ERR_CODE_KEYS: Record<string, TranslationKey> = {
  "bank-declined": "payErrBankDeclined",
  "invalid-hash": "payErrInvalid",
  "order-mismatch": "payErrInvalid",
  "order-reused": "payErrInvalid",
  invalid: "payErrInvalid",
  "amount-mismatch": "payErrAmountMismatch",
  "bank-verify-mismatch": "payErrAmountMismatch",
  refunded: "payErrRefunded",
  timeout: "payErrTimeout",
  abandoned: "payErrTimeout",
  callback: "payErrGeneric",
  failed: "payErrGeneric",
};

export default function PaymentResultScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { sid, eventId, err, verify, cancelled } = useLocalSearchParams<{
    sid?: string;
    eventId?: string;
    err?: string;
    verify?: string;
    cancelled?: string;
  }>();
  const [status, setStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [errMessage, setErrMessage] = useState<string | null>(null);
  const [bankVerifyPending, setBankVerifyPending] = useState(
    String(verify ?? "") === "pending",
  );
  const settledRef = useRef(false);
  const cleanedRef = useRef(false);

  const saleId = String(sid ?? "").trim();
  const wasCancelled = String(cancelled ?? "") === "1";
  const verifyPending =
    bankVerifyPending || String(verify ?? "") === "pending";
  const errCode = String(err ?? "").trim();

  /** Başarısız / iptal: sepeti temizle, koltuk hold'larını bırak (idempotent). */
  const cleanupAfterFailure = useCallback(async () => {
    if (cleanedRef.current) return;
    cleanedRef.current = true;
    const cart = getTicketCart();
    if (cart?.mode === "seats" && cart.stockID && user?.id) {
      await Promise.all(
        cart.seats.map((s) =>
          holdSeatSelection({
            stockID: cart.stockID,
            seatId: s.id,
            userId: user.id,
            hold: false,
          }).catch(() => {}),
        ),
      );
    }
    clearTicketCart();
  }, [user?.id]);

  const checkOnce = useCallback(async (): Promise<boolean> => {
    if (!saleId) return true;
    try {
      const sale = await fetchSaleById(saleId);
      const extras = (sale.extras ?? {}) as Record<string, unknown>;
      if (extras.bankVerifyPending === true) {
        setBankVerifyPending(true);
      }
      const st = Number(sale.status);
      if (st === 1) {
        settledRef.current = true;
        setStatus(1);
        setBankVerifyPending(false);
        clearTicketCart();
        return true;
      }
      if (st === 2 || st === 3) {
        settledRef.current = true;
        setStatus(st);
        setBankVerifyPending(false);
        const msg = await fetchPaymentErrorMessage(sale);
        if (msg) setErrMessage(msg);
        void cleanupAfterFailure();
        return true;
      }
    } catch {
      /* retry */
    }
    return false;
  }, [saleId, cleanupAfterFailure]);

  // Sonuç (1 / 2 / 3) gelene kadar bekler; pending timeout ekranı yok.
  useEffect(() => {
    if (!saleId) {
      setLoading(false);
      return;
    }
    if (wasCancelled) {
      setLoading(false);
      setStatus(0);
      void cleanupAfterFailure();
      return;
    }

    let cancelledEffect = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const scheduleRetry = () => {
      timers.push(
        setTimeout(async () => {
          if (cancelledEffect || settledRef.current) return;
          const done = await checkOnce();
          if (done) {
            setLoading(false);
            return;
          }
          scheduleRetry();
        }, VERIFY_POLL_MS),
      );
    };

    const run = async (isLast: boolean) => {
      if (cancelledEffect || settledRef.current) return;
      const done = await checkOnce();
      if (done) {
        setLoading(false);
        return;
      }
      if (isLast) scheduleRetry();
    };

    POLL_DELAYS_MS.forEach((delay, i) => {
      timers.push(
        setTimeout(
          () => void run(i === POLL_DELAYS_MS.length - 1),
          delay,
        ),
      );
    });
    return () => {
      cancelledEffect = true;
      timers.forEach(clearTimeout);
    };
  }, [saleId, checkOnce, wasCancelled, cleanupAfterFailure]);

  const isSuccess = status === 1;
  const isFailed = status === 2 || status === 3;
  const isCancelled = !loading && wasCancelled && !isSuccess && !isFailed;

  const errCodeKey = errCode ? ERR_CODE_KEYS[errCode] : undefined;
  const failedDetail =
    errMessage ?? (errCodeKey ? t(errCodeKey) : null) ?? (errCode || null);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.content}>
        {loading ? (
          <>
            <ActivityIndicator size="large" color={AppColors.navBg} />
            <Text style={styles.message}>
              {verifyPending
                ? t("paymentVerifyingWithBank")
                : t("paymentProcessing")}
            </Text>
          </>
        ) : isSuccess ? (
          <>
            <Ionicons name="checkmark-circle" size={72} color="#16A34A" />
            <Text style={styles.title}>{t("paymentSuccessTitle")}</Text>
            <Text style={styles.message}>{t("paymentSuccessMessage")}</Text>
          </>
        ) : isFailed ? (
          <>
            <Ionicons name="close-circle" size={72} color="#DC2626" />
            <Text style={styles.title}>{t("paymentFailedTitle")}</Text>
            <Text style={styles.message}>{t("paymentFailedMessage")}</Text>
            {failedDetail ? (
              <Text style={styles.detail}>
                {tReplace("paymentErrorReason", { reason: failedDetail })}
              </Text>
            ) : null}
          </>
        ) : isCancelled ? (
          <>
            <Ionicons name="remove-circle-outline" size={72} color="#6B7280" />
            <Text style={styles.title}>{t("paymentCancelledTitle")}</Text>
            <Text style={styles.message}>{t("paymentCancelledMessage")}</Text>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={AppColors.navBg} />
            <Text style={styles.message}>{t("paymentProcessing")}</Text>
          </>
        )}

        {!loading && (isSuccess || isFailed || isCancelled) ? (
          <View style={styles.actions}>
            {(isFailed || isCancelled) && eventId ? (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() =>
                  router.replace(
                    `/events/${eventId}` as import("expo-router").Href,
                  )
                }
              >
                <Text style={styles.primaryBtnText}>{t("tryAgain")}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={
                isFailed || isCancelled ? styles.secondaryBtn : styles.primaryBtn
              }
              onPress={() => router.replace("/tickets")}
            >
              <Text
                style={
                  isFailed || isCancelled
                    ? styles.secondaryBtnText
                    : styles.primaryBtnText
                }
              >
                {t("tickets")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => {
                if (eventId) {
                  router.replace(
                    `/events/${eventId}` as import("expo-router").Href,
                  );
                } else {
                  router.replace("/(tabs)/events");
                }
              }}
            >
              <Text style={styles.secondaryBtnText}>{t("events")}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  title: {
    fontFamily: "PoppinsBold",
    fontSize: 20,
    color: "#111827",
    textAlign: "center",
  },
  message: {
    fontFamily: "PoppinsRegular",
    fontSize: 14,
    color: AppColors.cardText,
    textAlign: "center",
    lineHeight: 22,
  },
  detail: {
    fontFamily: "PoppinsMedium",
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  actions: {
    marginTop: 24,
    width: "100%",
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: AppColors.navBg,
    borderRadius: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontFamily: "PoppinsBold",
    fontSize: 15,
  },
  secondaryBtn: {
    borderRadius: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  secondaryBtnText: {
    color: "#111827",
    fontFamily: "PoppinsMedium",
    fontSize: 15,
  },
});
