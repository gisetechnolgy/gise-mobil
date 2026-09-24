import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import AuthScreenLayout from '../components/AuthScreenLayout';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/_LocaleContext';
import { AppText as Text } from "@/components/ui/AppText";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function VerifyEmailScreen() {
  const { verifyEmail, resendVerification } = useAuth();
  const { t, tReplace } = useTranslation();
  const params = useLocalSearchParams<{ userId?: string; email?: string }>();
  const userId = (params.userId ?? '').toString();
  const email = (params.email ?? '').toString();

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const inputs = useRef<(TextInput | null)[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const setDigit = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }
    if (cleaned.length === 1) {
      const next = [...digits];
      next[index] = cleaned;
      setDigits(next);
      if (index < CODE_LENGTH - 1) {
        inputs.current[index + 1]?.focus();
      }
      return;
    }
    const next = [...digits];
    let cursor = index;
    for (const ch of cleaned) {
      if (cursor >= CODE_LENGTH) break;
      next[cursor] = ch;
      cursor++;
    }
    setDigits(next);
    const focusIdx = Math.min(cursor, CODE_LENGTH - 1);
    inputs.current[focusIdx]?.focus();
  };

  const onKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
    }
  };

  const code = digits.join('');

  const onSubmit = async () => {
    setError(null);
    setInfo(null);
    if (code.length !== CODE_LENGTH) {
      setError(t('verifyCodeIncomplete'));
      return;
    }
    if (!userId) {
      setError(t('verifySessionMissing'));
      return;
    }
    setSubmitting(true);
    try {
      await verifyEmail(userId, code.trim());
      router.replace('/(tabs)' as Href);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('verifyFailed');
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    setError(null);
    setInfo(null);
    if (cooldown > 0) return;
    if (!userId) {
      setError(t('verifySessionMissing'));
      return;
    }
    setResending(true);
    try {
      await resendVerification(userId);
      setInfo(t('verifyCodeSent'));
      setCooldown(RESEND_COOLDOWN);
      setDigits(Array(CODE_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('verifyResendFailed');
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthScreenLayout
      rightHeaderAction={
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
          <Text style={styles.backText}>{t('back')}</Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.titleWrap}>
        <Text style={styles.title}>{t('verifyEmailTitle')}</Text>
        <Text style={styles.subtitle}>
          {email
            ? tReplace('verifyEmailCodeSentTo', { email })
            : t('verifyEmailCodeSent')}
        </Text>
      </View>

      <View style={styles.codeRow}>
        {digits.map((d, i) => (
          <TextInput
            key={i}
            ref={(r) => {
              inputs.current[i] = r;
            }}
            value={d}
            onChangeText={(v) => setDigit(i, v)}
            onKeyPress={({ nativeEvent }) => onKeyPress(i, nativeEvent.key)}
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            textContentType="oneTimeCode"
            editable={!submitting}
            style={styles.codeInput}
          />
        ))}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {info && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>{info}</Text>
        </View>
      )}

      <TouchableOpacity
        onPress={onSubmit}
        disabled={submitting}
        style={[styles.primaryBtn, { opacity: submitting ? 0.7 : 1 }]}
      >
        {submitting ? (
          <ActivityIndicator color="#222" />
        ) : (
          <Text style={styles.primaryBtnText}>{t('verifyAndLogin')}</Text>
        )}
      </TouchableOpacity>

      <View style={styles.resendWrap}>
        <Text style={styles.resendQ}>{t('verifyCodeMissing')}</Text>
        <TouchableOpacity
          onPress={onResend}
          disabled={cooldown > 0 || resending}
          style={styles.resendBtn}
        >
          {resending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              style={[
                styles.resendText,
                { opacity: cooldown > 0 ? 0.5 : 1 },
              ]}
            >
              {cooldown > 0
                ? tReplace('resendCooldown', { seconds: String(cooldown) })
                : t('resend')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  backText: { color: '#fff', fontSize: 14, fontFamily: 'PoppinsMedium' },
  titleWrap: { alignItems: 'center', marginBottom: 24 },
  title: { color: '#fff', fontSize: 22, fontFamily: 'PoppinsBold', marginBottom: 8 },
  subtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  codeInput: {
    width: 48,
    height: 56,
    backgroundColor: '#fff',
    borderRadius: 12,
    fontSize: 22,
    fontFamily: 'PoppinsBold',
    color: '#1c1c1e',
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  errorText: { color: '#fecaca', fontSize: 13 },
  infoBox: {
    backgroundColor: 'rgba(34, 197, 94, 0.18)',
    borderColor: 'rgba(34, 197, 94, 0.5)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  infoText: { color: '#bbf7d0', fontSize: 13 },
  primaryBtn: {
    backgroundColor: 'rgba(232, 232, 235, 0.95)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#1c1c1e', fontSize: 15, fontFamily: 'PoppinsSemiBold' },
  resendWrap: { alignItems: 'center', marginTop: 24 },
  resendQ: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  resendBtn: { marginTop: 6 },
  resendText: { color: '#fff', fontSize: 14, fontFamily: 'PoppinsBold' },
});
