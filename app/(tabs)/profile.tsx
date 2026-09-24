import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
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
import LanguageToggle from "../components/LanguageToggle";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/_LocaleContext";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { useIsTablet } from "../../lib/responsive";
import { readFollowedCompanyIds } from "../../lib/followedCompanies";
import { readFollowedVenueIds } from "../../lib/followedVenues";
import { usesAdminModeToggle } from "../../lib/roles";
import { api } from "../../lib/api";
import { AppText as Text } from "@/components/ui/AppText";
import {
  disablePushNotifications,
  enablePushNotifications,
  readPushNotificationsEnabled,
} from "../../lib/push-notifications";

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

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { user, logout, refreshUser, isLoading, isAuthenticated, setManagerSaleMode } =
    useAuth();
  useRequireAuth("/(tabs)/profile");
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [saleModeLoading, setSaleModeLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [followedVenueCount, setFollowedVenueCount] = useState(0);
  const [followedCompanyCount, setFollowedCompanyCount] = useState(0);

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
          return;
        }
        const [venueIds, companyIds] = await Promise.all([
          readFollowedVenueIds(user.id),
          readFollowedCompanyIds(user.id),
        ]);
        setFollowedVenueCount(venueIds.length);
        setFollowedCompanyCount(companyIds.length);
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

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <View style={[styles.header, isTablet && styles.headerTablet]}>
        <LanguageToggle
          style={styles.headerLangBtn}
          textStyle={[styles.headerLang, isTablet && styles.headerLangTablet]}
        />
        <Text style={[styles.pageTitle, isTablet && styles.pageTitleTablet]}>
          {t("myAccount")}
        </Text>
        <TouchableOpacity
          onPress={() => setShowLogoutConfirm(true)}
          disabled={loggingOut}
          style={[
            styles.headerLogoutBtn,
            isTablet && styles.headerLogoutBtnTablet,
          ]}
          activeOpacity={0.8}
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color={AppColors.cardText} />
          ) : (
            <Ionicons
              name="log-out-outline"
              size={21}
              color={AppColors.cardText}
            />
          )}
        </TouchableOpacity>
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
            <Ionicons name="person" size={isTablet ? 34 : 28} color="#000" />
          </View>
          <View style={[styles.userInfo, isTablet && styles.userInfoTablet]}>
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
                  size={isTablet ? 22 : 18}
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
        </View>

        <View style={styles.followCardsRow}>
          <MiniStatCard
            label={t("venues")}
            value={`${followedVenueCount} ${t("followed")}`}
            onPress={() => router.push("/followed-venues" as import("expo-router").Href)}
            isTablet={isTablet}
          />
          <MiniStatCard
            label={t("companies")}
            value={`${followedCompanyCount} ${t("followed")}`}
            onPress={() => router.push("/followed-companies" as import("expo-router").Href)}
            isTablet={isTablet}
          />
        </View>

        {user.canEnterAdminMode ? (
          <View style={[styles.menu, isTablet && styles.menuTablet]}>
            <MenuItem
              label={
                user.isManagerSaleModeActive
                  ? t("exitAdminMode")
                  : t("enterAdminMode")
              }
              subtitle={t("adminModeSubtitle")}
              onPress={async () => {
                setSaleModeLoading(true);
                try {
                  const next = !user.isManagerSaleModeActive;
                  if (usesAdminModeToggle(user.crole)) {
                    await setManagerSaleMode(next);
                  }
                  if (next) {
                    router.push("/(admin-tabs)/events" as import("expo-router").Href);
                  } else {
                    router.replace("/(tabs)");
                  }
                } finally {
                  setSaleModeLoading(false);
                }
              }}
              isTablet={isTablet}
            />
          </View>
        ) : null}

        <View style={[styles.notificationCard, isTablet && styles.notificationCardTablet]}>
          <View style={styles.notificationMeta}>
            <Text style={[styles.itemTitle, isTablet && styles.itemTitleTablet]}>
              {t("notifications")}
            </Text>
            <Text style={[styles.itemSubtitle, isTablet && styles.itemSubtitleTablet]}>
              {t("notificationsSubtitle")}
            </Text>
          </View>
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

        <View style={[styles.menu, isTablet && styles.menuTablet]}>
          <MenuItem
            label={t("profileDetails")}
            subtitle={t("profileDetailsSubtitle")}
            onPress={() =>
              router.push("/account/profile-details" as import("expo-router").Href)
            }
            isTablet={isTablet}
          />
          <MenuItem
            label={t("otherApps")}
            subtitle={t("otherAppsSubtitle")}
            onPress={() => void openOtherApps()}
            isTablet={isTablet}
          />
          <MenuItem
            label={t("tickets")}
            subtitle={t("ticketsSubtitle")}
            onPress={() => router.push("/tickets")}
            isTablet={isTablet}
          />
          <MenuItem
            label={t("paymentDetails")}
            subtitle={t("paymentDetailsSubtitle")}
            onPress={() =>
              router.push("/account/payment-details" as import("expo-router").Href)
            }
            isTablet={isTablet}
          />
          <MenuItem
            label={t("changePassword")}
            subtitle={t("changePasswordSubtitle")}
            onPress={() =>
              router.push("/account/change-password" as import("expo-router").Href)
            }
            isTablet={isTablet}
          />
          <MenuItem
            label={t("deleteAccount")}
            subtitle={t("deleteAccountSubtitle")}
            onPress={() => setShowDeleteConfirm(true)}
            danger
            isTablet={isTablet}
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

      <Modal
        transparent
        animationType="fade"
        visible={showDeleteConfirm}
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDeleteConfirm(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{t("deleteAccountTitle")}</Text>
            <Text style={styles.modalText}>
              {t("deleteAccountConfirm")}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.modalSecondaryText}>{t("no")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => {
                  setShowDeleteConfirm(false);
                  setShowDeleteSuccess(true);
                }}
              >
                <Text style={styles.modalPrimaryText}>Evet</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={showDeleteSuccess}
        onRequestClose={() => setShowDeleteSuccess(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDeleteSuccess(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTextSuccess}>
              {t("deleteAccountSuccess")}
            </Text>
            <TouchableOpacity
              style={styles.modalOkBtn}
              onPress={() => setShowDeleteSuccess(false)}
            >
              <Text style={styles.modalPrimaryText}>{t("ok")}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function MiniStatCard({
  label,
  value,
  onPress,
  isTablet,
}: {
  label: string;
  value: string;
  onPress: () => void;
  isTablet: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.miniCard, isTablet && styles.miniCardTablet]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.miniCardTitle, isTablet && styles.miniCardTitleTablet]}>{label}</Text>
        <Text style={[styles.miniCardValue, isTablet && styles.miniCardValueTablet]}>{value}</Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={isTablet ? 24 : 18}
        color="rgba(52,61,72,0.8)"
      />
    </TouchableOpacity>
  );
}

function MenuItem({
  label,
  subtitle,
  onPress,
  danger = false,
  isTablet = false,
}: {
  label: string;
  subtitle: string;
  onPress?: () => void;
  danger?: boolean;
  isTablet?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.menuItem, isTablet && styles.menuItemTablet]}
      activeOpacity={0.85}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.itemTitle,
            isTablet && styles.itemTitleTablet,
            danger && styles.itemTitleDanger,
          ]}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.itemSubtitle,
            isTablet && styles.itemSubtitleTablet,
            danger && styles.itemSubtitleDanger,
          ]}
        >
          {subtitle}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={isTablet ? 24 : 18}
        color="rgba(52,61,72,0.8)"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.background },
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTablet: {
    paddingHorizontal: 22,
    paddingTop: 8,
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
    paddingBottom: 28,
    paddingTop: 6,
    gap: 14,
  },
  scrollTablet: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 38,
    gap: 16,
  },
  headerLangBtn: {
    width: 30,
    alignItems: "flex-start",
  },
  headerLang: {
    width: 30,
    color: AppColors.cardText,
    fontSize: 18,
    fontFamily: "PoppinsMedium",
  },
  headerLangTablet: {
    width: 38,
    fontSize: 20,
  },
  pageTitle: {
    color: "#000000",
    fontSize: 20,
    fontFamily: "PoppinsSemiBold",
  },
  pageTitleTablet: {
    fontSize: 26,
  },
  headerLogoutBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLogoutBtnTablet: {
    width: 38,
    height: 38,
  },

  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.cardBg,
    borderRadius: 10,
    padding: 14,
  },
  userCardTablet: {
    borderRadius: 16,
    padding: 18,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F9C55D",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTablet: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  userInfo: { marginLeft: 14, flex: 1, gap: 2 },
  userInfoTablet: { marginLeft: 18, gap: 3 },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  userName: { color: AppColors.cardText, fontSize: 16, fontFamily: "PoppinsBold" },
  userNameTablet: { fontSize: 20 },
  userEmail: { color: "rgba(52,61,72,0.75)", fontSize: 13 },
  userEmailTablet: { fontSize: 16 },
  followCardsRow: {
    flexDirection: "row",
    gap: 12,
  },
  miniCard: {
    flex: 1,
    backgroundColor: AppColors.cardBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  miniCardTablet: {
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  miniCardTitle: {
    color: AppColors.cardText,
    fontSize: 18,
    fontFamily: "PoppinsSemiBold",
  },
  miniCardTitleTablet: {
    fontSize: 22,
  },
  miniCardValue: {
    marginTop: 6,
    color: "rgba(52,61,72,0.75)",
    fontSize: 14,
  },
  miniCardValueTablet: {
    fontSize: 16,
  },

  menu: {
    gap: 12,
  },
  menuTablet: {
    gap: 14,
  },
  notificationCard: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  notificationCardTablet: {
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  notificationMeta: {
    flex: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.cardBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  menuItemTablet: {
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 12,
  },
  itemTitle: {
    color: AppColors.cardText,
    fontSize: 34 / 2,
    fontFamily: "PoppinsSemiBold",
  },
  itemTitleTablet: {
    fontSize: 22,
  },
  itemTitleDanger: {
    color: "#c53030",
  },
  itemSubtitle: {
    marginTop: 6,
    color: "rgba(52,61,72,0.72)",
    fontSize: 14,
  },
  itemSubtitleTablet: {
    fontSize: 16,
  },
  itemSubtitleDanger: {
    color: "rgba(52,61,72,0.72)",
  },
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
