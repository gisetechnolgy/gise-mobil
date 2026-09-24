import { Link, router, useLocalSearchParams, type Href } from "expo-router";
import Constants from "expo-constants";
import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import AuthScreenLayout from "../components/AuthScreenLayout";
import LanguageToggle from "../components/LanguageToggle";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/_LocaleContext";
import { AppColors } from "../../constants/colors";
import { ApiError } from "../../lib/api";
import { AppText as Text } from "@/components/ui/AppText";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLogin(
  email: string,
  password: string,
  t: ReturnType<typeof useTranslation>["t"],
): string | null {
  const trimmedEmail = email.trim();
  if (!trimmedEmail && !password) {
    return t("loginErrorBoth");
  }
  if (!trimmedEmail) {
    return t("loginErrorEmail");
  }
  if (!EMAIL_RE.test(trimmedEmail)) {
    return t("loginErrorEmailInvalid");
  }
  if (!password) {
    return t("loginErrorPassword");
  }
  return null;
}

export default function LoginScreen() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const { redirect } = useLocalSearchParams<{ redirect?: string | string[] }>();
  const redirectPath = typeof redirect === "string" ? redirect : redirect?.[0];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (submitting) return;

    const validationError = validateLogin(email, password, t);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace((redirectPath as Href) || ("/(tabs)" as Href));
    } catch (e) {
      // Backend: signup yapıldı ama verify-email tamamlanmadı → kullanıcıyı
      // sessizce verify ekranına yönlendir (kupon disiplini: verify zorunlu).
      if (e instanceof ApiError && e.status === 403) {
        const data = e.data as { code?: string; userId?: string } | undefined;
        if (data?.code === "EMAIL_NOT_VERIFIED" && data.userId) {
          router.replace({
            pathname: "/(auth)/verify-email",
            params: {
              userId: data.userId,
              email: email.trim().toLowerCase(),
            },
          } as unknown as Href);
          return;
        }
      }
      if (e instanceof ApiError && e.status === 401) {
        setError(t("loginErrorInvalid"));
      } else {
        const msg =
          e instanceof Error ? e.message : t("loginErrorGeneric");
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const clearError = () => {
    if (error) setError(null);
  };

  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <AuthScreenLayout
      rightHeaderAction={<LanguageToggle />}
      contentStyle={styles.content}
    >
      <View style={styles.formBlock}>
        <TextInput
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            clearError();
          }}
          placeholder={t("email")}
          placeholderTextColor="#8E8E93"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!submitting}
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            clearError();
          }}
          placeholder={t("password")}
          placeholderTextColor="#8E8E93"
          secureTextEntry
          autoCapitalize="none"
          editable={!submitting}
          style={styles.input}
        />

        <TouchableOpacity
          onPress={() => void onSubmit()}
          disabled={submitting}
          activeOpacity={1}
          style={styles.primaryBtn}
        >
          {submitting ? (
            <ActivityIndicator color={AppColors.navText} />
          ) : (
            <Text style={styles.primaryBtnText}>{t("login")}</Text>
          )}
        </TouchableOpacity>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Link href={"/(auth)/forgot-password" as Href} asChild>
          <TouchableOpacity style={styles.forgotBtn}>
            <Text style={styles.forgotText}>{t("forgotPassword")}</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <View style={styles.bottomBlock}>
        <Link href={"/(auth)/register" as Href} asChild>
          <TouchableOpacity style={styles.outlineBtn}>
            <Text style={styles.outlineBtnText}>{t("signupPrompt")}</Text>
          </TouchableOpacity>
        </Link>

        <TouchableOpacity
          style={styles.guestBtn}
          onPress={() => router.replace("/(tabs)" as Href)}
        >
          <Text style={styles.guestText}>{t("continueGuest")}</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>v{version}</Text>
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "space-between",
  },
  formBlock: {
    width: "100%",
    gap: 12,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#1c1c1e",
  },
  primaryBtn: {
    backgroundColor: AppColors.navBg,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  primaryBtnText: {
    color: AppColors.navText,
    fontSize: 15,
    fontFamily: "PoppinsSemiBold",
    textAlign: "center",
    paddingHorizontal: 8,
  },
  forgotBtn: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
  forgotText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "PoppinsSemiBold",
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.5)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
  },
  errorText: {
    color: "#fecaca",
    fontSize: 13,
  },
  bottomBlock: {
    width: "100%",
    alignItems: "center",
    gap: 12,
    marginTop: 32,
  },
  outlineBtn: {
    width: "100%",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.7)",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  outlineBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "PoppinsSemiBold",
  },
  guestBtn: {
    paddingVertical: 4,
  },
  guestText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "PoppinsMedium",
  },
  versionText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginTop: 4,
  },
});
