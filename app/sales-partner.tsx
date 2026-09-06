import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter, type Href } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppColors } from "../constants/colors";
import { useAuth } from "./context/AuthContext";
import { useTranslation } from "./context/LocaleContext";
import { saveAffiliateForm } from "../lib/affiliateForm";
import { GISE_WEB_URL } from "../lib/appConfig";
import { useIsTablet } from "../lib/responsive";
import { AppText as Text } from "@/components/ui/AppText";

const MORE_INFO_URL = `${GISE_WEB_URL}/gise-influencer-sss-min.jpeg`;

type FormState = {
  instagram: string;
  tiktok: string;
  twitter: string;
  facebook: string;
};

const INITIAL_FORM: FormState = {
  instagram: "",
  tiktok: "",
  twitter: "",
  facebook: "",
};

function splitFullName(fullName: string): { name: string; surname: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { name: "", surname: "" };
  if (parts.length === 1) return { name: parts[0], surname: "" };
  return {
    name: parts[0],
    surname: parts.slice(1).join(" "),
  };
}

function FieldCard({
  label,
  placeholder,
  value,
  onChangeText,
  isTablet,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
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
        placeholder={placeholder}
        placeholderTextColor="rgba(52, 61, 72, 0.45)"
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.fieldInput, isTablet && styles.fieldInputTablet]}
      />
    </View>
  );
}

export default function SalesPartnerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const isTablet = useIsTablet();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSubmit =
    form.instagram.trim() !== "" ||
    form.tiktok.trim() !== "" ||
    form.twitter.trim() !== "" ||
    form.facebook.trim() !== "";

  const updateField = useCallback((key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
    setSuccess(null);
  }, []);

  const onSubmit = useCallback(async () => {
    if (!canSubmit || submitting) return;

    if (!isAuthenticated || !user) {
      router.push({
        pathname: "/(auth)/login",
        params: { redirect: "/sales-partner" },
      } as unknown as Href);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const { name, surname } = splitFullName(user.fullName);

    try {
      await saveAffiliateForm({
        facebook: form.facebook.trim(),
        twitter: form.twitter.trim(),
        instagram: form.instagram.trim(),
        tiktok: form.tiktok.trim(),
        user: user.id,
        name,
        surname,
        isChecked: false,
      });
      setSuccess(t("salesPartnerSuccess"));
      setForm(INITIAL_FORM);
      setTimeout(() => setSuccess(null), 2500);
    } catch {
      setError(t("salesPartnerFailed"));
      setTimeout(() => setError(null), 2500);
    } finally {
      setSubmitting(false);
    }
  }, [
    canSubmit,
    form,
    isAuthenticated,
    router,
    submitting,
    t,
    user,
  ]);

  const openMoreInfo = useCallback(() => {
    Linking.openURL(MORE_INFO_URL);
  }, []);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      <View style={[styles.header, isTablet && styles.headerTablet]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={AppColors.cardText} />
        </TouchableOpacity>
        <Text style={[styles.title, isTablet && styles.titleTablet]}>
          {t("salesPartnerTitle")}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            isTablet && styles.contentTablet,
          ]}
        >
          <Text style={[styles.subtitle, isTablet && styles.subtitleTablet]}>
            {t("salesPartnerSubtitle")}
          </Text>

          <FieldCard
            label="Instagram"
            placeholder={t("salesPartnerInstagramPlaceholder")}
            value={form.instagram}
            onChangeText={(v) => updateField("instagram", v)}
            isTablet={isTablet}
          />
          <FieldCard
            label="Tiktok"
            placeholder={t("salesPartnerTiktokPlaceholder")}
            value={form.tiktok}
            onChangeText={(v) => updateField("tiktok", v)}
            isTablet={isTablet}
          />
          <FieldCard
            label="Twitter"
            placeholder={t("salesPartnerTwitterPlaceholder")}
            value={form.twitter}
            onChangeText={(v) => updateField("twitter", v)}
            isTablet={isTablet}
          />
          <FieldCard
            label="Facebook"
            placeholder={t("salesPartnerFacebookPlaceholder")}
            value={form.facebook}
            onChangeText={(v) => updateField("facebook", v)}
            isTablet={isTablet}
          />

          {error ? (
            <Text style={styles.feedbackError}>{error}</Text>
          ) : null}
          {success ? (
            <Text style={styles.feedbackSuccess}>{success}</Text>
          ) : null}

          <TouchableOpacity
            onPress={() => {
              void onSubmit();
            }}
            disabled={!canSubmit || submitting || authLoading}
            activeOpacity={0.85}
            style={[
              styles.submitBtn,
              isTablet && styles.submitBtnTablet,
              (!canSubmit || submitting || authLoading) && styles.submitBtnDisabled,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={AppColors.navText} />
            ) : (
              <Text style={[styles.submitText, isTablet && styles.submitTextTablet]}>
                {t("salesPartnerSubmit")}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={[styles.orText, isTablet && styles.orTextTablet]}>
              {t("salesPartnerOr")}
            </Text>
            <View style={styles.orLine} />
          </View>

          <TouchableOpacity
            onPress={openMoreInfo}
            activeOpacity={0.85}
            style={[styles.outlineBtn, isTablet && styles.outlineBtnTablet]}
          >
            <Text
              style={[styles.outlineText, isTablet && styles.outlineTextTablet]}
            >
              {t("salesPartnerMoreInfo")}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerTablet: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: AppColors.heading,
    fontFamily: "PoppinsBold",
    fontSize: 18,
  },
  titleTablet: {
    fontSize: 24,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 40,
    gap: 14,
  },
  contentTablet: {
    paddingHorizontal: 40,
    paddingBottom: 60,
    gap: 18,
  },
  subtitle: {
    color: "rgba(52, 61, 72, 0.65)",
    fontFamily: "PoppinsRegular",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 4,
  },
  subtitleTablet: {
    fontSize: 16,
    lineHeight: 22,
  },
  fieldCard: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  fieldCardTablet: {
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  fieldLabel: {
    color: AppColors.heading,
    fontFamily: "PoppinsBold",
    fontSize: 15,
    marginBottom: 6,
  },
  fieldLabelTablet: {
    fontSize: 18,
  },
  fieldInput: {
    color: AppColors.cardText,
    fontFamily: "PoppinsRegular",
    fontSize: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(52, 61, 72, 0.2)",
  },
  fieldInputTablet: {
    fontSize: 16,
    paddingVertical: 10,
  },
  submitBtn: {
    marginTop: 8,
    backgroundColor: AppColors.accent,
    borderRadius: 14,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  submitBtnTablet: {
    minHeight: 60,
    borderRadius: 16,
  },
  submitBtnDisabled: {
    opacity: 0.55,
  },
  submitText: {
    color: AppColors.navText,
    fontFamily: "PoppinsSemiBold",
    fontSize: 16,
  },
  submitTextTablet: {
    fontSize: 18,
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(52, 61, 72, 0.25)",
  },
  orText: {
    color: "rgba(52, 61, 72, 0.45)",
    fontFamily: "PoppinsMedium",
    fontSize: 13,
  },
  orTextTablet: {
    fontSize: 15,
  },
  outlineBtn: {
    borderRadius: 14,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: AppColors.accent,
    backgroundColor: "rgba(174, 37, 109, 0.04)",
  },
  outlineBtnTablet: {
    minHeight: 60,
    borderRadius: 16,
  },
  outlineText: {
    color: AppColors.accent,
    fontFamily: "PoppinsSemiBold",
    fontSize: 14,
    textAlign: "center",
  },
  outlineTextTablet: {
    fontSize: 16,
  },
  feedbackError: {
    color: "#B42318",
    fontFamily: "PoppinsMedium",
    fontSize: 13,
    textAlign: "center",
  },
  feedbackSuccess: {
    color: "#027A48",
    fontFamily: "PoppinsMedium",
    fontSize: 13,
    textAlign: "center",
  },
});
