import { RemoteCardImage } from "../_RemoteCardImage";
import { AppText as Text } from "@/components/ui/AppText";
import { useRouter } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { AppColors } from "../../../constants/colors";
import { ENTITY_LIST_CARD } from "../../../constants/mobileDetail";
import { formatCityLabel } from "../../../lib/cities";
import { resolveRemoteImageUrl } from "../../../lib/remoteImage";

type Props = {
  id: string;
  name: string;
  hrefBase: "venues" | "companies";
  bannerUrl?: string | null;
  logoUrl?: string | null;
  city?: string | null;
  categoryLabel?: string;
  cacheKey?: string;
};

/** Web VenueCard / OrganisationCompanyCard — dikey liste kartı */
export default function EntityListCard({
  id,
  name,
  hrefBase,
  bannerUrl,
  logoUrl,
  city,
  categoryLabel,
  cacheKey,
}: Props) {
  const router = useRouter();
  const cover =
    resolveRemoteImageUrl(bannerUrl) || resolveRemoteImageUrl(logoUrl);
  const cityLabel = formatCityLabel(city);

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={() =>
        router.push(`/${hrefBase}/${id}` as import("expo-router").Href)
      }
      style={[
        styles.card,
        {
          borderRadius: ENTITY_LIST_CARD.radius,
          minHeight: ENTITY_LIST_CARD.minHeight,
        },
      ]}
    >
      <View
        style={[
          styles.coverShadow,
          {
            borderTopLeftRadius: ENTITY_LIST_CARD.radius,
            borderTopRightRadius: ENTITY_LIST_CARD.radius,
            borderBottomLeftRadius: ENTITY_LIST_CARD.imageBottomRadius,
            borderBottomRightRadius: ENTITY_LIST_CARD.imageBottomRadius,
          },
        ]}
      >
        <View
          style={[
            styles.cover,
            {
              width: "100%",
              aspectRatio: ENTITY_LIST_CARD.imageAspect,
              borderTopLeftRadius: ENTITY_LIST_CARD.radius,
              borderTopRightRadius: ENTITY_LIST_CARD.radius,
              borderBottomLeftRadius: ENTITY_LIST_CARD.imageBottomRadius,
              borderBottomRightRadius: ENTITY_LIST_CARD.imageBottomRadius,
            },
          ]}
        >
          <RemoteCardImage
            uri={cover}
            recyclingKey={cacheKey ?? id}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        </View>
      </View>
      <View
        style={{
          paddingHorizontal: ENTITY_LIST_CARD.textPad,
          paddingVertical: ENTITY_LIST_CARD.textPad,
          gap: ENTITY_LIST_CARD.lineGap,
          flex: 1,
          zIndex: 1,
        }}
      >
        <Text style={styles.title} numberOfLines={2}>
          {name}
        </Text>
        {categoryLabel ? (
          <Text style={styles.meta} numberOfLines={1}>
            {categoryLabel}
          </Text>
        ) : null}
        {cityLabel ? (
          <Text style={styles.meta} numberOfLines={1}>
            {cityLabel}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 7,
    elevation: 2,
  },
  /** Web VENUE_IMAGE_BOX_SHADOW — görsel kenarları / alt gölge */
  coverShadow: {
    zIndex: 2,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 5,
  },
  cover: {
    width: "100%",
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  title: {
    fontFamily: "PoppinsBold",
    fontSize: ENTITY_LIST_CARD.titleSize,
    color: AppColors.heading,
    lineHeight: 20,
  },
  meta: {
    fontFamily: "PoppinsRegular",
    fontSize: ENTITY_LIST_CARD.metaSize,
    color: "#808080",
  },
});
