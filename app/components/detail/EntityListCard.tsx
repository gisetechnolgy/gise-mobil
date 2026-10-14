import { Feather } from "@expo/vector-icons";
import { RemoteCardImage } from "../_RemoteCardImage";
import { useTranslation } from "../../context/_LocaleContext";
import { AppText as Text } from "@/components/ui/AppText";
import { useRouter } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { AppColors } from "../../../constants/colors";
import { ENTITY_LIST_CARD } from "../../../constants/mobileDetail";
import { formatCityLabel } from "../../../lib/cities";
import { resolveRemoteImageUrl } from "../../../lib/remoteImage";

/** İkon boyu = yazı boyu */
const META_ICON_SIZE = ENTITY_LIST_CARD.metaSize;
/** Feather ikonlarının iç boşluğu (3/24) telafi — ikon başlığın ilk harfiyle aynı çizgide */
const META_ICON_OFFSET = -(META_ICON_SIZE * 3) / 24;

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
  const { t } = useTranslation();
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
          flex: 1,
          zIndex: 1,
        }}
      >
        <View style={[styles.topBlock, { gap: ENTITY_LIST_CARD.lineGap }]}>
          <Text style={styles.title} numberOfLines={2}>
            {name}
          </Text>
          {categoryLabel ? (
            <View style={styles.metaRow}>
              <Feather
                name="tag"
                size={META_ICON_SIZE}
                color={AppColors.accent}
                style={styles.metaIcon}
              />
              <Text style={styles.meta} numberOfLines={1}>
                {categoryLabel}
              </Text>
            </View>
          ) : null}
          {cityLabel ? (
            <View style={styles.metaRow}>
              <Feather
                name="map-pin"
                size={META_ICON_SIZE}
                color={AppColors.accent}
                style={styles.metaIcon}
              />
              <Text style={styles.meta} numberOfLines={1}>
                {cityLabel}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.bottomBlock}>
          <View
            style={[
              styles.dividerWrap,
              {
                paddingTop: ENTITY_LIST_CARD.textPad,
                paddingBottom: ENTITY_LIST_CARD.textPad,
              },
            ]}
          >
            <View style={styles.divider} />
          </View>

          <View style={styles.footer}>
            <View style={styles.viewButton}>
              <Text style={styles.viewLabel} numberOfLines={1}>
                {t("view")}
              </Text>
              <Feather name="chevron-right" size={12} color="#FFFFFF" />
            </View>
          </View>
        </View>
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
    textTransform: "uppercase",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaIcon: {
    marginLeft: META_ICON_OFFSET,
  },
  meta: {
    flex: 1,
    minWidth: 0,
    fontFamily: "PoppinsRegular",
    fontSize: ENTITY_LIST_CARD.metaSize,
    color: "#4B5563",
  },
  topBlock: {
    flexShrink: 0,
    minWidth: 0,
  },
  bottomBlock: {
    marginTop: "auto",
    flexShrink: 0,
  },
  /** Çizgi üst/alt = kenar padding */
  dividerWrap: {
    flexShrink: 0,
  },
  divider: {
    height: 1,
    backgroundColor: "#EDEDED",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: AppColors.accent,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  viewLabel: {
    color: "#FFFFFF",
    fontFamily: "PoppinsBold",
    fontSize: ENTITY_LIST_CARD.metaSize,
    lineHeight: Math.round(ENTITY_LIST_CARD.metaSize * 1.3),
    includeFontPadding: false,
  },
});
