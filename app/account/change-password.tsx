import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColors } from "../../constants/colors";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/_LocaleContext";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { ApiError } from "../../lib/api";
import { useIsTablet } from "../../lib/responsive";
import { changePassword } from "../../lib/users";
import { AppText as Text } from "@/components/ui/AppText";

function FieldCard({
  label,
  value,
  onChangeText,
  isTablet,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  isTablet: boolean;
}) {
  return (
    <View style={[styles.fieldCard, isTablet && styles.fieldCardTablet]}>
      <Text style={[styles.fieldLabel, isTablet && styles.fieldLabelTablet]}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor="rgba(52, 61, 72, 0.45)"
        style={[styles.fieldInput, isTablet && styles.fieldInputTablet]}
      />
    </View>
  );
}

export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  useAuth();
  useRequireAuth("/account/change-password");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const disabled =
    !oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim() || saving;

  const onSubmit = useCallback(async () => {
    if (disabled) return;
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError(t("passwordsNotMatching"));
      return;
    }
    if (newPassword.length < 6 || newPassword.length > 25) {
      setError(t("passwordLimit"));
      return;
    }

    setSaving(true);
    try {
      await changePassword({
        oldPassword,
        newPassword,
      });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(t("passwordChangeSuccess"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "";
      if (msg.includes("incorrect-password")) {
        setError(t("incorrectPassword"));
      } else if (msg.toLowerCase().includes("weak")) {
        setError(t("passwordLimit"));
      } else {
        setError(t("passwordChangeFailed"));
      }
    } finally {
      setSaving(false);
    }
  }, [confirmPassword, disabled, newPassword, oldPassword, t]);

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 2 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={AppColors.cardText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("changePassword")}</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FieldCard
            label={t("currentPassword")}
            value={oldPassword}
            onChangeText={(v) => {
              setOldPassword(v);
              setError(null);
              setSuccess(null);
            }}
            isTablet={isTablet}
          />
          <FieldCard
            label={t("newPassword")}
            value={newPassword}
            onChangeText={(v) => {
              setNewPassword(v);
              setError(null);
              setSuccess(null);
            }}
            isTablet={isTablet}
          />
          <FieldCard
            label={t("newPasswordRepeat")}
            value={confirmPassword}
            onChangeText={(v) => {
              setConfirmPassword(v);
              setError(null);
              setSuccess(null);
            }}
            isTablet={isTablet}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {success ? <Text style={styles.successText}>{success}</Text> : null}

          <TouchableOpacity
            style={[styles.saveBtn, disabled && styles.saveBtnDisabled]}
            disabled={disabled}
            onPress={() => void onSubmit()}
            activeOpacity={0.9}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>{t("changePassword")}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "PoppinsSemiBold",
    fontSize: 17,
    color: AppColors.heading,
  },
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },
  fieldCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#EBEBEB",
  },
  fieldCardTablet: { paddingVertical: 14 },
  fieldLabel: {
    fontFamily: "PoppinsMedium",
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 6,
  },
  fieldLabelTablet: { fontSize: 13 },
  fieldInput: {
    fontFamily: "PoppinsRegular",
    fontSize: 15,
    color: AppColors.heading,
    padding: 0,
  },
  fieldInputTablet: { fontSize: 16 },
  saveBtn: {
    marginTop: 8,
    height: 48,
    borderRadius: 10,
    backgroundColor: AppColors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: { opacity: 0.55 },
  saveBtnText: {
    fontFamily: "PoppinsSemiBold",
    fontSize: 15,
    color: "#fff",
  },
  errorText: {
    fontFamily: "PoppinsRegular",
    fontSize: 13,
    color: "#DC2626",
  },
  successText: {
    fontFamily: "PoppinsRegular",
    fontSize: 13,
    color: "#16A34A",
  },
});
