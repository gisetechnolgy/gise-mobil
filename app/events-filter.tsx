import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { AppColors } from "../constants/colors";
import { CITY_OPTIONS } from "../lib/cities";
import {
  buildEventFilterParams,
  EVENT_DATE_OPTIONS,
  getEventFilterKey,
  parseEventFilterParams,
  type EventFilterParams,
} from "../lib/eventFilters";
import {
  fetchBrowsableCategories,
  fetchSubcategories,
  type CategoryItem,
  type SubcategoryItem,
} from "../lib/definitions";
import { useIsTablet } from "../lib/responsive";
import { fetchVenues, type VenueItem } from "../lib/venues";
import { AppText as Text } from "@/components/ui/AppText";

type PickerKey = "category" | "subcategory" | "city" | "venue" | "date";

type PickerItem = { id: string; label: string };

function FilterField({
  label,
  value,
  placeholder,
  onPress,
  isTablet,
}: {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
  isTablet: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.fieldCard, isTablet && styles.fieldCardTablet]}
    >
      <Text style={[styles.fieldCardLabel, isTablet && styles.fieldCardLabelTablet]}>
        {label}
      </Text>
      <Text
        style={[
          value ? styles.fieldCardValue : styles.fieldCardPlaceholder,
          isTablet && styles.fieldCardValueTablet,
        ]}
        numberOfLines={2}
      >
        {value || placeholder}
      </Text>
    </TouchableOpacity>
  );
}

function FilterPickerSheet({
  visible,
  title,
  items,
  draftId,
  onChangeDraft,
  onConfirm,
  isTablet,
  bottomInset,
}: {
  visible: boolean;
  title: string;
  items: PickerItem[];
  draftId: string;
  onChangeDraft: (id: string) => void;
  onConfirm: () => void;
  isTablet: boolean;
  bottomInset: number;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onConfirm}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.pickerSafe}>
        <View style={[styles.pickerHeader, isTablet && styles.pickerHeaderTablet]}>
          <Text style={[styles.pickerTitle, isTablet && styles.pickerTitleTablet]}>
            {title}
          </Text>
        </View>

        <ScrollView
          style={styles.pickerScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.pickerList,
            isTablet && styles.pickerListTablet,
          ]}
        >
          {items.map((item) => {
            const active = draftId === item.id;
            return (
              <TouchableOpacity
                key={item.id || "all"}
                activeOpacity={0.85}
                onPress={() => onChangeDraft(item.id)}
                style={[
                  styles.pickerItem,
                  isTablet && styles.pickerItemTablet,
                  active && styles.pickerItemActive,
                ]}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    isTablet && styles.pickerItemTextTablet,
                    active && styles.pickerItemTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View
          style={[
            styles.pickerFooter,
            isTablet && styles.pickerFooterTablet,
            { paddingBottom: Math.max(bottomInset, 16) },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={onConfirm}
            style={[styles.pickerConfirmButton, isTablet && styles.pickerConfirmButtonTablet]}
          >
            <Text
              style={[
                styles.pickerConfirmText,
                isTablet && styles.pickerConfirmTextTablet,
              ]}
            >
              Tamam
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export default function EventsFilterScreen() {
  const router = useRouter();
  const isTablet = useIsTablet();
  const insets = useSafeAreaInsets();
  const rawParams = useLocalSearchParams<Record<string, string | string[]>>();
  const filterKey = getEventFilterKey(rawParams);
  const initialFilters = useMemo(
    () => parseEventFilterParams(rawParams),
    [filterKey],
  );

  const [filters, setFilters] = useState<EventFilterParams>(initialFilters);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryItem[]>([]);
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [picker, setPicker] = useState<PickerKey | null>(null);
  const [draftId, setDraftId] = useState("");

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      try {
        const [cats, subs, venueRows] = await Promise.all([
          fetchBrowsableCategories(),
          fetchSubcategories(),
          fetchVenues(filters.city ? { city: filters.city } : undefined),
        ]);
        if (!active) return;
        setCategories(cats);
        setSubcategories(subs);
        setVenues(venueRows);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [filters.city]);

  const categoryLabel = useMemo(
    () => categories.find((c) => c.value === filters.category)?.label ?? "",
    [categories, filters.category],
  );

  const availableSubcategories = useMemo(
    () =>
      filters.category
        ? subcategories.filter((s) => s.categoryId === filters.category)
        : [],
    [filters.category, subcategories],
  );

  const subcategoryLabel = useMemo(
    () =>
      availableSubcategories.find((s) => s.value === filters.subcategory)
        ?.label ?? "",
    [availableSubcategories, filters.subcategory],
  );

  const cityLabel = useMemo(
    () => CITY_OPTIONS.find((c) => c.value === filters.city)?.label ?? "",
    [filters.city],
  );

  const venueLabel = useMemo(
    () => venues.find((v) => v.id === filters.venue)?.name ?? "",
    [filters.venue, venues],
  );

  const dateLabel = useMemo(
    () =>
      EVENT_DATE_OPTIONS.find((d) => d.value === (filters.date ?? ""))?.label ??
      "",
    [filters.date],
  );

  const openPicker = useCallback(
    (key: PickerKey) => {
      const currentId =
        key === "category"
          ? filters.category ?? ""
          : key === "subcategory"
            ? filters.subcategory ?? ""
            : key === "city"
              ? filters.city ?? ""
              : key === "venue"
                ? filters.venue ?? ""
                : filters.date ?? "";
      setDraftId(currentId);
      setPicker(key);
    },
    [filters],
  );

  const pickerItems = useMemo((): PickerItem[] => {
    switch (picker) {
      case "category":
        return [
          { id: "", label: "Tümü" },
          ...categories.map((c) => ({ id: c.value, label: c.label })),
        ];
      case "subcategory":
        return [
          { id: "", label: "Tümü" },
          ...availableSubcategories.map((s) => ({
            id: s.value,
            label: s.label,
          })),
        ];
      case "city":
        return [
          { id: "", label: "Tümü" },
          ...CITY_OPTIONS.map((c) => ({ id: c.value, label: c.label })),
        ];
      case "venue":
        return [
          { id: "", label: "Tümü" },
          ...venues.map((v) => ({ id: v.id, label: v.name })),
        ];
      case "date":
        return EVENT_DATE_OPTIONS.map((d) => ({ id: d.value, label: d.label }));
      default:
        return [];
    }
  }, [picker, categories, availableSubcategories, venues]);

  const pickerTitle = useMemo(() => {
    switch (picker) {
      case "category":
        return "Kategori";
      case "subcategory":
        return "Alt Kategori";
      case "city":
        return "Şehir";
      case "venue":
        return "Mekan";
      case "date":
        return "Tarih";
      default:
        return "";
    }
  }, [picker]);

  const confirmPicker = useCallback(() => {
    if (!picker) return;

    setFilters((prev) => {
      switch (picker) {
        case "category":
          return {
            ...prev,
            category: draftId || undefined,
            subcategory: undefined,
          };
        case "subcategory":
          return { ...prev, subcategory: draftId || undefined };
        case "city":
          return {
            ...prev,
            city: draftId || undefined,
            venue: undefined,
          };
        case "venue":
          return { ...prev, venue: draftId || undefined };
        case "date":
          return {
            ...prev,
            date: draftId
              ? (draftId as EventFilterParams["date"])
              : undefined,
          };
        default:
          return prev;
      }
    });
    setPicker(null);
  }, [draftId, picker]);

  const onApply = useCallback(() => {
    router.replace({
      pathname: "/(tabs)/events",
      params: buildEventFilterParams(filters),
    });
  }, [filters, router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
        <View style={[styles.header, isTablet && styles.headerTablet]}>
          <Text style={[styles.title, isTablet && styles.titleTablet]}>
            Filtrele
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={AppColors.accent} />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.content,
              isTablet && styles.contentTablet,
              { paddingBottom: 120 + insets.bottom },
            ]}
          >
            <FilterField
              label="Kategori"
              value={categoryLabel}
              placeholder="Tümü"
              onPress={() => openPicker("category")}
              isTablet={isTablet}
            />

            {availableSubcategories.length > 0 ? (
              <FilterField
                label="Alt Kategori"
                value={subcategoryLabel}
                placeholder="Tümü"
                onPress={() => openPicker("subcategory")}
                isTablet={isTablet}
              />
            ) : null}

            <FilterField
              label="Şehir"
              value={cityLabel}
              placeholder="Tümü"
              onPress={() => openPicker("city")}
              isTablet={isTablet}
            />

            <FilterField
              label="Mekan"
              value={venueLabel}
              placeholder="Tümü"
              onPress={() => openPicker("venue")}
              isTablet={isTablet}
            />

            <FilterField
              label="Tarih"
              value={dateLabel}
              placeholder="Tümü"
              onPress={() => openPicker("date")}
              isTablet={isTablet}
            />

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() =>
                setFilters((prev) => ({
                  ...prev,
                  onlyCampaigns: !prev.onlyCampaigns,
                }))
              }
              style={[styles.checkboxCard, isTablet && styles.checkboxCardTablet]}
            >
              <Text
                style={[
                  styles.checkboxLabel,
                  isTablet && styles.checkboxLabelTablet,
                ]}
              >
                Özel fırsatları göster
              </Text>
              <View
                style={[
                  styles.checkbox,
                  filters.onlyCampaigns && styles.checkboxChecked,
                ]}
              >
                {filters.onlyCampaigns ? (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                ) : null}
              </View>
            </TouchableOpacity>
          </ScrollView>
        )}

        <View
          style={[
            styles.footer,
            isTablet && styles.footerTablet,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.back()}
            style={styles.closeButton}
          >
            <Text
              style={[
                styles.closeButtonText,
                isTablet && styles.closeButtonTextTablet,
              ]}
            >
              Kapat
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onApply}
            style={[styles.searchButton, isTablet && styles.searchButtonTablet]}
          >
            <Text
              style={[
                styles.searchButtonText,
                isTablet && styles.searchButtonTextTablet,
              ]}
            >
              Ara
            </Text>
          </TouchableOpacity>
        </View>

        <FilterPickerSheet
          visible={picker != null}
          title={pickerTitle}
          items={pickerItems}
          draftId={draftId}
          onChangeDraft={setDraftId}
          onConfirm={confirmPicker}
          isTablet={isTablet}
          bottomInset={insets.bottom}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    alignItems: "center",
  },
  headerTablet: {
    paddingHorizontal: 26,
    paddingBottom: 16,
  },
  title: {
    color: AppColors.cardText,
    fontSize: 20,
    fontFamily: "PoppinsSemiBold",
  },
  titleTablet: {
    fontSize: 26,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 12,
  },
  contentTablet: {
    paddingHorizontal: 26,
    gap: 14,
  },
  fieldCard: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 78,
    justifyContent: "center",
    gap: 6,
  },
  fieldCardTablet: {
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    minHeight: 88,
  },
  fieldCardLabel: {
    color: "rgba(52, 61, 72, 0.55)",
    fontSize: 13,
    fontFamily: "PoppinsMedium",
  },
  fieldCardLabelTablet: {
    fontSize: 14,
  },
  fieldCardValue: {
    color: AppColors.heading,
    fontSize: 16,
    fontFamily: "PoppinsBold",
    lineHeight: 22,
  },
  fieldCardValueTablet: {
    fontSize: 18,
    lineHeight: 24,
  },
  fieldCardPlaceholder: {
    color: AppColors.heading,
    fontSize: 16,
    fontFamily: "PoppinsBold",
    lineHeight: 22,
  },
  checkboxCard: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  checkboxCardTablet: {
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
    minHeight: 62,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: AppColors.accent,
    backgroundColor: AppColors.cardBg,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: AppColors.accent,
    borderColor: AppColors.accent,
  },
  checkboxLabel: {
    flex: 1,
    color: AppColors.heading,
    fontSize: 15,
    fontFamily: "PoppinsSemiBold",
  },
  checkboxLabelTablet: {
    fontSize: 17,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.background,
    borderTopWidth: 1,
    borderTopColor: "rgba(52, 61, 72, 0.08)",
  },
  footerTablet: {
    paddingHorizontal: 26,
  },
  closeButton: {
    flex: 0.4,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  closeButtonText: {
    color: AppColors.accent,
    fontSize: 16,
    fontFamily: "PoppinsSemiBold",
  },
  closeButtonTextTablet: {
    fontSize: 18,
  },
  searchButton: {
    flex: 0.6,
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: AppColors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  searchButtonTablet: {
    minHeight: 44,
    borderRadius: 10,
  },
  searchButtonText: {
    color: AppColors.navText,
    fontSize: 16,
    fontFamily: "PoppinsBold",
  },
  searchButtonTextTablet: {
    fontSize: 18,
  },
  pickerSafe: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  pickerHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    alignItems: "center",
  },
  pickerHeaderTablet: {
    paddingHorizontal: 26,
    paddingBottom: 24,
  },
  pickerTitle: {
    color: AppColors.heading,
    fontSize: 20,
    fontFamily: "PoppinsBold",
  },
  pickerTitleTablet: {
    fontSize: 24,
  },
  pickerScroll: {
    flex: 1,
  },
  pickerList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  pickerListTablet: {
    paddingHorizontal: 26,
    gap: 12,
  },
  pickerItem: {
    minHeight: 44,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: AppColors.cardBg,
    justifyContent: "center",
  },
  pickerItemTablet: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  pickerItemActive: {
    backgroundColor: AppColors.accent,
  },
  pickerItemText: {
    color: AppColors.heading,
    fontSize: 16,
    fontFamily: "PoppinsSemiBold",
  },
  pickerItemTextTablet: {
    fontSize: 18,
  },
  pickerItemTextActive: {
    color: AppColors.navText,
    fontFamily: "PoppinsSemiBold",
  },
  pickerFooter: {
    paddingHorizontal: 20,
    paddingTop: 8,
    backgroundColor: AppColors.background,
  },
  pickerFooterTablet: {
    paddingHorizontal: 26,
  },
  pickerConfirmButton: {
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: AppColors.secondaryButton,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerConfirmButtonTablet: {
    minHeight: 44,
    borderRadius: 10,
  },
  pickerConfirmText: {
    color: AppColors.navText,
    fontSize: 16,
    fontFamily: "PoppinsBold",
  },
  pickerConfirmTextTablet: {
    fontSize: 18,
  },
});
