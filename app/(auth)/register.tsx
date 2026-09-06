import { Ionicons } from '@expo/vector-icons';
import { Link, router, type Href } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { AppText as Text } from "@/components/ui/AppText";
import {
  DEFAULT_PHONE_CODE,
  isRegisterCitySelectable,
  normalizeCityForFirestore,
  REGISTER_CITIES_BY_COUNTRY,
  REGISTER_COUNTRY_OPTIONS,
  REGISTER_DAY_OPTIONS,
  REGISTER_GENDER_OPTIONS,
  REGISTER_MONTH_OPTIONS,
  REGISTER_PHONE_CODES,
  REGISTER_YEAR_OPTIONS,
} from '../../lib/registerOptions';

// gise-kupon/web/components/LoginModal.tsx birebir validation kuralları
const FIELD_LIMITS = {
  nameMin: 2,
  nameMax: 25,
  emailMin: 4,
  emailMax: 60,
  passwordMin: 6,
  passwordMax: 25,
} as const;

interface FormState {
  name: string;
  surname: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneCode: string;
  mobile: string;
  country: string;
  city: string;
  gender: string;
  dob: string; // YYYY-MM-DD — Kupon Firestore ile aynı
  newsletter: boolean;
  terms: boolean;
}

const INITIAL_FORM: FormState = {
  name: '',
  surname: '',
  email: '',
  password: '',
  confirmPassword: '',
  phoneCode: DEFAULT_PHONE_CODE,
  mobile: '',
  country: '',
  city: '',
  gender: '',
  dob: '',
  newsletter: false,
  terms: false,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ModalKey =
  | 'country'
  | 'city'
  | 'gender'
  | 'dob'
  | 'phoneCode'
  | null;

const MODAL_TITLES: Record<Exclude<ModalKey, null>, string> = {
  country: 'Ülke seçin',
  city: 'Şehir seçin',
  gender: 'Cinsiyet seçin',
  dob: 'Doğum tarihinizi seçin',
  phoneCode: 'Ülke kodu seçin',
};

const COLORS = {
  pageBg: '#f4f5f7',
  cardBg: '#ffffff',
  textPrimary: '#1c1c1e',
  textSecondary: '#6b6f76',
  placeholder: '#a8acb3',
  hairline: '#e6e7eb',
  accent: '#a91d5e',
  buttonBg: '#e8e8eb',
  buttonText: '#1c1c1e',
  errorBg: '#fde8ee',
  errorBorder: '#f3c8d4',
  errorText: '#a91d5e',
};

function validate(form: FormState): string | null {
  const name = form.name.trim();
  if (name.length < FIELD_LIMITS.nameMin || name.length > FIELD_LIMITS.nameMax)
    return 'Ad 2-25 karakter arası olmalıdır';

  const surname = form.surname.trim();
  if (
    surname.length < FIELD_LIMITS.nameMin ||
    surname.length > FIELD_LIMITS.nameMax
  )
    return 'Soyad 2-25 karakter arası olmalıdır';

  const email = form.email.trim();
  if (
    email.length < FIELD_LIMITS.emailMin ||
    email.length > FIELD_LIMITS.emailMax ||
    !EMAIL_RE.test(email)
  )
    return 'Geçerli bir e-posta adresi giriniz (4-60 karakter)';

  if (
    form.password.length < FIELD_LIMITS.passwordMin ||
    form.password.length > FIELD_LIMITS.passwordMax
  )
    return 'Şifre 6-25 karakter arası olmalıdır';

  if (form.password !== form.confirmPassword) return 'Şifreler eşleşmiyor';

  const country = form.country.trim();
  if (!country || country.length < 2) return 'Ülke seçiniz';

  if (
    isRegisterCitySelectable(country) &&
    (!form.city || form.city.trim().length < 2)
  )
    return 'Şehir giriniz (Kıbrıs ve Türkiye için zorunlu)';

  if (!form.gender) return 'Cinsiyet seçiniz';

  const rawPhone = form.mobile.trim();
  const composedPhone = rawPhone
    ? `${form.phoneCode}${rawPhone.replace(/^[\s+]+/, '')}`.replace(/\s+/g, '')
    : '';
  if (
    !composedPhone ||
    composedPhone.length < 6 ||
    composedPhone.length > 25
  ) {
    return 'Geçerli bir telefon numarası giriniz';
  }

  const birthParts = form.dob.split('-').filter(Boolean);
  if (!form.dob || birthParts.length < 3) return 'Doğum tarihi giriniz';

  if (!form.terms) return 'Kullanım şartlarını onaylamalısınız';
  return null;
}

const MONTH_LABELS_TR = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

function formatBirthDateDisplay(ymd: string): string {
  if (!ymd) return '';
  const parts = ymd.split('-');
  if (parts.length !== 3) return '';
  const [year, month, day] = parts;
  const monthIdx = parseInt(month, 10) - 1;
  if (Number.isNaN(monthIdx) || !MONTH_LABELS_TR[monthIdx]) return '';
  return `${parseInt(day, 10)} ${MONTH_LABELS_TR[monthIdx]} ${year}`;
}

export default function RegisterScreen() {
  const { signup } = useAuth();
  const { branding } = useBranding();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ModalKey>(null);
  const [termsModalVisible, setTermsModalVisible] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const cityOptions = REGISTER_CITIES_BY_COUNTRY[form.country] || [];
  const citySelectable = isRegisterCitySelectable(form.country);

  const countryLabel =
    REGISTER_COUNTRY_OPTIONS.find((c) => c.code === form.country)?.label ?? '';
  const genderLabel =
    REGISTER_GENDER_OPTIONS.find((g) => g.value === form.gender)?.label ?? '';
  const dobLabel = formatBirthDateDisplay(form.dob);
  const termsTitle = branding?.mobileTermsTitle?.trim() || 'Kullanım Şartları';
  const termsContent =
    branding?.mobileTermsContent?.trim() ||
    'Bu işletme için kullanım şartları metni henüz eklenmemiştir.';

  const handleTermsPress = () => {
    if (submitting) return;
    if (form.terms) {
      set('terms', false);
      return;
    }
    setTermsModalVisible(true);
  };

  const onSubmit = async () => {
    setError(null);
    const validation = validate(form);
    if (validation) {
      setError(validation);
      return;
    }
    setSubmitting(true);
    try {
      // Telefon: prefix + numara birleştir. Backend (panel-backend
      // normalizePhoneForSso) zaten gelen prefix'i koruyor, başında + varsa
      // doğrudan SSO'ya gönderiyor.
      const rawPhone = form.mobile.trim();
      const composedPhone = `${form.phoneCode}${rawPhone.replace(/^[\s+]+/, '')}`.replace(
        /\s+/g,
        '',
      );

      const { userId } = await signup({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        name: form.name.trim(),
        surname: form.surname.trim(),
        mobile: composedPhone,
        country: form.country.trim(),
        city: normalizeCityForFirestore(
          form.country.trim(),
          form.city.trim(),
        ),
        gender: form.gender.trim(),
        dob: form.dob.trim(),
        newsletter: form.newsletter,
      });
      router.replace({
        pathname: '/(auth)/verify-email',
        params: { userId, email: form.email.trim().toLowerCase() },
      } as unknown as Href);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Kayıt başarısız, tekrar deneyin';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const modalOptions = (() => {
    if (activeModal === 'country')
      return REGISTER_COUNTRY_OPTIONS.map((c) => ({
        value: c.code,
        label: c.label,
      }));
    if (activeModal === 'city')
      return cityOptions.map((city) => ({ value: city, label: city }));
    if (activeModal === 'gender')
      return REGISTER_GENDER_OPTIONS.map((g) => ({
        value: g.value,
        label: g.label,
      }));
    if (activeModal === 'phoneCode')
      // Modal'da phoneCode için benzersiz key gerek; aynı +90 iki kez var (TR, KKTC).
      return REGISTER_PHONE_CODES.map((pc, idx) => ({
        value: `${pc.code}|${idx}`,
        label: `${pc.flag}  ${pc.code}   ${pc.label}`,
      }));
    return [];
  })();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Üye Ol</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <FieldCard label="İsim">
            <TextInput
              value={form.name}
              onChangeText={(v) => set('name', v)}
              placeholder="İsminizi girin"
              placeholderTextColor={COLORS.placeholder}
              editable={!submitting}
              style={styles.input}
              autoCapitalize="words"
            />
          </FieldCard>

          <FieldCard label="Soyisim">
            <TextInput
              value={form.surname}
              onChangeText={(v) => set('surname', v)}
              placeholder="Soyisminizi girin"
              placeholderTextColor={COLORS.placeholder}
              editable={!submitting}
              style={styles.input}
              autoCapitalize="words"
            />
          </FieldCard>

          <FieldCard label="E-posta">
            <TextInput
              value={form.email}
              onChangeText={(v) => set('email', v)}
              placeholder="E-posta girin"
              placeholderTextColor={COLORS.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!submitting}
              style={styles.input}
            />
          </FieldCard>

          <FieldCard label="Doğum Tarihi">
            <TouchableOpacity
              onPress={() => setActiveModal('dob')}
              disabled={submitting}
              activeOpacity={0.7}
              style={styles.fieldRow}
            >
              <Text
                style={[
                  styles.fieldRowText,
                  !dobLabel && styles.placeholderText,
                ]}
              >
                {dobLabel || 'Doğum tarihinizi seçin'}
              </Text>
            </TouchableOpacity>
          </FieldCard>

          <FieldCard label="Cep Telefonu">
            <View style={styles.phoneRow}>
              <TouchableOpacity
                onPress={() => setActiveModal('phoneCode')}
                disabled={submitting}
                style={styles.phonePrefixBtn}
                activeOpacity={0.7}
                hitSlop={6}
              >
                <Text style={styles.phonePrefix}>{form.phoneCode}</Text>
                <Ionicons
                  name="chevron-down"
                  size={14}
                  color={COLORS.textSecondary}
                  style={styles.phonePrefixIcon}
                />
              </TouchableOpacity>
              <View style={styles.phoneDivider} />
              <TextInput
                value={form.mobile}
                onChangeText={(v) => set('mobile', v)}
                placeholder="(599) 999 9999"
                placeholderTextColor={COLORS.placeholder}
                keyboardType="phone-pad"
                editable={!submitting}
                style={styles.phoneInput}
              />
            </View>
          </FieldCard>

          <SelectionCard
            label="Cinsiyet"
            valueLabel={genderLabel}
            onPress={() => setActiveModal('gender')}
            disabled={submitting}
          />

          <SelectionCard
            label="Ülke"
            valueLabel={countryLabel}
            onPress={() => setActiveModal('country')}
            disabled={submitting}
          />

          {citySelectable ? (
            <SelectionCard
              label="Şehir"
              valueLabel={form.city}
              onPress={() => setActiveModal('city')}
              disabled={submitting || !form.country}
            />
          ) : form.country ? (
            <FieldCard label="Şehir">
              <TextInput
                value={form.city}
                onChangeText={(v) => set('city', v)}
                placeholder="Şehrinizi girin"
                placeholderTextColor={COLORS.placeholder}
                editable={!submitting}
                style={styles.input}
              />
            </FieldCard>
          ) : null}

          <FieldCard label="Şifre">
            <View style={styles.passwordRow}>
              <TextInput
                value={form.password}
                onChangeText={(v) => set('password', v)}
                placeholder="Şifrenizi girin"
                placeholderTextColor={COLORS.placeholder}
                secureTextEntry={!showPwd}
                autoCapitalize="none"
                editable={!submitting}
                style={[styles.input, styles.passwordInput]}
              />
              <TouchableOpacity
                onPress={() => setShowPwd((s) => !s)}
                style={styles.eyeBtn}
                hitSlop={8}
              >
                <Ionicons
                  name={showPwd ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </FieldCard>

          <FieldCard label="Şifreyi Tekrarla">
            <View style={styles.passwordRow}>
              <TextInput
                value={form.confirmPassword}
                onChangeText={(v) => set('confirmPassword', v)}
                placeholder="Şifrenizi tekrarlayın"
                placeholderTextColor={COLORS.placeholder}
                secureTextEntry={!showConfirmPwd}
                autoCapitalize="none"
                editable={!submitting}
                style={[styles.input, styles.passwordInput]}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPwd((s) => !s)}
                style={styles.eyeBtn}
                hitSlop={8}
              >
                <Ionicons
                  name={showConfirmPwd ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </FieldCard>

          <CheckCard
            title="Kullanım Şartları"
            description="Kullanım şartlarını okudum ve onaylıyorum"
            checked={form.terms}
            onToggle={handleTermsPress}
            disabled={submitting}
          />

          <CheckCard
            title="Bülten"
            description="Gişe Kıbrıs bültenlerine abone olmak istiyorum"
            checked={form.newsletter}
            onToggle={() => set('newsletter', !form.newsletter)}
            disabled={submitting}
          />

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTextStyle}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={() => void onSubmit()}
            disabled={submitting}
            style={[
              styles.primaryBtn,
              submitting && styles.primaryBtnDisabled,
            ]}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.buttonText} />
            ) : (
              <Text style={styles.primaryBtnText}>Üye Ol</Text>
            )}
          </TouchableOpacity>

          <View style={styles.bottomLinkRow}>
            <Text style={styles.bottomText}>Zaten hesabın var mı? </Text>
            <Link href={'/(auth)/login' as Href} asChild>
              <TouchableOpacity>
                <Text style={styles.bottomLink}>Giriş Yap</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <SelectionModal
        visible={activeModal !== null && activeModal !== 'dob'}
        title={
          activeModal && activeModal !== 'dob'
            ? MODAL_TITLES[activeModal]
            : ''
        }
        options={modalOptions}
        searchable={
          activeModal === 'phoneCode' ||
          activeModal === 'country' ||
          activeModal === 'city'
        }
        onClose={() => setActiveModal(null)}
        onSelect={(value) => {
          if (activeModal === 'country') {
            // Ülke değişince alan koduna dokunma — kullanıcının seçtiği kod kalsın.
            setForm((prev) => ({
              ...prev,
              country: value,
              city: '',
            }));
          } else if (activeModal === 'city') {
            set('city', value);
          } else if (activeModal === 'gender') {
            set('gender', value);
          } else if (activeModal === 'phoneCode') {
            // value formatı: "+90|3" — sadece kod kısmını al
            const code = value.split('|')[0];
            set('phoneCode', code);
          }
          setActiveModal(null);
        }}
      />

      <BirthDateModal
        visible={activeModal === 'dob'}
        currentValue={form.dob}
        onClose={() => setActiveModal(null)}
        onConfirm={(ymd) => {
          set('dob', ymd);
          setActiveModal(null);
        }}
      />

      <TermsModal
        visible={termsModalVisible}
        title={termsTitle}
        content={termsContent}
        onClose={() => setTermsModalVisible(false)}
        onAccept={() => {
          set('terms', true);
          setTermsModalVisible(false);
        }}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// FIELD COMPONENTS
// ---------------------------------------------------------------------------

interface FieldCardProps {
  label: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

function FieldCard({ label, children, style }: FieldCardProps) {
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.cardLabel}>{label}</Text>
      <View style={styles.cardInputWrap}>{children}</View>
      <View style={styles.cardUnderline} />
    </View>
  );
}

interface SelectionCardProps {
  label: string;
  valueLabel: string;
  onPress: () => void;
  disabled?: boolean;
}

function SelectionCard({
  label,
  valueLabel,
  onPress,
  disabled,
}: SelectionCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[styles.card, styles.cardRow, disabled && styles.cardDisabled]}
    >
      <Text style={styles.cardLabel}>{label}</Text>
      <Text
        style={[
          styles.cardRowValue,
          !valueLabel && styles.placeholderText,
        ]}
        numberOfLines={1}
      >
        {valueLabel || 'Seçim'}
      </Text>
    </TouchableOpacity>
  );
}

interface CheckCardProps {
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

function CheckCard({
  title,
  description,
  checked,
  onToggle,
  disabled,
}: CheckCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={disabled ? undefined : onToggle}
      style={[styles.card, styles.checkCard]}
    >
      <View style={styles.checkTextWrap}>
        <Text style={styles.cardLabel}>{title}</Text>
        <Text style={styles.checkDescription}>{description}</Text>
      </View>
      <View
        style={[
          styles.checkbox,
          checked && styles.checkboxChecked,
        ]}
      >
        {checked ? (
          <Ionicons name="checkmark" size={16} color="#fff" />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// MODALS
// ---------------------------------------------------------------------------

interface SelectionModalProps {
  visible: boolean;
  title: string;
  options: { value: string; label: string }[];
  onClose: () => void;
  onSelect: (value: string) => void;
  searchable?: boolean;
}

function SelectionModal({
  visible,
  title,
  options,
  onClose,
  onSelect,
  searchable,
}: SelectionModalProps) {
  const [query, setQuery] = useState('');

  // Modal kapanınca arama state'ini sıfırla — sonraki açılışta temiz başlasın.
  const handleClose = () => {
    setQuery('');
    onClose();
  };

  const filtered = query.trim()
    ? options.filter((o) =>
        o.label.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')),
      )
    : options;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalBackdrop}>
        <TouchableOpacity
          style={styles.modalDismiss}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {searchable ? (
            <View style={styles.searchWrap}>
              <Ionicons
                name="search"
                size={16}
                color={COLORS.textSecondary}
                style={styles.searchIcon}
              />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Ara..."
                placeholderTextColor={COLORS.placeholder}
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {query ? (
                <TouchableOpacity
                  onPress={() => setQuery('')}
                  hitSlop={8}
                  style={styles.searchClear}
                >
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          <ScrollView
            style={styles.modalList}
            keyboardShouldPersistTaps="handled"
          >
            {filtered.length === 0 ? (
              <Text style={styles.emptyOptionText}>
                {query ? 'Eşleşen sonuç yok' : 'Seçenek yok'}
              </Text>
            ) : (
              filtered.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.modalOption}
                  onPress={() => {
                    setQuery('');
                    onSelect(option.value);
                  }}
                >
                  <Text style={styles.modalOptionText}>{option.label}</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

interface TermsModalProps {
  visible: boolean;
  title: string;
  content: string;
  onClose: () => void;
  onAccept: () => void;
}

function TermsModal({
  visible,
  title,
  content,
  onClose,
  onAccept,
}: TermsModalProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <TouchableOpacity
          style={styles.modalDismiss}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.modalCard, styles.termsModalCard]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.termsScroll}>
            <Text style={styles.termsText}>{content}</Text>
          </ScrollView>

          <View style={styles.termsActions}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.termsCancelBtn}
              activeOpacity={0.75}
            >
              <Text style={styles.termsCancelText}>Vazgeç</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onAccept}
              style={styles.termsAcceptBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.termsAcceptText}>
                Okudum, Onaylıyorum
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface BirthDateModalProps {
  visible: boolean;
  currentValue: string;
  onClose: () => void;
  onConfirm: (ymd: string) => void;
}

function BirthDateModal({
  visible,
  currentValue,
  onClose,
  onConfirm,
}: BirthDateModalProps) {
  // currentValue YYYY-MM-DD bekliyoruz
  const parts = currentValue.split('-');
  const initialYear = parts[0] || '';
  const initialMonth = parts[1] || '';
  const initialDay = parts[2] || '';

  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [day, setDay] = useState(initialDay);

  // Modal her açıldığında local state'i parent'tan tazele
  // (React: state'i prop ile sync için key kullanmak daha temiz, ama bu modal
  // hot reload'da kafa karıştırmasın diye effect yerine basit kontrol)
  // → Pratik için: modal yeniden açıldığında ufak rerender yeter.
  const canConfirm = year && month && day;

  const confirm = () => {
    if (!canConfirm) return;
    onConfirm(`${year}-${month}-${day}`);
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <TouchableOpacity
          style={styles.modalDismiss}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Doğum tarihinizi seçin</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.dateColumnRow}>
            <DateColumn
              label="Gün"
              options={REGISTER_DAY_OPTIONS}
              selected={day}
              onSelect={setDay}
            />
            <DateColumn
              label="Ay"
              options={REGISTER_MONTH_OPTIONS}
              selected={month}
              onSelect={setMonth}
              renderLabel={(v) => {
                const idx = parseInt(v, 10) - 1;
                return MONTH_LABELS_TR[idx] ?? v;
              }}
            />
            <DateColumn
              label="Yıl"
              options={REGISTER_YEAR_OPTIONS}
              selected={year}
              onSelect={setYear}
            />
          </View>

          <View style={styles.dateConfirmRow}>
            <TouchableOpacity
              onPress={confirm}
              disabled={!canConfirm}
              style={[
                styles.dateConfirmBtn,
                !canConfirm && styles.dateConfirmBtnDisabled,
              ]}
            >
              <Text style={styles.dateConfirmText}>Tamam</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface DateColumnProps {
  label: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  renderLabel?: (v: string) => string;
}

function DateColumn({
  label,
  options,
  selected,
  onSelect,
  renderLabel,
}: DateColumnProps) {
  return (
    <View style={styles.dateColumn}>
      <Text style={styles.dateColumnLabel}>{label}</Text>
      <ScrollView
        style={styles.dateColumnList}
        showsVerticalScrollIndicator={false}
      >
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            onPress={() => onSelect(opt)}
            style={[
              styles.dateColumnItem,
              selected === opt && styles.dateColumnItemActive,
            ]}
          >
            <Text
              style={[
                styles.dateColumnItemText,
                selected === opt && styles.dateColumnItemTextActive,
              ]}
            >
              {renderLabel ? renderLabel(opt) : opt}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// STYLES
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.pageBg,
  },
  flex: { flex: 1 },
  headerBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: COLORS.pageBg,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'PoppinsSemiBold',
    color: COLORS.textPrimary,
  },
  headerSpacer: {
    width: 36,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardLabel: {
    fontSize: 15,
    fontFamily: 'PoppinsSemiBold',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  cardInputWrap: {
    minHeight: 22,
  },
  cardUnderline: {
    height: 1,
    backgroundColor: COLORS.hairline,
    marginTop: 10,
    marginHorizontal: -16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardRowValue: {
    fontSize: 15,
    color: COLORS.textPrimary,
    marginLeft: 12,
    flexShrink: 1,
    textAlign: 'right',
  },
  cardDisabled: {
    opacity: 0.6,
  },
  input: {
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  fieldRow: {
    paddingVertical: 2,
  },
  fieldRowText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  placeholderText: {
    color: COLORS.placeholder,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  phonePrefixBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingRight: 2,
  },
  phonePrefix: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontFamily: 'PoppinsMedium',
  },
  phonePrefixIcon: {
    marginLeft: 2,
  },
  phoneDivider: {
    width: 1,
    height: 18,
    backgroundColor: COLORS.hairline,
  },
  phoneInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
  },
  eyeBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  checkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  checkDescription: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: COLORS.accent,
  },
  errorBox: {
    backgroundColor: COLORS.errorBg,
    borderColor: COLORS.errorBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorTextStyle: {
    color: COLORS.errorText,
    fontSize: 13,
    fontFamily: 'PoppinsMedium',
  },
  primaryBtn: {
    backgroundColor: COLORS.buttonBg,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: COLORS.buttonText,
    fontSize: 16,
    fontFamily: 'PoppinsSemiBold',
  },
  bottomLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  bottomText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  bottomLink: {
    fontSize: 13,
    fontFamily: 'PoppinsBold',
    color: COLORS.accent,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalDismiss: {
    flex: 1,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '70%',
    paddingBottom: 16,
  },
  termsModalCard: {
    maxHeight: '82%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: 'PoppinsSemiBold',
    color: COLORS.textPrimary,
  },
  modalList: {
    paddingHorizontal: 8,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f1f2f4',
    borderRadius: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  searchClear: {
    paddingLeft: 4,
  },
  modalOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.hairline,
  },
  modalOptionText: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  emptyOptionText: {
    fontSize: 14,
    color: COLORS.placeholder,
    textAlign: 'center',
    paddingVertical: 24,
  },
  termsScroll: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  termsText: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textPrimary,
  },
  termsActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
  },
  termsCancelBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#f1f2f4',
  },
  termsCancelText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: 'PoppinsSemiBold',
  },
  termsAcceptBtn: {
    flex: 1.35,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: COLORS.accent,
  },
  termsAcceptText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'PoppinsSemiBold',
  },
  dateColumnRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    maxHeight: 320,
  },
  dateColumn: {
    flex: 1,
  },
  dateColumnLabel: {
    fontSize: 13,
    fontFamily: 'PoppinsSemiBold',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  dateColumnList: {
    maxHeight: 280,
  },
  dateColumnItem: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  dateColumnItemActive: {
    backgroundColor: COLORS.accent,
  },
  dateColumnItemText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  dateColumnItemTextActive: {
    color: '#fff',
    fontFamily: 'PoppinsSemiBold',
  },
  dateConfirmRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  dateConfirmBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dateConfirmBtnDisabled: {
    opacity: 0.4,
  },
  dateConfirmText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'PoppinsSemiBold',
  },
});
