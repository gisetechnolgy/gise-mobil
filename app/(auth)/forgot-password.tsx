import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const { forgotPassword } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!EMAIL_RE.test(email.trim())) {
      setError(t('forgotPasswordEmailInvalid'));
      return;
    }
    setSubmitting(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : t('forgotPasswordSendFailed');
      setError(msg);
    } finally {
      setSubmitting(false);
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
        <Text style={styles.title}>{t('forgotPasswordTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('forgotPasswordSubtitle')}
        </Text>
      </View>

      {sent ? (
        <View style={styles.successWrap}>
          <View style={styles.successCircle}>
            <Ionicons name="mail-outline" size={28} color="#fff" />
          </View>
          <Text style={styles.successTitle}>{t('forgotPasswordSuccessTitle')}</Text>
          <Text style={styles.successText}>
            {t('forgotPasswordSuccessText')}
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login' as Href)}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>{t('forgotPasswordBackToLogin')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.formBlock}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={t('email')}
            placeholderTextColor="#8E8E93"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!submitting}
            style={styles.input}
          />

          <TouchableOpacity
            onPress={onSubmit}
            disabled={submitting}
            style={[styles.primaryBtn, { opacity: submitting ? 0.7 : 1 }]}
          >
            {submitting ? (
              <ActivityIndicator color="#222" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {t('forgotPasswordSubmit')}
              </Text>
            )}
          </TouchableOpacity>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login' as Href)}
            style={styles.secondaryLink}
          >
            <Text style={styles.secondaryLinkText}>Girişe dön</Text>
          </TouchableOpacity>
        </View>
      )}
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
  titleWrap: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'PoppinsBold',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    textAlign: 'center',
  },
  formBlock: { width: '100%', gap: 14 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1c1c1e',
  },
  primaryBtn: {
    backgroundColor: 'rgba(232, 232, 235, 0.95)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: '#1c1c1e', fontSize: 15, fontFamily: 'PoppinsSemiBold' },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: { color: '#fecaca', fontSize: 13 },
  secondaryLink: { alignItems: 'center', paddingVertical: 8, marginTop: 8 },
  secondaryLinkText: { color: '#fff', fontSize: 14, fontFamily: 'PoppinsSemiBold' },
  successWrap: { alignItems: 'center', gap: 14 },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { color: '#fff', fontSize: 18, fontFamily: 'PoppinsBold' },
  successText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
});
