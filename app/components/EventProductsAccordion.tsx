import { useCallback, useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppColors } from "../../constants/colors";
import {
  fetchEventProducts,
  type EventProductItem,
} from "../../lib/eventProducts";
import { useTranslation } from "../context/_LocaleContext";
import { AppText as Text } from "@/components/ui/AppText";

type Props = {
  eventId: string;
  isTablet?: boolean;
};

function ProductRow({
  product,
  isTablet,
  soldOutLabel,
}: {
  product: EventProductItem;
  isTablet?: boolean;
  soldOutLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const canExpand = product.description.length > 0;

  return (
    <View style={[styles.card, product.soldOut && styles.cardSoldOut]}>
      <TouchableOpacity
        activeOpacity={canExpand ? 0.85 : 1}
        disabled={!canExpand}
        onPress={() => setOpen((v) => !v)}
        style={styles.header}
      >
        <View style={styles.titleCol}>
          <Text
            style={[styles.title, isTablet && styles.titleTablet]}
            numberOfLines={2}
          >
            {product.title}
            {product.soldOut ? (
              <Text style={styles.soldOut}> {soldOutLabel}</Text>
            ) : null}
          </Text>
        </View>

        <View style={styles.rightCol}>
          {canExpand ? (
            <View style={styles.chevronWrap}>
              <Ionicons
                name={open ? "chevron-up" : "chevron-down"}
                size={isTablet ? 20 : 18}
                color={AppColors.cardText}
              />
            </View>
          ) : null}
          <Text
            style={[styles.price, isTablet && styles.priceTablet]}
            numberOfLines={1}
          >
            {product.priceLabel}
          </Text>
        </View>
      </TouchableOpacity>

      {canExpand && open ? (
        <View style={styles.details}>
          <Text style={[styles.description, isTablet && styles.descriptionTablet]}>
            {product.description}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function EventProductsAccordion({ eventId, isTablet }: Props) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<EventProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchEventProducts(eventId);
      setProducts(rows);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || products.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet]}>
        {t("ticketProducts")}
      </Text>
      <View style={styles.list}>
        {products.map((product) => (
          <ProductRow
            key={product.id}
            product={product}
            isTablet={isTablet}
            soldOutLabel={t("soldOut")}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    color: AppColors.heading,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 12,
  },
  sectionTitleTablet: {
    fontSize: 19,
  },
  list: {
    gap: 10,
  },
  card: {
    backgroundColor: "#F5F6F8",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  cardSoldOut: {
    opacity: 0.55,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  titleCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: AppColors.cardText,
    fontSize: 15,
    fontWeight: "700",
  },
  titleTablet: {
    fontSize: 16,
  },
  soldOut: {
    color: "#C62828",
    fontWeight: "500",
    fontSize: 13,
  },
  rightCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  price: {
    color: AppColors.cardText,
    fontSize: 15,
    fontWeight: "700",
  },
  priceTablet: {
    fontSize: 16,
  },
  details: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  description: {
    color: "#4B5563",
    fontSize: 14,
    lineHeight: 20,
  },
  descriptionTablet: {
    fontSize: 15,
    lineHeight: 22,
  },
});
