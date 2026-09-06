import { useRouter } from "expo-router";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import type {
  SectionLoadingProps,
  SectionReloadHandle,
} from "../../lib/sectionReload";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import { AppColors } from "../../constants/colors";
import { homeSectionTitleStyle } from "../../constants/homeTypography";
import { fetchBrowsableCategories, type CategoryItem } from "../../lib/definitions";
import { useIsTablet } from "../../lib/responsive";
import { AppText as Text } from "@/components/ui/AppText";

const CategoryChips = forwardRef<
  SectionReloadHandle,
  SectionLoadingProps
>(function CategoryChips({ onLoadingChange }, ref) {
  const router = useRouter();
  const isTablet = useIsTablet();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (refresh?: boolean) => {
    setLoading(true);
    try {
      const data = await fetchBrowsableCategories(refresh === true);
      setCategories(data);
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      reload: (opts) => load(opts?.refresh),
    }),
    [load],
  );

  const onSelect = useCallback(
    (categoryId: string) => {
      router.push({
        pathname: "/(tabs)/events",
        params: { category: categoryId },
      });
    },
    [router],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  if (categories.length === 0) return null;

  return (
    <View style={{ marginTop: 12, marginBottom: 4 }}>
      <Text
        style={{
          paddingHorizontal: 20,
          marginBottom: 10,
          ...homeSectionTitleStyle(isTablet),
        }}
      >
        Etkinlik Kategorileri
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          gap: isTablet ? 10 : 8,
        }}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            onPress={() => onSelect(cat.value)}
            activeOpacity={0.85}
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: isTablet ? 14 : 12,
              paddingVertical: isTablet ? 11 : 9,
              borderRadius: 10,
              backgroundColor: AppColors.cardBg,
              borderWidth: 1,
              borderColor: "rgba(52, 61, 72, 0.1)",
            }}
          >
            <Text
              style={{
                fontFamily: "PoppinsSemiBold",
                color: AppColors.cardText,
                fontSize: isTablet ? 15 : 13,
              }}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View
        style={{
          marginTop: isTablet ? 16 : 14,
          marginHorizontal: 20,
          height: StyleSheet.hairlineWidth,
          backgroundColor: "rgba(52, 61, 72, 0.12)",
        }}
      />
    </View>
  );
});

export default CategoryChips;
