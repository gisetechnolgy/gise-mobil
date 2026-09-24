import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApplicationFormShell,
  ChipSelect,
  FormField,
  FormSectionTitle,
  ImageFileField,
  InfoNote,
  SingleSelect,
} from "./ApplicationFormShell";
import { useLocale, useTranslation } from "../context/_LocaleContext";
import { fetchVenueCategories } from "../../lib/definitions";
import {
  buildAutoSlug,
  CITY_OPTIONS,
  COMPANY_LEGAL_TYPES,
  fetchApplicationCities,
  fetchTakenSlugsForScope,
  IMAGE_HINTS,
  submitCompanyApplication,
  type CompanyApplicationType,
  type MediaUpload,
} from "../../lib/applications";

type Props = {
  companyType: CompanyApplicationType;
};

type SalesForm = {
  name: string;
  email: string;
  phone: string;
  website: string;
  companyName: string;
  companyBank: string;
  companyAccountNo: string;
  city: string;
  street: string;
  district: string;
  description: string;
  about: string;
};

type PanelForm = {
  name: string;
  slug: string;
  categories: string[];
  logo: MediaUpload;
  banner: MediaUpload;
  layout: MediaUpload;
  youtube: string;
  phone: string;
  email: string;
  about: string;
  city: string;
  address: string;
  coordinates: string;
  companyType: string;
  companyName: string;
  taxName: string;
  taxDocument: MediaUpload;
  bankCompanyName: string;
  bankName: string;
  bankAccountNo: string;
  googleKeywords: string;
  googleDescription: string;
};

const EMPTY_SALES: SalesForm = {
  name: "",
  email: "",
  phone: "",
  website: "",
  companyName: "",
  companyBank: "",
  companyAccountNo: "",
  city: "",
  street: "",
  district: "",
  description: "",
  about: "",
};

const EMPTY_PANEL: PanelForm = {
  name: "",
  slug: "",
  categories: [],
  logo: null,
  banner: null,
  layout: null,
  youtube: "",
  phone: "",
  email: "",
  about: "",
  city: "",
  address: "",
  coordinates: "",
  companyType: "",
  companyName: "",
  taxName: "",
  taxDocument: null,
  bankCompanyName: "",
  bankName: "",
  bankAccountNo: "",
  googleKeywords: "",
  googleDescription: "",
};

function SalesAgentForm({ companyType }: Props) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const isEn = locale === "en";
  const [form, setForm] = useState(EMPTY_SALES);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  const setField = useCallback((key: keyof SalesForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setError(null);
    setSuccess(null);
  }, []);

  const onSubmit = useCallback(async () => {
    const errors: Record<string, boolean> = {};
    if (!form.name.trim()) errors.name = true;
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = true;
    }
    if (!form.phone.trim()) errors.phone = true;
    if (!form.companyName.trim()) errors.companyName = true;
    if (!form.description.trim()) errors.description = true;
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError(t("formRequiredError"));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const aboutText = form.about.trim();
      await submitCompanyApplication({
        companyType,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        website: form.website.trim(),
        companyName: form.companyName.trim(),
        companyBank: form.companyBank.trim(),
        companyAccountNo: form.companyAccountNo.trim(),
        city: form.city,
        address: {
          street: form.street.trim(),
          district: form.district.trim(),
          postalCode: "",
        },
        description: { [locale]: form.description.trim() },
        about: aboutText ? { [locale]: aboutText } : "",
        categories: [],
        amenities: [],
        sourceLang: locale,
        isChecked: false,
      });
      setSuccess(t("salesPartnerSuccess"));
      setForm(EMPTY_SALES);
      setFieldErrors({});
    } catch {
      setError(t("formSubmitFailed"));
    } finally {
      setSubmitting(false);
    }
  }, [companyType, form, locale, t]);

  return (
    <ApplicationFormShell
      title={t("salesPartnerTitle")}
      subtitle={t("salesPartnerSubtitle")}
      submitLabel={t("salesPartnerSubmit")}
      onSubmit={() => void onSubmit()}
      submitting={submitting}
      error={error}
      success={success}
    >
      <FormSectionTitle title={isEn ? "Contact Information" : "İletişim Bilgileri"} />
      <FormField
        label={isEn ? "Name" : "Ad Soyad"}
        value={form.name}
        onChangeText={(v) => setField("name", v)}
        autoCapitalize="words"
        error={fieldErrors.name}
        placeholder={isEn ? "Full name" : "Ad soyad"}
      />
      <FormField
        label={isEn ? "Email" : "E-posta"}
        value={form.email}
        onChangeText={(v) => setField("email", v)}
        keyboardType="email-address"
        autoCapitalize="none"
        error={fieldErrors.email}
        placeholder={isEn ? "Email" : "E-posta"}
      />
      <FormField
        label={isEn ? "Phone" : "Tel"}
        value={form.phone}
        onChangeText={(v) => setField("phone", v)}
        keyboardType="phone-pad"
        error={fieldErrors.phone}
        placeholder={isEn ? "Phone" : "Telefon"}
      />
      <FormField
        label="Website"
        value={form.website}
        onChangeText={(v) => setField("website", v)}
        keyboardType="url"
        autoCapitalize="none"
        placeholder={isEn ? "Enter your website" : "Web sitenizi girin"}
      />

      <FormSectionTitle
        title={isEn ? "Sales Agent Information" : "Satış Ortağı Bilgileri"}
      />
      <FormField
        label={t("salesPartnerEntity")}
        value={form.companyName}
        onChangeText={(v) => setField("companyName", v)}
        error={fieldErrors.companyName}
        placeholder={
          isEn ? "Enter sales agent name" : "Satış ortağı adını girin"
        }
      />
      <FormField
        label={isEn ? "Bank" : "Banka"}
        value={form.companyBank}
        onChangeText={(v) => setField("companyBank", v)}
        placeholder={isEn ? "Bank name" : "Banka adı"}
      />
      <FormField
        label="IBAN"
        value={form.companyAccountNo}
        onChangeText={(v) => setField("companyAccountNo", v)}
        autoCapitalize="characters"
        placeholder="IBAN"
      />

      <FormSectionTitle title={isEn ? "Location Information" : "Konum Bilgileri"} />
      <SingleSelect
        label={isEn ? "City" : "Şehir"}
        value={form.city}
        onChange={(id) => setField("city", id)}
        options={CITY_OPTIONS.map((c) => ({
          id: c.value,
          label: isEn ? c.en : c.tr,
        }))}
      />
      <FormField
        label={isEn ? "District" : "İlçe"}
        value={form.district}
        onChangeText={(v) => setField("district", v)}
        placeholder={isEn ? "District" : "İlçe"}
      />
      <FormField
        label={isEn ? "Address" : "Adres"}
        value={form.street}
        onChangeText={(v) => setField("street", v)}
        placeholder={isEn ? "Street address" : "Sokak adresi"}
      />

      <FormSectionTitle title={isEn ? "Event Details" : "Etkinlik Detayları"} />
      <FormField
        label={isEn ? "Event Description" : "Etkinlik Açıklaması"}
        value={form.description}
        onChangeText={(v) => setField("description", v)}
        multiline
        error={fieldErrors.description}
        placeholder={
          isEn ? "Describe your event..." : "Etkinliğinizi açıklayın..."
        }
      />
      <FormField
        label={t("salesPartnerAbout")}
        value={form.about}
        onChangeText={(v) => setField("about", v)}
        multiline
        placeholder={
          isEn
            ? "Tell us about your sales agent profile..."
            : "Satış ortaklığı profiliniz hakkında bilgi verin..."
        }
      />
    </ApplicationFormShell>
  );
}

function PanelCompanyForm({
  companyType,
}: {
  companyType: "venue" | "organisationCompany";
}) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const isEn = locale === "en";
  const isVenue = companyType === "venue";

  const [form, setForm] = useState(EMPTY_PANEL);
  const [cities, setCities] = useState<{ id: string; label: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; label: string }[]>(
    [],
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const takenSlugsRef = useRef<string[]>([]);

  const copy = useMemo(() => {
    if (isVenue) {
      return {
        title: t("venueApplyTitle"),
        subtitle: t("venueApplySubtitle"),
        submit: t("venueApplySubmit"),
        success: t("venueApplySuccess"),
        aboutLabel: t("venueAbout"),
        namePlaceholder: isEn ? "Venue name" : "Mekan adı",
      };
    }
    return {
      title: t("organiserApplyTitle"),
      subtitle: t("organiserApplySubtitle"),
      submit: t("organiserApplySubmit"),
      success: t("organiserApplySuccess"),
      aboutLabel: t("organiserAbout"),
      namePlaceholder: isEn ? "Company name" : "Şirket adı",
    };
  }, [isEn, isVenue, t]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cityRows, slugRows, categoryRows] = await Promise.all([
          fetchApplicationCities(locale),
          fetchTakenSlugsForScope(companyType),
          isVenue ? fetchVenueCategories() : Promise.resolve([]),
        ]);
        if (cancelled) return;
        takenSlugsRef.current = slugRows;
        setCities(cityRows);
        if (isVenue) {
          setCategories(
            categoryRows.map((c) => ({
              id: c.id,
              label: c.label,
            })),
          );
        }
        setForm((prev) => {
          const name = prev.name.trim();
          if (!name) return prev;
          return { ...prev, slug: buildAutoSlug(name, slugRows) };
        });
      } catch {
        if (!cancelled) {
          setCities([]);
          setCategories([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyType, isVenue, locale]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const name = form.name.trim();
      if (!name) {
        setForm((prev) => (prev.slug ? { ...prev, slug: "" } : prev));
        return;
      }
      const slug = buildAutoSlug(name, takenSlugsRef.current);
      setForm((prev) => (prev.slug === slug ? prev : { ...prev, slug }));
    }, 250);
    return () => clearTimeout(timer);
  }, [form.name]);

  const setText = useCallback((key: keyof PanelForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setError(null);
    setSuccess(null);
  }, []);

  const setMedia = useCallback((key: keyof PanelForm, value: MediaUpload) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }, []);

  const toggleCategory = useCallback((id: string) => {
    setForm((prev) => {
      const list = prev.categories;
      return {
        ...prev,
        categories: list.includes(id)
          ? list.filter((x) => x !== id)
          : [...list, id],
      };
    });
    setFieldErrors((prev) => {
      if (!prev.categories) return prev;
      const next = { ...prev };
      delete next.categories;
      return next;
    });
  }, []);

  const onSubmit = useCallback(async () => {
    const errors: Record<string, boolean> = {};
    if (!form.name.trim()) errors.name = true;
    if (!form.slug.trim()) errors.slug = true;
    if (isVenue && !form.categories.length) errors.categories = true;
    if (!form.about.trim()) errors.about = true;
    if (!form.city) errors.city = true;
    if (isVenue && !form.address.trim()) errors.address = true;
    if (!isVenue && !form.phone.trim()) errors.phone = true;
    if (!isVenue && !form.email.trim()) errors.email = true;
    if (!form.companyType) errors.companyType = true;
    if (!form.companyName.trim()) errors.companyName = true;
    if (!form.taxName.trim()) errors.taxName = true;
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = true;
    }
    if (!isVenue && !form.email.trim()) errors.email = true;

    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError(t("formRequiredError"));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const about = { [locale]: form.about.trim() };
      await submitCompanyApplication({
        companyType,
        name: form.name.trim(),
        slug: form.slug.trim(),
        companyName: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        about,
        city: form.city,
        address: form.address.trim(),
        coordinates: isVenue ? form.coordinates.trim() : undefined,
        categories: isVenue ? form.categories : [],
        logo: form.logo,
        banner: form.banner,
        layout: isVenue ? form.layout : undefined,
        youtube: isVenue ? form.youtube.trim() : undefined,
        company: {
          type: form.companyType,
          name: form.companyName.trim(),
          taxName: form.taxName.trim(),
        },
        taxDocument: form.taxDocument,
        bank: {
          companyName: form.bankCompanyName.trim(),
          name: form.bankName.trim(),
          accountNo: form.bankAccountNo.trim(),
        },
        google: isVenue
          ? {
              keywords: form.googleKeywords.trim(),
              description: form.googleDescription.trim(),
            }
          : undefined,
        sourceLang: locale,
        isChecked: false,
      });
      setSuccess(copy.success);
      setForm(EMPTY_PANEL);
      setFieldErrors({});
    } catch {
      setError(t("formSubmitFailed"));
    } finally {
      setSubmitting(false);
    }
  }, [companyType, copy.success, form, isVenue, locale, t]);

  const pickLabel = isEn ? "Choose file" : "Dosya seç";
  const clearLabel = isEn ? "Remove" : "Kaldır";
  const sizeError = isEn
    ? "File must be under 5MB"
    : "Dosya 5MB'den küçük olmalıdır";

  return (
    <ApplicationFormShell
      title={copy.title}
      subtitle={copy.subtitle}
      submitLabel={copy.submit}
      onSubmit={() => void onSubmit()}
      submitting={submitting}
      error={error}
      success={success}
    >
      <FormSectionTitle
        title={
          isVenue
            ? isEn
              ? "Basic Information"
              : "Temel Bilgiler"
            : isEn
              ? "Company Details"
              : "Şirket Bilgileri"
        }
      />
      <FormField
        label={isEn ? "Name" : "Ad"}
        value={form.name}
        onChangeText={(v) => setText("name", v)}
        error={fieldErrors.name}
        placeholder={copy.namePlaceholder}
      />
      <FormField
        label="Slug"
        value={form.slug}
        onChangeText={() => undefined}
        editable={false}
        error={fieldErrors.slug}
        placeholder={isEn ? "Auto from name" : "İsimden otomatik"}
      />

      {isVenue ? (
        <ChipSelect
          label={isEn ? "Categories" : "Kategori"}
          selected={form.categories}
          onToggle={toggleCategory}
          options={categories}
        />
      ) : (
        <>
          <FormField
            label={isEn ? "Phone" : "Tel"}
            value={form.phone}
            onChangeText={(v) => setText("phone", v)}
            keyboardType="phone-pad"
            error={fieldErrors.phone}
            placeholder="+90 533 000 00 00"
          />
          <FormField
            label={isEn ? "Email" : "E-posta"}
            value={form.email}
            onChangeText={(v) => setText("email", v)}
            keyboardType="email-address"
            autoCapitalize="none"
            error={fieldErrors.email}
            placeholder="info@ornek.com"
          />
        </>
      )}

      {!isVenue ? (
        <>
          <FormSectionTitle
            title={isEn ? "About Company" : "Şirket Hakkında"}
          />
          <FormField
            label={copy.aboutLabel}
            value={form.about}
            onChangeText={(v) => setText("about", v)}
            multiline
            error={fieldErrors.about}
          />
        </>
      ) : null}

      <FormSectionTitle title={isEn ? "Media" : "Medya"} />
      <ImageFileField
        label="Logo"
        hint={IMAGE_HINTS.square[isEn ? "en" : "tr"]}
        value={form.logo}
        onChange={(v) => setMedia("logo", v)}
        onError={setError}
        pickLabel={pickLabel}
        clearLabel={clearLabel}
        sizeErrorLabel={sizeError}
      />
      <ImageFileField
        label="Banner"
        hint={IMAGE_HINTS.landscape[isEn ? "en" : "tr"]}
        value={form.banner}
        onChange={(v) => setMedia("banner", v)}
        onError={setError}
        pickLabel={pickLabel}
        clearLabel={clearLabel}
        sizeErrorLabel={sizeError}
      />

      {isVenue ? (
        <>
          <FormSectionTitle title={isEn ? "Venue Layout" : "Mekan Planı"} />
          <ImageFileField
            label={isEn ? "Venue Layout" : "Mekan Planı"}
            hint={IMAGE_HINTS.square[isEn ? "en" : "tr"]}
            value={form.layout}
            onChange={(v) => setMedia("layout", v)}
            onError={setError}
            pickLabel={pickLabel}
            clearLabel={clearLabel}
            sizeErrorLabel={sizeError}
          />

          <FormSectionTitle title="Youtube" />
          <InfoNote>{IMAGE_HINTS.youtube[isEn ? "en" : "tr"]}</InfoNote>
          <FormField
            label="Youtube ID"
            value={form.youtube}
            onChangeText={(v) => setText("youtube", v)}
            autoCapitalize="none"
            placeholder="dQw4w9WgXcQ"
          />

          <FormSectionTitle title={isEn ? "Contact" : "İletişim"} />
          <FormField
            label={isEn ? "Phone" : "Tel"}
            value={form.phone}
            onChangeText={(v) => setText("phone", v)}
            keyboardType="phone-pad"
            placeholder="+90 533 000 00 00"
          />
          <FormField
            label={isEn ? "Email" : "E-posta"}
            value={form.email}
            onChangeText={(v) => setText("email", v)}
            keyboardType="email-address"
            autoCapitalize="none"
            error={fieldErrors.email}
            placeholder="info@ornek.com"
          />

          <FormSectionTitle title={isEn ? "About Venue" : "Mekan Hakkında"} />
          <FormField
            label={copy.aboutLabel}
            value={form.about}
            onChangeText={(v) => setText("about", v)}
            multiline
            error={fieldErrors.about}
          />
        </>
      ) : null}

      <FormSectionTitle
        title={
          isVenue
            ? isEn
              ? "Address Information"
              : "Adres Bilgileri"
            : isEn
              ? "Address"
              : "Adres"
        }
      />
      <SingleSelect
        label={isEn ? "City" : "Şehir"}
        value={form.city}
        onChange={(id) => setText("city", id)}
        options={cities}
        error={fieldErrors.city}
      />
      <FormField
        label={isEn ? "Address" : "Adres"}
        value={form.address}
        onChangeText={(v) => setText("address", v)}
        error={fieldErrors.address}
        placeholder={
          isEn ? "Street, building, no..." : "Sokak, bina, no..."
        }
      />
      {isVenue ? (
        <FormField
          label={isEn ? "Coords" : "Koordinat"}
          value={form.coordinates}
          onChangeText={(v) => setText("coordinates", v)}
          placeholder="35.1856, 33.3823"
        />
      ) : null}

      <FormSectionTitle title={isEn ? "Legal" : "Yasal"} />
      <SingleSelect
        label={isEn ? "Type" : "Tip"}
        value={form.companyType}
        onChange={(id) => setText("companyType", id)}
        options={COMPANY_LEGAL_TYPES.map((c) => ({
          id: c.id,
          label: c.label,
        }))}
        error={fieldErrors.companyType}
      />
      <FormField
        label={isEn ? "Entity" : "Tüzel"}
        value={form.companyName}
        onChangeText={(v) => setText("companyName", v)}
        error={fieldErrors.companyName}
        placeholder={isEn ? "Legal entity name" : "Tüzel kişilik adı"}
      />
      <FormField
        label={isEn ? "Tax name" : "Vergi adı"}
        value={form.taxName}
        onChangeText={(v) => setText("taxName", v)}
        error={fieldErrors.taxName}
        placeholder={isEn ? "Tax office / name" : "Vergi dairesi / adı"}
      />
      <ImageFileField
        label={isEn ? "Tax doc" : "Vergi belgesi"}
        value={form.taxDocument}
        onChange={(v) => setMedia("taxDocument", v)}
        onError={setError}
        pickLabel={pickLabel}
        clearLabel={clearLabel}
        sizeErrorLabel={sizeError}
      />

      <FormSectionTitle title={isEn ? "Financial" : "Finansal"} />
      <FormField
        label={isEn ? "Account" : "Hesap adı"}
        value={form.bankCompanyName}
        onChangeText={(v) => setText("bankCompanyName", v)}
        placeholder={isEn ? "Account holder" : "Hesap sahibi"}
      />
      <FormField
        label={isEn ? "Bank" : "Banka"}
        value={form.bankName}
        onChangeText={(v) => setText("bankName", v)}
        placeholder={isEn ? "Bank name" : "Banka adı"}
      />
      <FormField
        label="IBAN"
        value={form.bankAccountNo}
        onChangeText={(v) => setText("bankAccountNo", v)}
        autoCapitalize="characters"
        placeholder="CY00 ACCT-000003"
      />

      {isVenue ? (
        <>
          <FormSectionTitle title="SEO" />
          <FormField
            label="Keywords"
            value={form.googleKeywords}
            onChangeText={(v) => setText("googleKeywords", v)}
            placeholder={
              isEn ? "concert, venue, nicosia" : "konser, mekan, lefkoşa"
            }
          />
          <FormField
            label={isEn ? "SEO desc" : "SEO açıklama"}
            value={form.googleDescription}
            onChangeText={(v) => setText("googleDescription", v)}
            placeholder={
              isEn ? "Short SEO description" : "Kısa SEO açıklaması"
            }
          />
        </>
      ) : null}
    </ApplicationFormShell>
  );
}

export function CompanyApplyScreen({ companyType }: Props) {
  if (companyType === "salesAgent") {
    return <SalesAgentForm companyType={companyType} />;
  }
  return <PanelCompanyForm companyType={companyType} />;
}
