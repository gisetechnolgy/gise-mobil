import { api } from './api';

export type AffiliateFormPayload = {
  facebook: string;
  twitter: string;
  instagram: string;
  tiktok: string;
  user: string;
  name: string;
  surname: string;
  isChecked: boolean;
};

export async function saveAffiliateForm(
  formData: AffiliateFormPayload,
): Promise<void> {
  await api.post('/affiliateForm', formData, { auth: true });
}
