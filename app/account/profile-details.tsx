import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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
import { useIsTablet } from "../../lib/responsive";
import {
  isRegisterCitySelectable,
  denormalizeCityForDisplay,
  normalizeCityForFirestore,
  REGISTER_CITIES_BY_COUNTRY,
  REGISTER_COUNTRY_OPTIONS,
  REGISTER_DAY_OPTIONS,
  REGISTER_GENDER_OPTIONS,
  REGISTER_MONTH_OPTIONS,
  REGISTER_YEAR_OPTIONS,
} from "../../lib/registerOptions";
import { fetchUserById, updateUser } from "../../lib/users";
import { AppText as Text } from "@/components/ui/AppText";

type ModalKey = "country" | "city" | "gender" | "dob" | null;

type FormState = {
  name: string;
  surname: string;
  email: string;
  mobile: string;
  country: string;
  city: string;
  gender: string;
  dob: string;
};

function FieldCard({
  label,
  value,
  onChangeText,
  editable = true,
  isTablet,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  editable?: boolean;
  isTablet: boolean;
  keyboardType?: "default" | "phone-pad" | "email-address";
}) {
  return (
    <View style={[styles.fieldCard, isTablet && styles.fieldCardTablet]}>
      <Text style={[styles.fieldLabel, isTablet && styles.fieldLabelTablet]}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        keyboardType={keyboardType}
        placeholderTextColor="rgba(52, 61, 72, 0.45)"
        style={[
          styles.fieldInput,
          isTablet && styles.fieldInputTablet,
          !editable && styles.fieldInputReadonly,
        ]}
      />
    </View>
  );
}

function SelectCard({
  label,
  valueLabel,
  onPress,
  isTablet,
}: {
  label: string;
  valueLabel: string;
  onPress: () => void;
  isTablet: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.fieldCard, isTablet && styles.fieldCardTablet]}
    >
      <Text style={[styles.fieldLabel, isTablet && styles.fieldLabelTablet]}>
        {label}
      </Text>
      <View style={styles.selectRow}>
        <Text
          style={[
            styles.selectValue,
            isTablet && styles.selectValueTablet,
            !valueLabel && styles.selectPlaceholder,
          ]}
          numberOfLines={1}
        >
          {valueLabel || "—"}
        </Text>
        <Ionicons name="chevron-down" size={18} color={AppColors.cardText} />
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileDetailsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { user, refreshUser } = useAuth();
  useRequireAuth("/account/profile-details");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ModalKey>(null);
  const [dobDraft, setDobDraft] = useState({ day: "", month: "", year: "" });
  const [form, setForm] = useState<FormState>({
    name: "",
    surname: "",
    email: "",
    mobile: "",
    country: "",
    city: "",
    gender: "",
    dob: "",
  });

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const profile = await fetchUserById(user.id);
      if (!profile) {
        setError(t("profileLoadError"));
        return;
      }
      const country = profile.country ?? "";
      const cityRaw = profile.city ?? "";
      setForm({
        name: profile.name ?? "",
        surname: profile.surname ?? "",
        email: profile.email ?? user.email ?? "",
        mobile: profile.mobile ?? user.phoneNumber ?? "",
        country,
        city: denormalizeCityForDisplay(country, cityRaw),
        gender: (profile.gender ?? "").toLowerCase(),
        dob: profile.dob ?? "",
      });
    } catch {
      setError(t("profileLoadError"));
    } finally {
      setLoading(false);
    }
  }, [t, user?.email, user?.id, user?.phoneNumber]);

  useEffect(() => {
    void load();
  }, [load]);

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
    setSuccess(null);
  }, []);

  const cityOptions = REGISTER_CITIES_BY_COUNTRY[form.country] || [];
  const citySelectable = isRegisterCitySelectable(form.country);

  const countryLabel =
    REGISTER_COUNTRY_OPTIONS.find((c) => c.code === form.country)?.label ??
    form.country;
  const genderLabel =
    REGISTER_GENDER_OPTIONS.find((g) => g.value === form.gender)?.label ??
    form.gender;
  const dobLabel = form.dob
    ? form.dob.split("-").reverse().join(".")
    : "";

  const modalOptions = useMemo(() => {
    if (activeModal === "country") {
      return REGISTER_COUNTRY_OPTIONS.map((c) => ({
        id: c.code,
        label: c.label,
      }));
    }
    if (activeModal === "city") {
      return cityOptions.map((c) => ({ id: c, label: c }));
    }
    if (activeModal === "gender") {
      return REGISTER_GENDER_OPTIONS.map((g) => ({
        id: g.value,
        label: g.label,
      }));
    }
    return [];
  }, [activeModal, cityOptions]);

  const onSave = useCallback(async () => {
    if (!user?.id || saving) return;
    const name = form.name.trim();
    const surname = form.surname.trim();
    if (name.length < 2 || surname.length < 2 || !form.country || !form.gender || !form.dob) {
      setError(t("profileFormIncomplete"));
      return;
    }
    if (citySelectable && !form.city.trim()) {
      setError(t("profileFormIncomplete"));
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateUser(user.id, {
        name,
        surname,
        gender: form.gender,
        city: normalizeCityForFirestore(form.country, form.city.trim()),
        country: form.country,
        dob: form.dob,
      });
      await refreshUser();
      const profile = await fetchUserById(user.id);
      if (profile) {
        const country = profile.country ?? "";
        const cityRaw = profile.city ?? "";
        setForm({
          name: profile.name ?? "",
          surname: profile.surname ?? "",
          email: profile.email ?? user.email ?? "",
          mobile: profile.mobile ?? user.phoneNumber ?? "",
          country,
          city: denormalizeCityForDisplay(country, cityRaw),
          gender: (profile.gender ?? "").toLowerCase(),
          dob: profile.dob ?? "",
        });
      }
      setSuccess(t("profileUpdateSuccess"));
    } catch {
      setError(t("profileUpdateFailed"));
    } finally {
      setSaving(false);
    }
  }, [citySelectable, form, refreshUser, saving, t, user?.email, user?.id, user?.phoneNumber]);

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 2 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={AppColors.cardText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("profileDetails")}</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={AppColors.accent} />
        </View>
      ) : (
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
              label={t("name")}
              value={form.name}
              onChangeText={(v) => setField("name", v)}
              isTablet={isTablet}
            />
            <FieldCard
              label={t("surname")}
              value={form.surname}
              onChangeText={(v) => setField("surname", v)}
              isTablet={isTablet}
            />
            <FieldCard
              label={t("email")}
              value={form.email}
              editable={false}
              isTablet={isTablet}
              keyboardType="email-address"
            />
            <FieldCard
              label={t("phoneLabel")}
              value={form.mobile}
              editable={false}
              isTablet={isTablet}
              keyboardType="phone-pad"
            />
            <SelectCard
              label={t("gender")}
              valueLabel={genderLabel}
              onPress={() => setActiveModal("gender")}
              isTablet={isTablet}
            />
            <SelectCard
              label={t("country")}
              valueLabel={countryLabel}
              onPress={() => setActiveModal("country")}
              isTablet={isTablet}
            />
            {citySelectable ? (
              <SelectCard
                label={t("city")}
                valueLabel={form.city}
                onPress={() => setActiveModal("city")}
                isTablet={isTablet}
              />
            ) : null}
            <SelectCard
              label={t("dob")}
              valueLabel={dobLabel}
              onPress={() => {
                const [y = "", m = "", d = ""] = form.dob.split("-");
                setDobDraft({ year: y, month: m, day: d });
                setActiveModal("dob");
              }}
              isTablet={isTablet}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {success ? <Text style={styles.successText}>{success}</Text> : null}

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              disabled={saving}
              onPress={() => void onSave()}
              activeOpacity={0.9}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>{t("updateProfileDetails")}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      <Modal
        visible={activeModal != null && activeModal !== "dob"}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setActiveModal(null)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>
              {activeModal === "country"
                ? t("country")
                : activeModal === "city"
                  ? t("city")
                  : t("gender")}
            </Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {modalOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={styles.modalOption}
                  onPress={() => {
                    if (activeModal === "country") {
                      setField("country", opt.id);
                      setField("city", "");
                    } else if (activeModal === "city") {
                      setField("city", opt.id);
                    } else if (activeModal === "gender") {
                      setField("gender", opt.id);
                    }
                    setActiveModal(null);
                  }}
                >
                  <Text style={styles.modalOptionText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={activeModal === "dob"}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setActiveModal(null)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>{t("dob")}</Text>
            <View style={styles.dobRow}>
              <ScrollView style={styles.dobCol} nestedScrollEnabled>
                {REGISTER_DAY_OPTIONS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.dobItem,
                      dobDraft.day === d && styles.dobItemActive,
                    ]}
                    onPress={() => setDobDraft((p) => ({ ...p, day: d }))}
                  >
                    <Text style={styles.dobItemText}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <ScrollView style={styles.dobCol} nestedScrollEnabled>
                {REGISTER_MONTH_OPTIONS.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.dobItem,
                      dobDraft.month === m && styles.dobItemActive,
                    ]}
                    onPress={() => setDobDraft((p) => ({ ...p, month: m }))}
                  >
                    <Text style={styles.dobItemText}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <ScrollView style={styles.dobCol} nestedScrollEnabled>
                {REGISTER_YEAR_OPTIONS.map((y) => (
                  <TouchableOpacity
                    key={y}
                    style={[
                      styles.dobItem,
                      dobDraft.year === y && styles.dobItemActive,
                    ]}
                    onPress={() => setDobDraft((p) => ({ ...p, year: y }))}
                  >
                    <Text style={styles.dobItemText}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => {
                if (dobDraft.year && dobDraft.month && dobDraft.day) {
                  setField(
                    "dob",
                    `${dobDraft.year}-${dobDraft.month}-${dobDraft.day}`,
                  );
                }
                setActiveModal(null);
              }}
            >
              <Text style={styles.saveBtnText}>{t("ok")}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  fieldInputReadonly: { color: "#6B7280" },
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  selectValue: {
    flex: 1,
    fontFamily: "PoppinsRegular",
    fontSize: 15,
    color: AppColors.heading,
  },
  selectValueTablet: { fontSize: 16 },
  selectPlaceholder: { color: "#A0A8B0" },
  saveBtn: {
    marginTop: 8,
    height: 48,
    borderRadius: 10,
    backgroundColor: AppColors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: { opacity: 0.7 },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: "70%",
  },
  modalTitle: {
    fontFamily: "PoppinsSemiBold",
    fontSize: 16,
    color: AppColors.heading,
    marginBottom: 10,
  },
  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  modalOptionText: {
    fontFamily: "PoppinsRegular",
    fontSize: 15,
    color: AppColors.heading,
  },
  dobRow: { flexDirection: "row", gap: 8, height: 220, marginBottom: 12 },
  dobCol: { flex: 1 },
  dobItem: {
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  dobItemActive: { backgroundColor: "#FCE7F3" },
  dobItemText: {
    fontFamily: "PoppinsRegular",
    fontSize: 14,
    color: AppColors.heading,
  },
});
