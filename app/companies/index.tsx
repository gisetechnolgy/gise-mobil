import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { RemoteCardImage } from "../components/RemoteCardImage";
import { AppColors } from "../../constants/colors";
import { useTranslation } from "../context/LocaleContext";
import { appRefreshControl } from "../../lib/appRefreshControl";
import { formatCityLabel } from "../../lib/cities";
import { useIsTablet } from "../../lib/responsive";
import { resolveRemoteImageUrl } from "../../lib/remoteImage";
import { AppText as Text } from "@/components/ui/AppText";
import {
  fetchCompaniesSorted,
  companyImageCacheKey,
  type CompanyItem,
} from "../../lib/companies";

const COMPANY_CARD_IMAGE_WIDTH = { phone: 88, tablet: 104 };
const COMPANY_CARD_MIN_HEIGHT = { phone: 88, tablet: 100 };

function CompaniesToolbar({
  searchQuery,
  onSearchChange,
  isTablet,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  isTablet: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={[styles.toolbar, isTablet && styles.toolbarTablet]}>
      <View style={[styles.searchRow, isTablet && styles.searchRowTablet]}>
        <Ionicons name="search" size={20} color="rgba(52,61,72,0.55)" />
        <TextInput
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder={t("companiesSearchPlaceholder")}
          placeholderTextColor="rgba(52,61,72,0.45)"
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.searchInput, isTablet && styles.searchInputTablet]}
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity
            onPress={() => onSearchChange("")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="close-circle"
              size={20}
              color="rgba(52,61,72,0.45)"
            />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export default function CompaniesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const isTablet = useIsTablet();
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCompanies = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await fetchCompaniesSorted();
      setCompanies(data);
    } catch {
      setError(t("companiesLoadError"));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadCompanies({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadCompanies]);

  const filteredCompanies = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return companies;
    return companies.filter((company) => {
      const haystack = [
        company.name,
        formatCityLabel(company.city),
        company.address ?? "",
        company.email ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [companies, searchQuery]);

  const contentStyle = {
    paddingHorizontal: isTablet ? 26 : 20,
    paddingTop: isTablet ? 12 : 10,
    gap: isTablet ? 16 : 12,
    paddingBottom: isTablet ? 150 : 120,
    flexGrow: 1,
  };

  const refreshCtrl = appRefreshControl(refreshing, onRefresh);
  const hasActiveFilters = !!searchQuery.trim();

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />
      <View style={[styles.header, isTablet && styles.headerTablet]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, isTablet && styles.backBtnTablet]}
        >
          <Ionicons
            name="chevron-back"
            size={isTablet ? 26 : 22}
            color={AppColors.cardText}
          />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, isTablet && styles.pageTitleTablet]}>
          {t("companies")}
        </Text>
        <View style={[styles.backBtn, isTablet && styles.backBtnTablet]} />
      </View>

      <CompaniesToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isTablet={isTablet}
      />

      {loading ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={contentStyle}
          refreshControl={refreshCtrl}
        >
          {Array.from({ length: 5 }).map((_, idx) => (
            <View key={`company-skeleton-${idx}`} style={styles.companyCard}>
              <View
                style={[
                  styles.skeletonImage,
                  {
                    width: isTablet
                      ? COMPANY_CARD_IMAGE_WIDTH.tablet
                      : COMPANY_CARD_IMAGE_WIDTH.phone,
                    minHeight: isTablet
                      ? COMPANY_CARD_MIN_HEIGHT.tablet
                      : COMPANY_CARD_MIN_HEIGHT.phone,
                  },
                ]}
              />
              <View
                style={[styles.companyCardBody, isTablet && styles.companyCardBodyTablet]}
              >
                <View className="h-4 w-[72%] rounded bg-[#E8ECF0]" />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : error ? (
        <ScrollView
          contentContainerStyle={[contentStyle, { justifyContent: "center" }]}
          refreshControl={refreshCtrl}
        >
          <Text style={styles.errorText}>{error}</Text>
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={contentStyle}
          refreshControl={refreshCtrl}
          keyboardShouldPersistTaps="handled"
        >
          {filteredCompanies.length === 0 ? (
            <Text style={styles.emptyText}>
              {hasActiveFilters
                ? t("noCompaniesFilter")
                : t("noCompaniesEmpty")}
            </Text>
          ) : (
            filteredCompanies.map((company) => {
              const imageWidth = isTablet
                ? COMPANY_CARD_IMAGE_WIDTH.tablet
                : COMPANY_CARD_IMAGE_WIDTH.phone;
              const cardMinHeight = isTablet
                ? COMPANY_CARD_MIN_HEIGHT.tablet
                : COMPANY_CARD_MIN_HEIGHT.phone;
              const logoUri = resolveRemoteImageUrl(
                company.logoUrl,
                companyImageCacheKey(company),
              );

              return (
                <TouchableOpacity
                  key={company.id}
                  style={styles.companyCard}
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push(`/companies/${company.id}` as import("expo-router").Href)
                  }
                >
                  <RemoteCardImage
                    uri={logoUri}
                    recyclingKey={company.id}
                    contentFit="cover"
                    style={[
                      styles.companyCardImage,
                      { width: imageWidth, minHeight: cardMinHeight },
                    ]}
                    fallbackSource={require("../../assets/images/img-placeholder.jpg")}
                  />
                  <View
                    style={[
                      styles.companyCardBody,
                      isTablet && styles.companyCardBodyTablet,
                    ]}
                  >
                    <Text
                      style={[styles.title, isTablet && styles.titleTablet]}
                      numberOfLines={2}
                    >
                      {company.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  headerTablet: {
    minHeight: 56,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  backBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnTablet: {
    width: 38,
    height: 38,
  },
  pageTitle: {
    color: "#000000",
    fontSize: 20,
    fontFamily: "PoppinsSemiBold",
  },
  pageTitleTablet: {
    fontSize: 26,
  },
  toolbar: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
  },
  toolbarTablet: {
    paddingHorizontal: 26,
    paddingBottom: 14,
    gap: 12,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: AppColors.cardBg,
  },
  searchRowTablet: {
    paddingVertical: 14,
    borderRadius: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: AppColors.cardText,
    padding: 0,
  },
  searchInputTablet: {
    fontSize: 17,
  },
  companyCard: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 12,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "stretch",
  },
  companyCardImage: {
    alignSelf: "stretch",
    backgroundColor: "#E8ECF0",
  },
  skeletonImage: {
    alignSelf: "stretch",
    backgroundColor: "#E8ECF0",
  },
  companyCardBody: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  companyCardBodyTablet: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  title: {
    color: AppColors.heading,
    fontSize: 16,
    fontFamily: "PoppinsSemiBold",
    lineHeight: 20,
  },
  titleTablet: {
    fontSize: 18,
    lineHeight: 22,
  },
  emptyText: {
    color: AppColors.cardText,
    fontSize: 14,
    fontFamily: "PoppinsRegular",
    opacity: 0.8,
    textAlign: "center",
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 14,
    textAlign: "center",
  },
});
