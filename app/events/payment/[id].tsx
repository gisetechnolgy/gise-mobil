import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppColors } from "../../../constants/colors";
import { fetchEventById } from "../../../lib/events";
import { tReplace } from "../../../lib/i18n";
import { useIsTablet } from "../../../lib/responsive";
import { formatMoneyTl } from "../../../lib/startingPrice";
import { getTicketCart } from "../../../lib/ticketCart";
import { useTranslation } from "../../context/LocaleContext";
import { AppText as Text } from "@/components/ui/AppText";

const MONTHS = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);

function buildYears() {
  const current = new Date().getFullYear();
  return Array.from({ length: 16 }, (_, i) => String(current + i));
}

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function SelectBox({
  label,
  value,
  placeholder,
  onPress,
}: {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.selectBox}
    >
      <Text style={styles.selectLabel}>{label}</Text>
      <Text style={[styles.selectValue, !value && styles.selectPlaceholder]}>
        {value || placeholder}
      </Text>
    </TouchableOpacity>
  );
}

function OptionPickerModal({
  visible,
  title,
  options,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  options: string[];
  onClose: () => void;
  onSelect: (value: string) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.pickerOverlay} onPress={onClose}>
        <Pressable style={styles.pickerCard} onPress={() => {}}>
          <Text style={styles.pickerTitle}>{title}</Text>
          <ScrollView style={styles.pickerList}>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                activeOpacity={0.85}
                style={styles.pickerOption}
                onPress={() => {
                  onSelect(option);
                  onClose();
                }}
              >
                <Text style={styles.pickerOptionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function EventPaymentScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cart = useMemo(() => getTicketCart(id), [id]);
  const [eventUrl, setEventUrl] = useState<string | undefined>();
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cvv, setCvv] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const years = useMemo(() => buildYears(), []);

  useEffect(() => {
    if (!id) return;
    if (!cart || cart.totalQuantity <= 0) {
      router.replace(`/events/buy/${id}` as import("expo-router").Href);
      return;
    }
    void fetchEventById(id).then((event) => {
      if (event?.eventUrl) setEventUrl(event.eventUrl);
    });
  }, [cart, id, router]);

  const serviceFee = 0;
  const total = (cart?.totalPrice ?? 0) + serviceFee;
  const cardDigits = cardNumber.replace(/\s/g, "");
  const isFormValid =
    cardHolder.trim().length > 2 &&
    cardDigits.length >= 15 &&
    cvv.replace(/\D/g, "").length >= 3 &&
    !!month &&
    !!year;

  const onPay = () => {
    if (!isFormValid) return;
    Alert.alert(t("paymentSummary"), t("paymentComingSoon"), [
      {
        text: t("ok"),
        style: "cancel",
      },
      ...(eventUrl
        ? [
            {
              text: t("showOnWebMobile"),
              onPress: () => {
                void Linking.openURL(eventUrl);
              },
            },
          ]
        : []),
    ]);
  };

  if (!cart || cart.totalQuantity <= 0) {
    return (
      <SafeAreaView edges={["left", "right", "top"]} style={styles.safe}>
        <StatusBar style="dark" />
        <Stack.Screen options={{ headerShown: false }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["left", "right", "top"]} style={styles.safe}>
      <StatusBar style="dark" />
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: true,
          fullScreenGestureEnabled: false,
        }}
      />

      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isTablet && styles.headerTitleTablet]}>
          {t("paymentSummary")}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: insets.bottom + 100,
          gap: 14,
        }}
      >
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>{t("yourSelections")}</Text>
          {cart.lines.map((line) => (
            <View key={line.productId} style={styles.summaryRow}>
              <Text style={styles.summaryLabel} numberOfLines={2}>
                {line.title} (
                {tReplace("ticketPieceLabel", {
                  count: String(line.quantity),
                })}
                )
              </Text>
              <Text style={styles.summaryValue}>
                {formatMoneyTl(line.price * line.quantity)}
              </Text>
            </View>
          ))}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t("serviceFee")}</Text>
            <Text style={styles.summaryValue}>
              {serviceFee === 0 ? "0 TL" : formatMoneyTl(serviceFee)}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryTotalRow]}>
            <Text style={styles.summaryTotalLabel}>
              {t("totalPrice")} (
              {tReplace("ticketPieceLabel", {
                count: String(cart.totalQuantity),
              })}
              )
            </Text>
            <Text style={styles.summaryTotalValue}>
              {formatMoneyTl(total)}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>{t("paymentMethod")}</Text>
          <View style={styles.methodBtn}>
            <Text style={styles.methodBtnText}>{t("creditCard")}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>{t("cardPaymentDetails")}</Text>

          <Text style={styles.fieldLabel}>{t("cardHolder")}</Text>
          <TextInput
            value={cardHolder}
            onChangeText={setCardHolder}
            placeholder={t("cardHolderPlaceholder")}
            placeholderTextColor="#9CA3AF"
            style={styles.underlineInput}
            autoCapitalize="words"
          />

          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>
            {t("cardNumber")}
          </Text>
          <TextInput
            value={cardNumber}
            onChangeText={(v) => setCardNumber(formatCardNumber(v))}
            placeholder={t("cardNumberPlaceholder")}
            placeholderTextColor="#9CA3AF"
            style={styles.underlineInput}
            keyboardType="number-pad"
            maxLength={19}
          />

          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>
            {t("cardCvv")}
          </Text>
          <TextInput
            value={cvv}
            onChangeText={(v) => setCvv(v.replace(/\D/g, "").slice(0, 4))}
            placeholder={t("cardCvvPlaceholder")}
            placeholderTextColor="#9CA3AF"
            style={styles.underlineInput}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
          />

          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>
            {t("cardExpiry")}
          </Text>
          <View style={styles.expiryRow}>
            <SelectBox
              label={t("cardMonth")}
              value={month}
              placeholder={t("cardSelect")}
              onPress={() => setMonthPickerOpen(true)}
            />
            <SelectBox
              label={t("cardYear")}
              value={year}
              placeholder={t("cardSelect")}
              onPress={() => setYearPickerOpen(true)}
            />
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.payBar,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={!isFormValid}
          onPress={onPay}
          style={[styles.payBtn, !isFormValid && styles.payBtnDisabled]}
        >
          <Text style={styles.payBtnText}>{t("makePayment")}</Text>
        </TouchableOpacity>
      </View>

      <OptionPickerModal
        visible={monthPickerOpen}
        title={t("cardMonth")}
        options={MONTHS}
        onClose={() => setMonthPickerOpen(false)}
        onSelect={setMonth}
      />
      <OptionPickerModal
        visible={yearPickerOpen}
        title={t("cardYear")}
        options={years}
        onClose={() => setYearPickerOpen(false)}
        onSelect={setYear}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#111827",
    fontFamily: "PoppinsBold",
    fontSize: 17,
  },
  headerTitleTablet: {
    fontSize: 19,
  },
  headerSpacer: {
    width: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
  },
  cardSectionTitle: {
    color: "#9CA3AF",
    fontFamily: "PoppinsMedium",
    fontSize: 13,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  summaryTotalRow: {
    marginTop: 4,
    marginBottom: 0,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
  },
  summaryLabel: {
    flex: 1,
    color: AppColors.cardText,
    fontFamily: "PoppinsRegular",
    fontSize: 14,
    lineHeight: 20,
  },
  summaryValue: {
    color: "#111827",
    fontFamily: "PoppinsBold",
    fontSize: 14,
  },
  summaryTotalLabel: {
    flex: 1,
    color: AppColors.cardText,
    fontFamily: "PoppinsRegular",
    fontSize: 14,
    lineHeight: 20,
  },
  summaryTotalValue: {
    color: "#111827",
    fontFamily: "PoppinsBold",
    fontSize: 15,
  },
  methodBtn: {
    backgroundColor: AppColors.navBg,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  methodBtnText: {
    color: "#FFFFFF",
    fontFamily: "PoppinsBold",
    fontSize: 14,
  },
  fieldLabel: {
    color: "#111827",
    fontFamily: "PoppinsBold",
    fontSize: 14,
    marginBottom: 6,
  },
  fieldLabelSpaced: {
    marginTop: 16,
  },
  underlineInput: {
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
    paddingVertical: 8,
    color: "#111827",
    fontFamily: "PoppinsRegular",
    fontSize: 14,
  },
  expiryRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  selectBox: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectLabel: {
    color: "#111827",
    fontFamily: "PoppinsMedium",
    fontSize: 14,
  },
  selectValue: {
    color: "#111827",
    fontFamily: "PoppinsRegular",
    fontSize: 14,
  },
  selectPlaceholder: {
    color: "#9CA3AF",
  },
  payBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: AppColors.background,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  payBtn: {
    backgroundColor: AppColors.navBg,
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  payBtnDisabled: {
    backgroundColor: "#D1D5DB",
  },
  payBtnText: {
    color: "#FFFFFF",
    fontFamily: "PoppinsBold",
    fontSize: 16,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  pickerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    maxHeight: 360,
    paddingTop: 14,
    paddingBottom: 8,
  },
  pickerTitle: {
    textAlign: "center",
    color: "#111827",
    fontFamily: "PoppinsBold",
    fontSize: 15,
    marginBottom: 8,
  },
  pickerList: {
    paddingHorizontal: 8,
  },
  pickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  pickerOptionText: {
    color: AppColors.cardText,
    fontFamily: "PoppinsMedium",
    fontSize: 15,
    textAlign: "center",
  },
});
