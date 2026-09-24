import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter, type Href } from "expo-router";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppColors } from "../../constants/colors";
import {
  CORPORATE_NAV_ITEMS,
  localizeCorporateLabel,
} from "../../constants/corporateNav";
import { tabBarScrollPadding } from "../../constants/tabBar";
import { useLocale, useTranslation } from "../context/_LocaleContext";
import { useIsTablet } from "../../lib/responsive";
import { AppText as Text } from "@/components/ui/AppText";

export default function CorporateIndexScreen() {
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
        <Text style={styles.headerTitle}>{t("corporate")}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          isTablet && styles.contentTablet,
          { paddingBottom: tabBarScrollPadding(isTablet, insets.bottom) },
        ]}
      >
        {CORPORATE_NAV_ITEMS.map((item, index) => (
          <TouchableOpacity
            key={item.slug}
            activeOpacity={0.65}
            onPress={() =>
              router.push(`/corporate/${item.slug}` as Href)
            }
            style={[
              styles.row,
              index < CORPORATE_NAV_ITEMS.length - 1 && styles.rowBorder,
            ]}
          >
            <Text style={[styles.rowLabel, isTablet && styles.rowLabelTablet]}>
              {localizeCorporateLabel(item.label, locale)}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={isTablet ? 22 : 18}
              color="rgba(52, 61, 72, 0.45)"
            />
          </TouchableOpacity>
        ))}
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
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  contentTablet: {
    paddingHorizontal: 28,
    maxWidth: 720,
    alignSelf: "center",
    width: "100%",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: AppColors.cardBg,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(52, 61, 72, 0.12)",
  },
  rowLabel: {
    flex: 1,
    color: AppColors.cardText,
    fontFamily: "PoppinsMedium",
    fontSize: 16,
    paddingRight: 12,
  },
  rowLabelTablet: {
    fontSize: 18,
  },
});
