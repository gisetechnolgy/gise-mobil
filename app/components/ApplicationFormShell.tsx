import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import type { ReactNode } from "react";
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
import { StatusBar } from "expo-status-bar";
import { AppColors } from "../../constants/colors";
import { tabBarScrollPadding } from "../../constants/tabBar";
import type { MediaUpload } from "../../lib/applications";
import { useIsTablet } from "../../lib/responsive";
import { AppText as Text } from "@/components/ui/AppText";

export function FormSectionTitle({ title }: { title: string }) {
  const isTablet = useIsTablet();
  return (
    <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet]}>
      {title}
    </Text>
  );
}

export function InfoNote({ children }: { children: string }) {
  return (
    <View style={styles.infoNote}>
      <Text style={styles.infoNoteText}>{children}</Text>
    </View>
  );
}

export function ImageFileField({
  label,
  hint,
  value,
  onChange,
  onError,
  pickLabel,
  clearLabel,
  sizeErrorLabel,
}: {
  label: string;
  hint?: string;
  value: MediaUpload;
  onChange: (next: MediaUpload) => void;
  onError?: (message: string) => void;
  pickLabel: string;
  clearLabel: string;
  sizeErrorLabel: string;
}) {
  const isTablet = useIsTablet();

  const pick = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      onError?.(sizeErrorLabel);
      return;
    }
    if (!asset.base64) {
      onError?.(sizeErrorLabel);
      return;
    }
    const mime = asset.mimeType || "image/jpeg";
    onChange({
      src: `data:${mime};base64,${asset.base64}`,
      title: asset.fileName || "image.jpg",
    });
  };

  return (
    <View style={[styles.fieldCard, isTablet && styles.fieldCardTablet]}>
      <Text style={[styles.fieldLabel, isTablet && styles.fieldLabelTablet]}>
        {label}
      </Text>
      {hint ? <Text style={styles.hintText}>{hint}</Text> : null}
      {value?.src ? (
        <Image source={{ uri: value.src }} style={styles.imagePreview} contentFit="cover" />
      ) : null}
      <View style={styles.imageActions}>
        <TouchableOpacity onPress={() => void pick()} style={styles.imageBtn} activeOpacity={0.8}>
          <Text style={styles.imageBtnText}>{pickLabel}</Text>
        </TouchableOpacity>
        {value ? (
          <TouchableOpacity
            onPress={() => onChange(null)}
            style={[styles.imageBtn, styles.imageBtnClear]}
            activeOpacity={0.8}
          >
            <Text style={styles.imageBtnClearText}>{clearLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  autoCapitalize,
  error,
  editable = true,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad" | "url";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  error?: boolean;
  editable?: boolean;
  maxLength?: number;
}) {
  const isTablet = useIsTablet();
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
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        editable={editable}
        maxLength={maxLength}
        style={[
          styles.fieldInput,
          isTablet && styles.fieldInputTablet,
          multiline && styles.fieldMultiline,
          error && styles.fieldError,
          !editable && styles.fieldReadonly,
        ]}
      />
    </View>
  );
}

export function ChipSelect({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const isTablet = useIsTablet();
  return (
    <View style={[styles.fieldCard, isTablet && styles.fieldCardTablet]}>
      <Text style={[styles.fieldLabel, isTablet && styles.fieldLabelTablet]}>
        {label}
      </Text>
      <View style={styles.chipWrap}>
        {options.map((opt) => {
          const on = selected.includes(opt.id);
          return (
            <TouchableOpacity
              key={opt.id}
              onPress={() => onToggle(opt.id)}
              activeOpacity={0.75}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function SingleSelect({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  error?: boolean;
}) {
  const isTablet = useIsTablet();
  return (
    <View
      style={[
        styles.fieldCard,
        isTablet && styles.fieldCardTablet,
        error && styles.fieldErrorCard,
      ]}
    >
      <Text style={[styles.fieldLabel, isTablet && styles.fieldLabelTablet]}>
        {label}
      </Text>
      <View style={styles.chipWrap}>
        {options.map((opt) => {
          const on = value === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              onPress={() => onChange(opt.id)}
              activeOpacity={0.75}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

type ShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  submitting?: boolean;
  canSubmit?: boolean;
  submitLabel: string;
  onSubmit: () => void;
  error?: string | null;
  success?: string | null;
};

export function ApplicationFormShell({
  title,
  subtitle,
  children,
  submitting,
  canSubmit = true,
  submitLabel,
  onSubmit,
  error,
  success,
}: ShellProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();

  return (
    <SafeAreaView edges={["left", "right"]} style={styles.safe}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 2 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={AppColors.cardText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
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
            { paddingBottom: tabBarScrollPadding(isTablet, insets.bottom) },
          ]}
        >
          {subtitle ? (
            <Text style={[styles.subtitle, isTablet && styles.subtitleTablet]}>
              {subtitle}
            </Text>
          ) : null}
          {children}
          {error ? <Text style={styles.feedbackError}>{error}</Text> : null}
          {success ? (
            <Text style={styles.feedbackSuccess}>{success}</Text>
          ) : null}
          <TouchableOpacity
            onPress={onSubmit}
            disabled={!canSubmit || submitting}
            activeOpacity={0.85}
            style={[
              styles.submitBtn,
              isTablet && styles.submitBtnTablet,
              (!canSubmit || submitting) && styles.submitBtnDisabled,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={AppColors.navText} />
            ) : (
              <Text
                style={[styles.submitText, isTablet && styles.submitTextTablet]}
              >
                {submitLabel}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(52, 61, 72, 0.12)",
    backgroundColor: AppColors.cardBg,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: AppColors.cardText,
    fontFamily: "PoppinsSemiBold",
    fontSize: 17,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 12,
  },
  contentTablet: {
    paddingHorizontal: 32,
    maxWidth: 720,
    alignSelf: "center",
    width: "100%",
    gap: 16,
  },
  subtitle: {
    color: "rgba(52, 61, 72, 0.7)",
    fontFamily: "PoppinsRegular",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  subtitleTablet: { fontSize: 16, lineHeight: 22 },
  sectionTitle: {
    color: AppColors.heading,
    fontFamily: "PoppinsBold",
    fontSize: 16,
    marginTop: 8,
    marginBottom: 2,
  },
  sectionTitleTablet: { fontSize: 18, marginTop: 12 },
  infoNote: {
    backgroundColor: "#F0F2F5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoNoteText: {
    color: "rgba(52, 61, 72, 0.75)",
    fontFamily: "PoppinsRegular",
    fontSize: 13,
    lineHeight: 18,
  },
  hintText: {
    color: "rgba(52, 61, 72, 0.55)",
    fontFamily: "PoppinsRegular",
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  imagePreview: {
    width: "100%",
    height: 140,
    borderRadius: 12,
    backgroundColor: "#EEF0F3",
    marginBottom: 10,
  },
  imageActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 4 },
  imageBtn: {
    borderRadius: 10,
    backgroundColor: AppColors.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  imageBtnText: {
    color: AppColors.navText,
    fontFamily: "PoppinsSemiBold",
    fontSize: 13,
  },
  imageBtnClear: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(52, 61, 72, 0.25)",
  },
  imageBtnClearText: {
    color: AppColors.cardText,
    fontFamily: "PoppinsMedium",
    fontSize: 13,
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
  fieldLabelTablet: { fontSize: 17 },
  fieldInput: {
    color: AppColors.cardText,
    fontFamily: "PoppinsRegular",
    fontSize: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(52, 61, 72, 0.2)",
  },
  fieldInputTablet: { fontSize: 16, paddingVertical: 10 },
  fieldMultiline: {
    minHeight: 88,
    textAlignVertical: "top",
    borderBottomWidth: 0,
  },
  fieldError: { borderBottomColor: "#B42318" },
  fieldReadonly: { opacity: 0.72 },
  fieldErrorCard: { borderWidth: 1, borderColor: "#B42318" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 6 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(52, 61, 72, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F7F8FA",
  },
  chipOn: {
    borderColor: AppColors.accent,
    backgroundColor: "rgba(174, 37, 109, 0.1)",
  },
  chipText: {
    color: AppColors.cardText,
    fontFamily: "PoppinsMedium",
    fontSize: 13,
  },
  chipTextOn: { color: AppColors.accent },
  submitBtn: {
    marginTop: 8,
    backgroundColor: AppColors.accent,
    borderRadius: 14,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  submitBtnTablet: { minHeight: 60, borderRadius: 16 },
  submitBtnDisabled: { opacity: 0.55 },
  submitText: {
    color: AppColors.navText,
    fontFamily: "PoppinsSemiBold",
    fontSize: 16,
  },
  submitTextTablet: { fontSize: 18 },
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
