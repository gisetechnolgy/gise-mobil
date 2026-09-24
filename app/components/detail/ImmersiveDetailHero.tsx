import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HOME_SECTION_CARD_IMAGE_ASPECT } from "../../../constants/homeSection";
import { EventCardImage } from "../_EventCardImage";
import { AppText as Text } from "@/components/ui/AppText";

type Props = {
  title: string;
  imageUrl?: string | null;
  cacheKey?: string | null;
  recyclingKey?: string;
  style?: StyleProp<ViewStyle>;
};

/** Hero görsel: home kartıyla aynı 344 / 194 oranı */
export default function ImmersiveDetailHero({
  title,
  imageUrl,
  cacheKey,
  recyclingKey,
  style,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.hero, style]}>
      {imageUrl ? (
        <EventCardImage
          imageUrl={imageUrl}
          cacheKey={cacheKey}
          recyclingKey={recyclingKey}
          priority="high"
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      ) : (
        <LinearGradient
          colors={["#AE256D", "#1F213F"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <LinearGradient
        colors={["rgba(0,0,0,0.28)", "rgba(0,0,0,0.62)"]}
        style={StyleSheet.absoluteFill}
      />
      <TouchableOpacity
        onPress={() => router.back()}
        style={[styles.backBtn, { top: Math.max(insets.top, 10) }]}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Geri"
      >
        <Ionicons name="chevron-back" size={30} color="#FFFFFF" />
      </TouchableOpacity>
      <View style={styles.heroText}>
        <Text style={styles.heroTitle} numberOfLines={3}>
          {title}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: "100%",
    aspectRatio: HOME_SECTION_CARD_IMAGE_ASPECT,
    backgroundColor: "#1a1a2e",
    overflow: "hidden",
  },
  backBtn: {
    position: "absolute",
    left: 6,
    zIndex: 2,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  heroText: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 28,
    zIndex: 2,
    alignItems: "center",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontFamily: "PoppinsBold",
    fontSize: 17,
    lineHeight: 21,
    textTransform: "uppercase",
    letterSpacing: 0.34,
    textAlign: "center",
  },
});
