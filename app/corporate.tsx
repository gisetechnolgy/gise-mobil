import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { WebView } from "react-native-webview";
import { useState } from "react";
import { AppColors } from "../constants/colors";
import { useTranslation } from "./context/LocaleContext";
import { useIsTablet } from "../lib/responsive";
import { AppText as Text } from "@/components/ui/AppText";

const CORPORATE_URL = "https://www2.gisekibris.com/kurumsal";

export default function CorporateScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const isTablet = useIsTablet();
  const [loading, setLoading] = useState(true);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />
      <View style={[styles.header, isTablet && styles.headerTablet]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={AppColors.cardText} />
        </TouchableOpacity>
        <Text style={[styles.title, isTablet && styles.titleTablet]}>
          {t("corporate")}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.webWrap}>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={AppColors.heading} />
          </View>
        ) : null}
        <WebView
          source={{ uri: CORPORATE_URL }}
          style={styles.webview}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          startInLoadingState
          allowsBackForwardNavigationGestures
        />
      </View>
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
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(52, 61, 72, 0.12)",
    backgroundColor: AppColors.cardBg,
  },
  headerTablet: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: AppColors.cardText,
    fontFamily: "PoppinsSemiBold",
    fontSize: 17,
  },
  titleTablet: {
    fontSize: 22,
  },
  webWrap: {
    flex: 1,
    position: "relative",
  },
  webview: {
    flex: 1,
    backgroundColor: AppColors.cardBg,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.cardBg,
  },
});
