import { router, type Href } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/_LocaleContext";
import { AppColors } from "../../constants/colors";
import { ApiError } from "../../lib/api";
import type { TranslationKey } from "../../lib/i18n";
import { AppText as Text } from "@/components/ui/AppText";

const SUPPORT_URL = "https://destek.gisekibris.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Step = "start" | "emailCode" | "phoneAsk" | "smsCode";

function errorKey(err: unknown): TranslationKey {
  const data = err instanceof ApiError ? (err.data as { code?: string }) : undefined;
  const c = `${data?.code ?? ""} ${err instanceof Error ? err.message : ""}`;
  if (c.includes("invalid-otp")) return "otpErrorInvalidOtp";
  if (c.includes("expired-otp")) return "otpErrorExpiredOtp";
  if (c.includes("otp-locked")) return "otpErrorOtpLocked";
  if (c.includes("resend-too-soon")) return "otpErrorResendTooSoon";
  if (c.includes("login-mode-disabled")) return "otpErrorLoginModeDisabled";
  if (c.includes("user-inactive") || c.includes("deletedUser")) {
    return "otpErrorUserInactive";
  }
  if (c.includes("phone-not-available")) return "otpErrorPhoneNotAvailable";
  if (c.includes("email-delivery-failed") || c.includes("sms-delivery-failed")) {
    return "otpErrorDeliveryFailed";
  }
  return "otpErrorGeneric";
}

/** `{name}` yer tutucusunu kalın yazar (web'deki <strong> karşılığı). */
function Highlighted({
  template,
  name,
  value,
}: {
  template: string;
  name: string;
  value: string;
}) {
  const [before, after = ""] = template.split(`{${name}}`);
  return (
    <Text style={styles.sub}>
      {before}
      <Text style={styles.subStrong}>{value}</Text>
      {after}
    </Text>
  );
}

interface Props {
  redirectPath?: string;
}

/** Login 2 — web OtpLoginWizard ile aynı akış. */
export default function OtpLoginWizard({ redirectPath }: Props) {
  const { t, tReplace } = useTranslation();
  const {
    otpStart,
    otpVerifyEmail,
    otpEmailUnavailable,
    otpSendSms,
    otpVerifySms,
    otpResend,
  } = useAuth();

  const [step, setStep] = useState<Step>("start");
  const [email, setEmail] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);

  useEffect(() => {
    setHelpOpen(false);
  }, [step]);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const afterLogin = () => {
    router.replace((redirectPath as Href) || ("/(tabs)" as Href));
  };

  const openSupport = () => {
    void Linking.openURL(SUPPORT_URL);
  };

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(t(errorKey(err)));
    } finally {
      setBusy(false);
    }
  };

  const onStart = () => {
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) {
      setError(t("otpErrorInvalidEmail"));
      return;
    }
    void run(async () => {
      const res = await otpStart(trimmed);
      setEmail(trimmed);
      setMaskedEmail(res.maskedEmail || trimmed);
      if (!res.exists) {
        router.push({
          pathname: "/(auth)/register",
          params: { email: trimmed },
        } as unknown as Href);
        return;
      }
      setSecondsLeft(res.resendAfterSeconds || 60);
      setCode(res.devOtpCode || "");
      setDevOtpCode(res.devOtpCode || null);
      setStep("emailCode");
    });
  };

  const verifyCode = (channel: "email" | "sms") => {
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setError(t("otpErrorInvalidCode"));
      return;
    }
    void run(async () => {
      if (channel === "email") await otpVerifyEmail(email, trimmed);
      else await otpVerifySms(email, trimmed);
      afterLogin();
    });
  };

  const onHelpNoEmail = () => {
    void run(async () => {
      const res = await otpEmailUnavailable(email);
      if (!res.hasPhone) {
        openSupport();
        return;
      }
      setMaskedPhone(res.maskedPhone || "");
      setStep("phoneAsk");
    });
  };

  const onContinueSms = () => {
    void run(async () => {
      const res = await otpSendSms(email);
      setMaskedPhone(res.maskedPhone || maskedPhone);
      setSecondsLeft(res.resendAfterSeconds || 60);
      setCode("");
      setStep("smsCode");
    });
  };

  const onResend = (channel: "email" | "sms") => {
    if (secondsLeft > 0) return;
    void run(async () => {
      const res = await otpResend(email, channel);
      setSecondsLeft(res.resendAfterSeconds || 60);
      if (res.devOtpCode) {
        setDevOtpCode(res.devOtpCode);
        setCode(res.devOtpCode);
      }
    });
  };

  const resendLabel =
    secondsLeft > 0
      ? tReplace("otpResendIn", { seconds: String(secondsLeft) })
      : t("otpResend");

  const primaryButton = (label: string, busyLabel: string, onPress: () => void) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={busy}
      activeOpacity={0.85}
      style={[styles.primaryBtn, busy && styles.disabled]}
    >
      {busy ? (
        <View style={styles.busyRow}>
          <ActivityIndicator color={AppColors.navText} size="small" />
          <Text style={styles.primaryBtnText}>{busyLabel}</Text>
        </View>
      ) : (
        <Text style={styles.primaryBtnText}>{label}</Text>
      )}
    </TouchableOpacity>
  );

  const codeInput = (
    <View>
      <Text style={styles.label}>{t("otpCodeLabel")}</Text>
      <TextInput
        value={code}
        onChangeText={(v) => {
          setCode(v.replace(/\D/g, "").slice(0, 6));
          if (error) setError(null);
        }}
        placeholder={t("otpCodePlaceholder")}
        placeholderTextColor="#8E8E93"
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={6}
        editable={!busy}
        style={[styles.input, styles.codeInput]}
      />
    </View>
  );

  const resendButton = (channel: "email" | "sms") => (
    <TouchableOpacity
      onPress={() => onResend(channel)}
      disabled={busy || secondsLeft > 0}
      style={styles.linkBtn}
    >
      <Text
        style={[
          styles.resendText,
          (busy || secondsLeft > 0) && styles.disabled,
        ]}
      >
        {resendLabel}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {step === "start" && (
        <View style={styles.block}>
          <Text style={styles.title}>{t("otpStartTitle")}</Text>
          <Text style={styles.sub}>{t("otpStartSubtitle")}</Text>
          <View>
            <Text style={styles.label}>{t("otpEmailLabel")}</Text>
            <TextInput
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (error) setError(null);
              }}
              placeholder={t("otpEmailPlaceholder")}
              placeholderTextColor="#8E8E93"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="go"
              onSubmitEditing={onStart}
              editable={!busy}
              style={styles.input}
            />
          </View>
          {primaryButton(t("otpContinue"), t("otpContinuing"), onStart)}

          <View>
            <TouchableOpacity
              onPress={() => setHelpOpen((o) => !o)}
              disabled={busy}
              style={styles.helpToggle}
            >
              <Text style={styles.helpToggleText}>
                {t("otpGetHelp")} {helpOpen ? "▴" : "▾"}
              </Text>
            </TouchableOpacity>
            {helpOpen ? (
              <View style={styles.helpMenu}>
                <TouchableOpacity
                  style={styles.helpItem}
                  onPress={() => {
                    setHelpOpen(false);
                    router.push("/(auth)/forgot-password" as Href);
                  }}
                >
                  <Text style={styles.helpItemText}>
                    {t("otpHelpForgotContact")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.helpItem, styles.helpItemLast]}
                  onPress={() => {
                    setHelpOpen(false);
                    openSupport();
                  }}
                >
                  <Text style={styles.helpItemText}>{t("otpHelpMoreInfo")}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      )}

      {step === "emailCode" && (
        <View style={styles.block}>
          <Text style={styles.title}>{t("otpCodeTitle")}</Text>
          <Highlighted
            template={t("otpCodeSentToEmail")}
            name="email"
            value={maskedEmail}
          />
          {devOtpCode ? (
            <Highlighted template={t("otpDevCode")} name="code" value={devOtpCode} />
          ) : null}
          {codeInput}
          {primaryButton(t("otpContinue"), t("otpChecking"), () =>
            verifyCode("email"),
          )}
          {resendButton("email")}
          <TouchableOpacity
            onPress={onHelpNoEmail}
            disabled={busy}
            style={styles.linkBtn}
          >
            <Text style={[styles.smsLinkText, busy && styles.disabled]}>
              {t("otpContinueWithSms")}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {step === "phoneAsk" && (
        <View style={styles.block}>
          <Text style={styles.title}>{t("otpPhoneTitle")}</Text>
          <Highlighted template={t("otpPhoneHint")} name="phone" value={maskedPhone} />
          {primaryButton(t("otpSendSms"), t("otpSending"), onContinueSms)}
        </View>
      )}

      {step === "smsCode" && (
        <View style={styles.block}>
          <Text style={styles.title}>{t("otpSmsTitle")}</Text>
          <Highlighted
            template={t("otpCodeSentToPhone")}
            name="phone"
            value={maskedPhone}
          />
          {codeInput}
          {primaryButton(t("otpContinue"), t("otpSigningIn"), () =>
            verifyCode("sms"),
          )}
          {resendButton("sms")}
        </View>
      )}

      <Text style={styles.bottomText}>
        {t("otpHavingTrouble")}{" "}
        <Text style={styles.bottomLink} onPress={openSupport}>
          {t("otpHelpCenter")}
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    gap: 12,
  },
  block: {
    width: "100%",
    gap: 12,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "PoppinsSemiBold",
    letterSpacing: -0.3,
  },
  sub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    lineHeight: 20,
  },
  subStrong: {
    color: "#fff",
    fontFamily: "PoppinsSemiBold",
  },
  label: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontFamily: "PoppinsMedium",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#1c1c1e",
  },
  codeInput: {
    textAlign: "center",
    fontSize: 22,
    fontFamily: "PoppinsSemiBold",
    letterSpacing: 6,
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
  },
  busyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  linkBtn: {
    paddingVertical: 6,
  },
  resendText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    textAlign: "center",
  },
  smsLinkText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "PoppinsSemiBold",
  },
  helpToggle: {
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  helpToggleText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "PoppinsSemiBold",
  },
  helpMenu: {
    marginTop: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  helpItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#edeff6",
  },
  helpItemLast: {
    borderBottomWidth: 0,
  },
  helpItemText: {
    color: AppColors.heading,
    fontSize: 14,
    fontFamily: "PoppinsMedium",
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.5)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    color: "#fecaca",
    fontSize: 13,
  },
  bottomText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
  bottomLink: {
    color: "rgba(255,255,255,0.85)",
    textDecorationLine: "underline",
  },
});
