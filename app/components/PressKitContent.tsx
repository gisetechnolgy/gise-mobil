import { Image } from "expo-image";
import { Linking, StyleSheet, TouchableOpacity, View } from "react-native";
import { AppColors } from "../../constants/colors";
import { useLocale, useTranslation } from "../context/_LocaleContext";
import { AppText as Text } from "@/components/ui/AppText";

const MEDIA_URL = "https://media.gisekibris.com/";

const IMAGES = {
  logoselect: require("../../assets/presskit/logoselect.jpeg"),
  clearspace: require("../../assets/presskit/clearspace.jpeg"),
  rightwrong: require("../../assets/presskit/rightwrong.jpeg"),
  colorselect: require("../../assets/presskit/colorselect.jpeg"),
  correctplaces: require("../../assets/presskit/correctplaces.jpeg"),
  correctplacesEx: require("../../assets/presskit/correctplaces-ex.jpeg"),
} as const;

/** Web PressKitContent ile aynı metin + görseller */
export default function PressKitContent() {
  const { t } = useTranslation();
  const { locale } = useLocale();

  return (
    <View style={styles.root}>
      <Text style={styles.h2}>{t("presskitLogoUsage")}</Text>
      <Text style={styles.h3}>{t("presskitChoosingRightLogo")}</Text>
      <Image
        source={IMAGES.logoselect}
        style={styles.image}
        contentFit="contain"
      />
      <Text style={styles.p}>
        {t("presskitLogoSelectionText")}{" "}
        <Text style={styles.link} onPress={() => void Linking.openURL(MEDIA_URL)}>
          media.gisekibris.com
        </Text>
      </Text>

      <Text style={[styles.h3, styles.mt]}>{t("presskitUsageArea")}</Text>
      <Image
        source={IMAGES.clearspace}
        style={styles.image}
        contentFit="contain"
      />
      <Text style={styles.p}>{t("presskitUsageAreaText")}</Text>

      <Text style={[styles.h3, styles.mt]}>{t("presskitUsage")}</Text>
      <Image
        source={IMAGES.rightwrong}
        style={styles.image}
        contentFit="contain"
      />
      <Text style={styles.p}>{t("presskitUsageText")}</Text>

      <Text style={[styles.h2, styles.mtLg]}>{t("presskitDesignRules")}</Text>
      <Text style={[styles.h3, styles.mt]}>{t("presskitCorrectColors")}</Text>
      <Image
        source={IMAGES.colorselect}
        style={styles.image}
        contentFit="contain"
      />
      <Text style={styles.p}>{t("presskitCorrectColorsText")}</Text>

      <Text style={[styles.h3, styles.mt]}>{t("presskitLogoPositioning")}</Text>
      <Image
        source={IMAGES.correctplaces}
        style={styles.image}
        contentFit="contain"
      />
      <Text style={styles.p}>{t("presskitLogoPositioningText")}</Text>

      <Text style={[styles.h3, styles.mt]}>{t("presskitLogoDesignHarmony")}</Text>
      <Image
        source={IMAGES.correctplacesEx}
        style={styles.image}
        contentFit="contain"
      />

      <TouchableOpacity
        style={styles.cta}
        activeOpacity={0.85}
        onPress={() => void Linking.openURL(MEDIA_URL)}
      >
        <Text style={styles.ctaText}>
          {locale === "en" ? "Open media centre" : "Medya merkezini aç"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 16,
    padding: 16,
  },
  h2: {
    color: AppColors.heading,
    fontFamily: "PoppinsBold",
    fontSize: 18,
    marginBottom: 12,
  },
  h3: {
    color: AppColors.heading,
    fontFamily: "PoppinsSemiBold",
    fontSize: 15,
    marginBottom: 10,
  },
  p: {
    color: "rgba(52, 61, 72, 0.85)",
    fontFamily: "PoppinsRegular",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  link: {
    color: AppColors.accent,
    fontFamily: "PoppinsSemiBold",
    textDecorationLine: "underline",
  },
  image: {
    width: "100%",
    aspectRatio: 16 / 10,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#F3F4F6",
  },
  mt: { marginTop: 16 },
  mtLg: { marginTop: 24 },
  cta: {
    alignSelf: "flex-start",
    marginTop: 16,
    backgroundColor: AppColors.heading,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  ctaText: {
    color: "#FFF",
    fontFamily: "PoppinsSemiBold",
    fontSize: 14,
  },
});
