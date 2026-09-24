import { useCallback, useEffect, useState } from "react";
import {
  ApplicationFormShell,
  FormField,
  SingleSelect,
} from "../components/ApplicationFormShell";
import { useLocale, useTranslation } from "../context/_LocaleContext";
import {
  fetchAdPackages,
  submitAdvertiseApplication,
  type AdPackage,
} from "../../lib/applications";

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  companyName: "",
  website: "",
  packageId: "",
  preferredStart: "",
  message: "",
};

export default function AdvertiseApplyScreen() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const [form, setForm] = useState(EMPTY);
  const [packages, setPackages] = useState<AdPackage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void fetchAdPackages(locale)
      .then(setPackages)
      .catch(() => setPackages([]));
  }, [locale]);

  const setField = useCallback((key: keyof typeof EMPTY, value: string) => {
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
    if (!form.packageId) errors.packageId = true;
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError(t("formRequiredError"));
      return;
    }

    const selected = packages.find((p) => p.id === form.packageId);
    setSubmitting(true);
    setError(null);
    try {
      await submitAdvertiseApplication({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        companyName: form.companyName.trim(),
        website: form.website.trim(),
        packageId: form.packageId,
        packageType: selected?.type,
        packageName: selected?.name,
        preferredStart: form.preferredStart.trim(),
        message: form.message.trim(),
        isChecked: false,
      });
      setSuccess(t("advertiseSuccess"));
      setForm(EMPTY);
      setFieldErrors({});
    } catch {
      setError(t("formSubmitFailed"));
    } finally {
      setSubmitting(false);
    }
  }, [form, packages, t]);

  return (
    <ApplicationFormShell
      title={t("advertiseTitle")}
      subtitle={t("advertiseSubtitle")}
      submitLabel={t("advertiseSubmit")}
      onSubmit={() => void onSubmit()}
      submitting={submitting}
      error={error}
      success={success}
    >
      <FormField
        label={t("fullName")}
        value={form.name}
        onChangeText={(v) => setField("name", v)}
        placeholder={t("fullName")}
        autoCapitalize="words"
        error={fieldErrors.name}
      />
      <FormField
        label={t("email")}
        value={form.email}
        onChangeText={(v) => setField("email", v)}
        placeholder="info@ornek.com"
        keyboardType="email-address"
        autoCapitalize="none"
        error={fieldErrors.email}
      />
      <FormField
        label={t("phone")}
        value={form.phone}
        onChangeText={(v) => setField("phone", v)}
        placeholder="+90 533 000 00 00"
        keyboardType="phone-pad"
        error={fieldErrors.phone}
      />
      <FormField
        label={t("company")}
        value={form.companyName}
        onChangeText={(v) => setField("companyName", v)}
        placeholder={t("company")}
      />
      <FormField
        label="Website"
        value={form.website}
        onChangeText={(v) => setField("website", v)}
        placeholder="https://"
        keyboardType="url"
        autoCapitalize="none"
      />
      <SingleSelect
        label={t("adPackage")}
        value={form.packageId}
        onChange={(id) => setField("packageId", id)}
        options={packages.map((p) => ({ id: p.id, label: p.label }))}
        error={fieldErrors.packageId}
      />
      <FormField
        label={t("preferredStart")}
        value={form.preferredStart}
        onChangeText={(v) => setField("preferredStart", v)}
        placeholder="YYYY-MM-DD"
      />
      <FormField
        label={t("message")}
        value={form.message}
        onChangeText={(v) => setField("message", v)}
        placeholder={t("advertiseMessagePlaceholder")}
        multiline
      />
    </ApplicationFormShell>
  );
}
