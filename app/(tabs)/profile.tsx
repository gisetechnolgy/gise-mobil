import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { AppColors } from "../../constants/colors";
import LanguagePicker from "../components/LanguagePicker";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/_LocaleContext";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { useIsTablet } from "../../lib/responsive";
import { readFollowedCompanyIds } from "../../lib/followedCompanies";
import { readFollowedVenueIds } from "../../lib/followedVenues";
import { readFavouriteEventIds } from "../../lib/favouriteEvents";
import { api } from "../../lib/api";
import { AppText as Text } from "@/components/ui/AppText";
import {
  disablePushNotifications,
  enablePushNotifications,
  readPushNotificationsEnabled,
} from "../../lib/push-notifications";
import { getLoginMode, type WebLoginMode } from "../../lib/loginSettings";

async function openOtherApps() {
  type SsoApp = { id?: string; name?: string; targetUrl: string };
  const apps = await api.get<SsoApp[]>("/auth/sso/apps", { auth: true });
  if (!apps?.length) return;

  const open = async (targetUrl: string) => {
    const res = await api.post<{ ssoLink?: string }>(
      "/auth/sso/generate",
      { targetUrl },
      { auth: true },
    );
    if (res?.ssoLink) {
      await Linking.openURL(res.ssoLink);
    }
  };

  if (apps.length === 1) {
    await open(apps[0].targetUrl);
    return;
  }

  Alert.alert(
    "Apps",
    undefined,
    [
      ...apps.map((app) => ({
        text: app.name || app.targetUrl,
        onPress: () => {
          void open(app.targetUrl);
        },
      })),
      { text: "Cancel", style: "cancel" as const },
    ],
  );
}

/** Floating tab bar için alt boşluk */
const TAB_BAR_SCROLL_BOTTOM = { phone: 100, tablet: 120 } as const;

type IconName = keyof typeof Ionicons.glyphMap;

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { user, logout, refreshUser, isLoading, isAuthenticated } = useAuth();
  useRequireAuth("/(tabs)/profile");
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [followedVenueCount, setFollowedVenueCount] = useState(0);
  const [followedCompanyCount, setFollowedCompanyCount] = useState(0);
  const [favouriteEventCount, setFavouriteEventCount] = useState(0);
  const [loginMode, setLoginMode] = useState<WebLoginMode | null>(null);

  useEffect(() => {
    void getLoginMode().then(setLoginMode);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshUser();
      void (async () => {
        const enabled = await readPushNotificationsEnabled();
        setNotificationsEnabled(enabled);
      })();
      void (async () => {
        if (!user?.id) {
          setFollowedVenueCount(0);
          setFollowedCompanyCount(0);
          setFavouriteEventCount(0);
          return;
        }
        const [venueIds, companyIds, favouriteIds] = await Promise.all([
          readFollowedVenueIds(user.id),
          readFollowedCompanyIds(user.id),
          readFavouriteEventIds(user.id),
        ]);
        setFollowedVenueCount(venueIds.length);
        setFollowedCompanyCount(companyIds.length);
        setFavouriteEventCount(favouriteIds.length);
      })();
    }, [refreshUser, user?.id]),
  );

  if (isLoading || !isAuthenticated || !user) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator color={AppColors.accent} />
      </View>
    );
  }

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  const onToggleNotifications = async (next: boolean) => {
    if (notificationBusy) return;
    setNotificationBusy(true);
    try {
      if (next) {
        const ok = await enablePushNotifications();
        setNotificationsEnabled(ok);
        if (!ok) {
          Alert.alert(t("notifications"), t("notificationsPermissionDenied"), [
            { text: t("cancel"), style: "cancel" },
            {
              text: t("openSettings"),
              onPress: () => {
                void Linking.openSettings();
              },
            },
          ]);
        }
      } else {
        await disablePushNotifications();
        setNotificationsEnabled(false);
      }
    } finally {
      setNotificationBusy(false);
    }
  };

  const accountItems = useMemo(() => {
    const items: { icon: IconName; label: string; onPress: () => void }[] = [
      {
        icon: "person-outline",
        label: t("profileDetails"),
        onPress: () => router.push("/account/profile-details" as Href),
      },
      {
        icon: "qr-code-outline",
        label: t("myTickets"),
        onPress: () => router.push("/tickets"),
      },
      {
        icon: "card-outline",
        label: t("paymentDetails"),
        onPress: () => router.push("/account/payment-details" as Href),
      },
    ];
    // Login v2 (OTP): şifre yok → Şifre Değiştir menüde görünmez
    if (loginMode !== "otp") {
      items.push({
        icon: "lock-closed-outline",
        label: t("changePassword"),
        onPress: () => router.push("/account/change-password" as Href),
      });
    }
    items.push({
      icon: "apps-outline",
      label: t("otherApps"),
      onPress: () => void openOtherApps(),
    });
    return items;
  }, [loginMode, router, t]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <View style={[styles.header, isTablet && styles.headerTablet]}>
        <Text style={[styles.pageTitle, isTablet && styles.pageTitleTablet]}>
          {t("myAccount")}
        </Text>
        <LanguagePicker />
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isTablet && styles.scrollTablet,
          {
            paddingBottom:
              (isTablet
                ? TAB_BAR_SCROLL_BOTTOM.tablet
                : TAB_BAR_SCROLL_BOTTOM.phone) + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.userCard, isTablet && styles.userCardTablet]}>
          <View style={[styles.avatar, isTablet && styles.avatarTablet]}>
            <Ionicons name="person" size={isTablet ? 34 : 29} color="#000" />
          </View>
          <View style={styles.userInfo}>
            <View style={styles.userNameRow}>
              <Text
                style={[styles.userName, isTablet && styles.userNameTablet]}
                numberOfLines={1}
              >
                {user.fullName || t("defaultUserName")}
              </Text>
              {user.isEmailVerified ? (
                <Ionicons
                  name="checkmark-circle"
                  size={isTablet ? 20 : 16}
                  color="#16a34a"
                />
              ) : null}
            </View>
            <Text
              style={[styles.userEmail, isTablet && styles.userEmailTablet]}
              numberOfLines={1}
            >
              {user.email}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/account/profile-details" as Href)}
            style={styles.editBtn}
            hitSlop={8}
            accessibilityLabel={t("profileDetails")}
          >
            <Ionicons name="create-outline" size={18} color={AppColors.cardText} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsSection}>
          <Text
            style={[styles.statsSectionTitle, isTablet && styles.statsSectionTitleTablet]}
          >
            {t("favouritesAndFollowing")}
          </Text>
          <View style={styles.statsRow}>
            <StatItem
              count={favouriteEventCount}
              label={t("events")}
              onPress={() => router.push("/favourite-events" as Href)}
              isTablet={isTablet}
            />
            <View style={styles.statDivider} />
            <StatItem
              count={followedVenueCount}
              label={t("venues")}
              onPress={() => router.push("/followed-venues" as Href)}
              isTablet={isTablet}
            />
            <View style={styles.statDivider} />
            <StatItem
              count={followedCompanyCount}
              label={t("companies")}
              onPress={() => router.push("/followed-companies" as Href)}
              isTablet={isTablet}
            />
          </View>
        </View>

        <View style={styles.group}>
          {accountItems.map((item, i) => (
            <Fragment key={item.label}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <MenuRow
                icon={item.icon}
                label={item.label}
                onPress={item.onPress}
                isTablet={isTablet}
              />
            </Fragment>
          ))}
        </View>

        <View style={styles.group}>
          <View style={[styles.row, isTablet && styles.rowTablet]}>
            <RowIcon name="notifications-outline" />
            <Text style={[styles.rowLabel, isTablet && styles.rowLabelTablet]}>
              {t("notifications")}
            </Text>
            {notificationBusy ? (
              <ActivityIndicator size="small" color={AppColors.cardText} />
            ) : (
              <Switch
                value={notificationsEnabled}
                onValueChange={(v) => void onToggleNotifications(v)}
                trackColor={{ false: "rgba(52,61,72,0.25)", true: AppColors.accent }}
                thumbColor="#fff"
                ios_backgroundColor="rgba(52,61,72,0.25)"
              />
            )}
          </View>
        </View>

        <View style={styles.group}>
          <MenuRow
            icon="log-out-outline"
            label={t("logout")}
            onPress={() => setShowLogoutConfirm(true)}
            isTablet={isTablet}
            hideChevron
          />
        </View>
      </ScrollView>

      <Modal
        transparent
        animationType="fade"
        visible={showLogoutConfirm}
        onRequestClose={() => {
          if (!loggingOut) setShowLogoutConfirm(false);
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            if (!loggingOut) setShowLogoutConfirm(false);
          }}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{t("logout")}</Text>
            <Text style={styles.modalText}>
              {t("logoutConfirmText")}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => setShowLogoutConfirm(false)}
                disabled={loggingOut}
              >
                <Text style={styles.modalSecondaryText}>{t("no")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => {
                  void onLogout();
                }}
                disabled={loggingOut}
              >
                {loggingOut ? (
                  <ActivityIndicator size="small" color={AppColors.navText} />
                ) : (
                  <Text style={styles.modalPrimaryText}>{t("yes")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

function RowIcon({ name, danger }: { name: IconName; danger?: boolean }) {
  return (
    <View style={styles.rowIcon}>
      <Ionicons
        name={name}
        size={22}
        color={danger ? "#c53030" : AppColors.cardText}
      />
    </View>
  );
}

function StatItem({
  count,
  label,
  onPress,
  isTablet,
}: {
  count: number;
  label: string;
  onPress: () => void;
  isTablet: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.statItem, isTablet && styles.statItemTablet]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.statCount, isTablet && styles.statCountTablet]}>
        {count}
      </Text>
      <Text
        style={[styles.statLabel, isTablet && styles.statLabelTablet]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  danger = false,
  hideChevron = false,
  isTablet = false,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  danger?: boolean;
  hideChevron?: boolean;
  isTablet?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.row, isTablet && styles.rowTablet]}
      activeOpacity={0.7}
    >
      <RowIcon name={icon} danger={danger} />
      <Text
        style={[
          styles.rowLabel,
          isTablet && styles.rowLabelTablet,
          danger && styles.rowLabelDanger,
        ]}
      >
        {label}
      </Text>
      {hideChevron ? null : (
        <Ionicons
          name="chevron-forward"
          size={isTablet ? 20 : 16}
          color="rgba(52,61,72,0.45)"
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.background },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTablet: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 10,
  },
  loaderWrap: {
    flex: 1,
    backgroundColor: AppColors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: 14,
    paddingTop: 6,
    gap: 14,
  },
  scrollTablet: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 16,
  },
  pageTitle: {
    color: "#000000",
    fontSize: 22,
    fontFamily: "PoppinsSemiBold",
  },
  pageTitleTablet: {
    fontSize: 26,
  },

  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.cardBg,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  userCardTablet: {
    borderRadius: 18,
    padding: 18,
    gap: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F9C55D",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTablet: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  userInfo: { flex: 1, minWidth: 0, gap: 2 },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  userName: {
    flexShrink: 1,
    color: AppColors.cardText,
    fontSize: 17,
    fontFamily: "PoppinsSemiBold",
  },
  userNameTablet: { fontSize: 20 },
  userEmail: { color: "rgba(52,61,72,0.7)", fontSize: 14 },
  userEmailTablet: { fontSize: 15 },
  editBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(52,61,72,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  statsSection: {
    gap: 8,
  },
  statsSectionTitle: {
    fontFamily: "PoppinsSemiBold",
    fontSize: 14,
    color: AppColors.heading,
    paddingHorizontal: 2,
  },
  statsSectionTitleTablet: {
    fontSize: 16,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.cardBg,
    borderRadius: 14,
  },
  statItem: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  statItemTablet: {
    paddingVertical: 16,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: "rgba(52,61,72,0.2)",
  },
  statCount: {
    color: AppColors.cardText,
    fontSize: 21,
    fontFamily: "PoppinsSemiBold",
  },
  statCountTablet: { fontSize: 24 },
  statLabel: {
    color: "rgba(52,61,72,0.7)",
    fontSize: 12.5,
    fontFamily: "PoppinsMedium",
  },
  statLabelTablet: { fontSize: 13 },

  group: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 14,
    overflow: "hidden",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(52,61,72,0.15)",
    marginLeft: 52,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  rowTablet: {
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  rowIcon: {
    width: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    flex: 1,
    color: AppColors.cardText,
    fontSize: 16,
    fontFamily: "PoppinsMedium",
  },
  rowLabelTablet: { fontSize: 18 },
  rowLabelDanger: { color: "#c53030" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 18, 30, 0.32)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: AppColors.cardBg,
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: {
    color: AppColors.cardText,
    fontSize: 18,
    fontFamily: "PoppinsBold",
  },
  modalText: {
    marginTop: 8,
    color: "rgba(25,58,88,0.8)",
    fontSize: 14,
    lineHeight: 20,
  },
  modalTextSuccess: {
    color: AppColors.cardText,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  modalSecondaryBtn: {
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(25,58,88,0.08)",
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSecondaryText: {
    color: AppColors.cardText,
    fontFamily: "PoppinsSemiBold",
  },
  modalPrimaryBtn: {
    height: 38,
    borderRadius: 10,
    backgroundColor: AppColors.navBg,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryText: {
    color: AppColors.navText,
    fontFamily: "PoppinsSemiBold",
  },
  modalOkBtn: {
    marginTop: 14,
    alignSelf: "center",
    height: 38,
    borderRadius: 10,
    backgroundColor: AppColors.navBg,
    minWidth: 96,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
