import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { Linking, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppColors } from "../constants/colors";
import { tabBarScrollPadding } from "../constants/tabBar";
import { useLocale, useTranslation } from "./context/_LocaleContext";
import { useIsTablet } from "../lib/responsive";
import { AppText as Text } from "@/components/ui/AppText";

const CONTACT = {
  address: {
    tr: "Osmanpaşa Cad. Memduh Asaf Sok. Dereboyu, Lefkoşa, Kıbrıs",
    en: "Osmanpasa Cad. Memduh Asaf Sok. Dereboyu, Nicosia, Cyprus",
  },
  email: "info@gisekibris.com",
  phone: "+90 539 111 85 85",
  phoneHref: "tel:+905391118585",
  support: "https://destek.gisekibris.com",
};

type CardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
  onPress?: () => void;
  isTablet: boolean;
};

function ContactCard({ icon, title, value, onPress, isTablet }: CardProps) {
  const content = (
    <>
      <View style={styles.cardIcon}>
        <Ionicons name={icon} size={isTablet ? 24 : 20} color={AppColors.heading} />
      </View>
      <Text style={[styles.cardTitle, isTablet && styles.cardTitleTablet]}>
        {title}
      </Text>
      <Text style={[styles.cardValue, isTablet && styles.cardValueTablet]}>
        {value}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={[styles.card, isTablet && styles.cardTablet]}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.card, isTablet && styles.cardTablet]}>{content}</View>;
}

export default function ContactScreen() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();

  return (
    <SafeAreaView edges={["left", "right"]} style={styles.safe}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 2 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={AppColors.cardText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("contact")}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          isTablet && styles.contentTablet,
          { paddingBottom: tabBarScrollPadding(isTablet, insets.bottom) },
        ]}
      >
        <Text style={[styles.introTitle, isTablet && styles.introTitleTablet]}>
          {t("contactTitle")}
        </Text>
        <Text style={styles.introText}>{t("contactSubTitle")}</Text>

        <View style={styles.grid}>
          <ContactCard
            icon="location-outline"
            title={locale === "en" ? "Address" : "Adres"}
            value={CONTACT.address[locale]}
            isTablet={isTablet}
          />
          <ContactCard
            icon="mail-outline"
            title={locale === "en" ? "Email" : "E-posta"}
            value={CONTACT.email}
            onPress={() => void Linking.openURL(`mailto:${CONTACT.email}`)}
            isTablet={isTablet}
          />
          <ContactCard
            icon="call-outline"
            title={locale === "en" ? "Phone" : "Telefon"}
            value={CONTACT.phone}
            onPress={() => void Linking.openURL(CONTACT.phoneHref)}
            isTablet={isTablet}
          />
          <ContactCard
            icon="help-buoy-outline"
            title={t("supportCenter")}
            value={t("openSupport")}
            onPress={() => void Linking.openURL(CONTACT.support)}
            isTablet={isTablet}
          />
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(52, 61, 72, 0.12)",
    backgroundColor: AppColors.cardBg,
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
    color: AppColors.cardText,
    fontFamily: "PoppinsSemiBold",
    fontSize: 17,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  contentTablet: {
    paddingHorizontal: 32,
    maxWidth: 720,
    alignSelf: "center",
    width: "100%",
  },
  introTitle: {
    color: AppColors.cardText,
    fontFamily: "PoppinsSemiBold",
    fontSize: 20,
    marginBottom: 8,
  },
  introTitleTablet: {
    fontSize: 24,
  },
  introText: {
    color: "rgba(52, 61, 72, 0.75)",
    fontFamily: "PoppinsRegular",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },
  grid: {
    gap: 12,
  },
  card: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 14,
    padding: 16,
  },
  cardTablet: {
    padding: 20,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(32, 33, 63, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  cardTitle: {
    color: AppColors.heading,
    fontFamily: "PoppinsSemiBold",
    fontSize: 14,
    marginBottom: 4,
  },
  cardTitleTablet: {
    fontSize: 16,
  },
  cardValue: {
    color: AppColors.cardText,
    fontFamily: "PoppinsRegular",
    fontSize: 15,
    lineHeight: 22,
  },
  cardValueTablet: {
    fontSize: 16,
  },
});
