export type LocalizedLabel = { tr: string; en: string };

export type FooterMenuAction =
  | { type: 'route'; href: string }
  | { type: 'page'; pageId: string }
  | { type: 'corporate'; slug: string };

export type FooterMenuItem = {
  id: string;
  label: LocalizedLabel;
  action: FooterMenuAction;
};

export type FooterMenuColumn = {
  id: string;
  title: LocalizedLabel;
  items: FooterMenuItem[];
};

const L = (tr: string, en = tr): LocalizedLabel => ({ tr, en });

/**
 * Web footer ile aynı başlık sırası.
 * Etkinlikler tab bar’da; Mekanlar hamburger’de.
 * Hepsi uygulama içi rota (web’e atılmaz).
 */
export const FOOTER_MENU_COLUMNS: FooterMenuColumn[] = [
  {
    id: 'explore',
    title: L('KEŞFET', 'EXPLORE'),
    items: [
      {
        id: 'venues',
        label: L('Mekanlar', 'Venues'),
        action: { type: 'route', href: '/(tabs)/venues' },
      },
      {
        id: 'companies',
        label: L('Organizatörler', 'Organisers'),
        action: { type: 'route', href: '/companies' },
      },
      {
        id: 'news',
        label: L('Bloglar', 'Blogs'),
        action: { type: 'route', href: '/news' },
      },
      {
        id: 'loyalty',
        label: L('Sadakat Uygulamaları', 'Loyalty Apps'),
        action: { type: 'route', href: '/partners/loyalty' },
      },
    ],
  },
  {
    id: 'work',
    title: L('BİZİMLE ÇALIŞ', 'WORK WITH US'),
    items: [
      {
        id: 'advertise',
        label: L('Reklam Ver', 'Advertise'),
        action: { type: 'route', href: '/apply/advertise' },
      },
      {
        id: 'venueApply',
        label: L('Mekân Başvurusu Yap', 'Apply as Venue'),
        action: { type: 'route', href: '/apply/venue' },
      },
      {
        id: 'organiserApply',
        label: L('Organizatör Başvurusu Yap', 'Apply as Organiser'),
        action: { type: 'route', href: '/apply/organiser' },
      },
      {
        id: 'salesPartner',
        label: L('Satış Ortağı Başvurusu Yap', 'Apply as Sales Partner'),
        action: { type: 'route', href: '/sales-partner' },
      },
    ],
  },
  {
    id: 'practicapp',
    title: L('PRACTICAPP', 'PRACTICAPP'),
    items: [
      {
        id: 'kupon',
        label: L('Kupon Kıbrıs', 'Kupon Kıbrıs'),
        action: { type: 'route', href: '/partners/kupon' },
      },
      {
        id: 'bostamasa',
        label: L('Boşta Masa', 'Boşta Masa'),
        action: { type: 'route', href: '/partners/bostamasa' },
      },
      {
        id: 'kariyer',
        label: L('Kariyer Kıbrıs', 'Kariyer Kıbrıs'),
        action: { type: 'route', href: '/partners/kariyer' },
      },
    ],
  },
  {
    id: 'corporate',
    title: L('KURUMSAL', 'CORPORATE'),
    items: [
      {
        id: 'hakkimizda',
        label: L('Hakkımızda', 'About Us'),
        action: { type: 'corporate', slug: 'hakkimizda' },
      },
      {
        id: 'kurumsal-sunum',
        label: L('Kurumsal Sunum', 'Corporate Presentation'),
        action: { type: 'corporate', slug: 'kurumsal-sunum' },
      },
      {
        id: 'presskit',
        label: L('Press Kit', 'Press Kit'),
        action: { type: 'corporate', slug: 'presskit' },
      },
      {
        id: 'sozlesmeler',
        label: L('Sözleşmeler ve Politikalar', 'Agreements & Policies'),
        action: { type: 'corporate', slug: 'sozlesmeler-ve-politikalar' },
      },
      {
        id: 'kvkk',
        label: L('KVKK Aydınlatma Metni', 'Personal Data Notice'),
        action: { type: 'corporate', slug: 'kvkk' },
      },
    ],
  },
  {
    id: 'help',
    title: L('YARDIM', 'HELP'),
    items: [
      {
        id: 'support',
        label: L('Destek', 'Support'),
        action: { type: 'route', href: '/(tabs)/support' },
      },
      {
        id: 'helpVideos',
        label: L('Yardım Videoları', 'Help Videos'),
        action: { type: 'page', pageId: 'yardim-videolari' },
      },
      {
        id: 'contact',
        label: L('İletişim', 'Contact'),
        action: { type: 'route', href: '/contact' },
      },
    ],
  },
];

export function localizeLabel(
  label: LocalizedLabel,
  locale: 'tr' | 'en',
): string {
  return locale === 'en' ? label.en || label.tr : label.tr;
}
