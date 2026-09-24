export type LocalizedLabel = { tr: string; en: string };

export type CorporateNavItem = {
  slug: string;
  label: LocalizedLabel;
  type: 'page' | 'pdf' | 'presskit';
  pageId?: string;
  href?: string;
};

const L = (tr: string, en = tr): LocalizedLabel => ({ tr, en });

export const CORPORATE_SUNUM_PDF = 'https://sunum.gisekibris.com/sunum.pdf';

/** Web corporate-nav ile aynı slug’lar */
export const CORPORATE_NAV_ITEMS: CorporateNavItem[] = [
  {
    slug: 'hakkimizda',
    label: L('Hakkımızda', 'About Us'),
    type: 'page',
    pageId: 'hakkimizda',
  },
  {
    slug: 'kurumsal-sunum',
    label: L('Kurumsal Sunum', 'Corporate Presentation'),
    type: 'pdf',
    href: CORPORATE_SUNUM_PDF,
  },
  {
    slug: 'presskit',
    label: L('Press Kit', 'Press Kit'),
    type: 'presskit',
  },
  {
    slug: 'sozlesmeler-ve-politikalar',
    label: L('Sözleşmeler ve Politikalar', 'Agreements & Policies'),
    type: 'page',
    pageId: 'sozlesmeler-ve-politikalar',
  },
  {
    slug: 'gizlilik',
    label: L('Gizlilik Politikası', 'Privacy Policy'),
    type: 'page',
    pageId: 'gizlilik',
  },
  {
    slug: 'hizmet-sozlesmesi',
    label: L('Hizmet Sözleşmesi', 'Terms of Service'),
    type: 'page',
    pageId: 'hizmet-sozlesmesi',
  },
  {
    slug: 'odeme-kosullari',
    label: L('Ödeme Koşulları', 'Payment Terms'),
    type: 'page',
    pageId: 'odeme-kosullari',
  },
  {
    slug: 'kvkk',
    label: L('KVKK Aydınlatma Metni', 'Personal Data Notice'),
    type: 'page',
    pageId: 'kvkk',
  },
];

export const CORPORATE_DEFAULT_SLUG = 'hakkimizda';

export function getCorporateNavItem(
  slug: string,
): CorporateNavItem | undefined {
  return CORPORATE_NAV_ITEMS.find((item) => item.slug === slug);
}

export function localizeCorporateLabel(
  label: LocalizedLabel,
  locale: 'tr' | 'en',
): string {
  return locale === 'en' ? label.en || label.tr : label.tr;
}
