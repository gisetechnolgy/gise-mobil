/**
 * Kayıt formu — ülke/şehir seçimi (UI Türkçe).
 * Firestore `city`: TR hariç İngilizce küçük harf; TR listedeki Türkçe il adı.
 */

export const REGISTER_COUNTRY_OPTIONS = [
  { code: 'CY', label: 'Kıbrıs' },
  { code: 'TR', label: 'Türkiye' },
  { code: 'GB', label: 'İngiltere' },
  { code: 'DE', label: 'Almanya' },
  { code: 'NL', label: 'Hollanda' },
  { code: 'other', label: 'Diğer' },
] as const;

/** Ülke seçilince telefon ön eki (Kupon web defaultCountry mantığı) */
export const REGISTER_COUNTRY_PHONE_CODE: Record<string, string> = {
  CY: '+357',
  TR: '+90',
  GB: '+44',
  DE: '+49',
  NL: '+31',
};

const CYPRUS_CITIES = [
  'Lefkoşa',
  'Gazimağusa',
  'Girne',
  'Güzelyurt',
  'Lefke',
  'İskele',
  'Limasol',
  'Larnaka',
  'Baf',
];

const TURKEY_CITIES = [
  'Adana',
  'Adıyaman',
  'Afyonkarahisar',
  'Ağrı',
  'Aksaray',
  'Amasya',
  'Ankara',
  'Antalya',
  'Ardahan',
  'Artvin',
  'Aydın',
  'Balıkesir',
  'Bartın',
  'Batman',
  'Bayburt',
  'Bilecik',
  'Bingöl',
  'Bitlis',
  'Bolu',
  'Burdur',
  'Bursa',
  'Çanakkale',
  'Çankırı',
  'Çorum',
  'Denizli',
  'Diyarbakır',
  'Düzce',
  'Edirne',
  'Elazığ',
  'Erzincan',
  'Erzurum',
  'Eskişehir',
  'Gaziantep',
  'Giresun',
  'Gümüşhane',
  'Hakkari',
  'Hatay',
  'Iğdır',
  'Isparta',
  'İstanbul',
  'İzmir',
  'Kahramanmaraş',
  'Karabük',
  'Karaman',
  'Kars',
  'Kastamonu',
  'Kayseri',
  'Kilis',
  'Kırıkkale',
  'Kırklareli',
  'Kırşehir',
  'Kocaeli',
  'Konya',
  'Kütahya',
  'Malatya',
  'Manisa',
  'Mardin',
  'Mersin',
  'Muğla',
  'Muş',
  'Nevşehir',
  'Niğde',
  'Ordu',
  'Osmaniye',
  'Rize',
  'Sakarya',
  'Samsun',
  'Şanlıurfa',
  'Siirt',
  'Sinop',
  'Şırnak',
  'Sivas',
  'Tekirdağ',
  'Tokat',
  'Trabzon',
  'Tunceli',
  'Uşak',
  'Van',
  'Yalova',
  'Yozgat',
  'Zonguldak',
];

export const REGISTER_CITIES_BY_COUNTRY: Record<string, string[]> = {
  CY: CYPRUS_CITIES,
  TR: TURKEY_CITIES,
};

/** CY ve TR için listeden seçim; diğer ülkelerde serbest metin */
export function isRegisterCitySelectable(countryCode: string): boolean {
  return countryCode === 'CY' || countryCode === 'TR';
}

/** Kıbrıs: modalda Türkçe görünen ad → Firestore/SSO İngilizce küçük harf */
export const REGISTER_CY_CITY_EN: Record<string, string> = {
  Lefkoşa: 'nicosia',
  Gazimağusa: 'famagusta',
  Girne: 'kyrenia',
  Güzelyurt: 'morphou',
  Lefke: 'lefke',
  İskele: 'trikomo',
  Limasol: 'limassol',
  Larnaka: 'larnaca',
  Baf: 'paphos',
};

/**
 * Firestore'a yazılacak şehir:
 * - TR: Türkçe (ör. "İstanbul")
 * - CY: İngilizce küçük (ör. "nicosia")
 * - Diğer: kullanıcı metni lowercase
 */
export function normalizeCityForFirestore(
  countryCode: string,
  city: string,
): string {
  const trimmed = city.trim();
  if (!trimmed) return '';

  if (countryCode === 'TR') {
    return trimmed;
  }

  if (countryCode === 'CY') {
    return REGISTER_CY_CITY_EN[trimmed] ?? trimmed.toLowerCase();
  }

  return trimmed.toLowerCase();
}

/**
 * Telefon ülke kodları — kapsamlı dünya listesi.
 * Listeyi alfabetik Türkçe etikete göre dizdik. İlk 3 (Türkiye/KKTC/Kıbrıs)
 * en sık kullanılanlar olduğu için listenin başına pin'lendi; gerisi
 * alfabetik. Aynı kodu farklı ülkeler paylaşabilir (örn. +1 ABD/Kanada,
 * +7 Rusya/Kazakistan); ayırt edici label ile listeleriz.
 */
export const REGISTER_PHONE_CODES = [
  // Pinned (en sık kullanılanlar)
  { code: '+90', country: 'TR', flag: '🇹🇷', label: 'Türkiye' },
  { code: '+357', country: 'CY', flag: '🇨🇾', label: 'Kıbrıs (CY)' },

  // A-Z (alfabetik)
  { code: '+93', country: 'AF', flag: '🇦🇫', label: 'Afganistan' },
  { code: '+49', country: 'DE', flag: '🇩🇪', label: 'Almanya' },
  { code: '+1', country: 'US', flag: '🇺🇸', label: 'ABD' },
  { code: '+376', country: 'AD', flag: '🇦🇩', label: 'Andorra' },
  { code: '+244', country: 'AO', flag: '🇦🇴', label: 'Angola' },
  { code: '+54', country: 'AR', flag: '🇦🇷', label: 'Arjantin' },
  { code: '+355', country: 'AL', flag: '🇦🇱', label: 'Arnavutluk' },
  { code: '+374', country: 'AM', flag: '🇦🇲', label: 'Ermenistan' },
  { code: '+61', country: 'AU', flag: '🇦🇺', label: 'Avustralya' },
  { code: '+43', country: 'AT', flag: '🇦🇹', label: 'Avusturya' },
  { code: '+994', country: 'AZ', flag: '🇦🇿', label: 'Azerbaycan' },
  { code: '+880', country: 'BD', flag: '🇧🇩', label: 'Bangladeş' },
  { code: '+375', country: 'BY', flag: '🇧🇾', label: 'Belarus' },
  { code: '+32', country: 'BE', flag: '🇧🇪', label: 'Belçika' },
  { code: '+591', country: 'BO', flag: '🇧🇴', label: 'Bolivya' },
  { code: '+387', country: 'BA', flag: '🇧🇦', label: 'Bosna Hersek' },
  { code: '+55', country: 'BR', flag: '🇧🇷', label: 'Brezilya' },
  { code: '+359', country: 'BG', flag: '🇧🇬', label: 'Bulgaristan' },
  { code: '+971', country: 'AE', flag: '🇦🇪', label: 'BAE' },
  { code: '+86', country: 'CN', flag: '🇨🇳', label: 'Çin' },
  { code: '+45', country: 'DK', flag: '🇩🇰', label: 'Danimarka' },
  { code: '+20', country: 'EG', flag: '🇪🇬', label: 'Mısır' },
  { code: '+593', country: 'EC', flag: '🇪🇨', label: 'Ekvador' },
  { code: '+372', country: 'EE', flag: '🇪🇪', label: 'Estonya' },
  { code: '+251', country: 'ET', flag: '🇪🇹', label: 'Etiyopya' },
  { code: '+33', country: 'FR', flag: '🇫🇷', label: 'Fransa' },
  { code: '+63', country: 'PH', flag: '🇵🇭', label: 'Filipinler' },
  { code: '+970', country: 'PS', flag: '🇵🇸', label: 'Filistin' },
  { code: '+358', country: 'FI', flag: '🇫🇮', label: 'Finlandiya' },
  { code: '+995', country: 'GE', flag: '🇬🇪', label: 'Gürcistan' },
  { code: '+233', country: 'GH', flag: '🇬🇭', label: 'Gana' },
  { code: '+27', country: 'ZA', flag: '🇿🇦', label: 'Güney Afrika' },
  { code: '+82', country: 'KR', flag: '🇰🇷', label: 'Güney Kore' },
  { code: '+91', country: 'IN', flag: '🇮🇳', label: 'Hindistan' },
  { code: '+31', country: 'NL', flag: '🇳🇱', label: 'Hollanda' },
  { code: '+852', country: 'HK', flag: '🇭🇰', label: 'Hong Kong' },
  { code: '+44', country: 'GB', flag: '🇬🇧', label: 'İngiltere' },
  { code: '+62', country: 'ID', flag: '🇮🇩', label: 'Endonezya' },
  { code: '+353', country: 'IE', flag: '🇮🇪', label: 'İrlanda' },
  { code: '+964', country: 'IQ', flag: '🇮🇶', label: 'Irak' },
  { code: '+98', country: 'IR', flag: '🇮🇷', label: 'İran' },
  { code: '+972', country: 'IL', flag: '🇮🇱', label: 'İsrail' },
  { code: '+34', country: 'ES', flag: '🇪🇸', label: 'İspanya' },
  { code: '+46', country: 'SE', flag: '🇸🇪', label: 'İsveç' },
  { code: '+41', country: 'CH', flag: '🇨🇭', label: 'İsviçre' },
  { code: '+39', country: 'IT', flag: '🇮🇹', label: 'İtalya' },
  { code: '+354', country: 'IS', flag: '🇮🇸', label: 'İzlanda' },
  { code: '+81', country: 'JP', flag: '🇯🇵', label: 'Japonya' },
  { code: '+855', country: 'KH', flag: '🇰🇭', label: 'Kamboçya' },
  { code: '+237', country: 'CM', flag: '🇨🇲', label: 'Kamerun' },
  { code: '+1', country: 'CA', flag: '🇨🇦', label: 'Kanada' },
  { code: '+974', country: 'QA', flag: '🇶🇦', label: 'Katar' },
  { code: '+7', country: 'KZ', flag: '🇰🇿', label: 'Kazakistan' },
  { code: '+254', country: 'KE', flag: '🇰🇪', label: 'Kenya' },
  { code: '+996', country: 'KG', flag: '🇰🇬', label: 'Kırgızistan' },
  { code: '+57', country: 'CO', flag: '🇨🇴', label: 'Kolombiya' },
  { code: '+506', country: 'CR', flag: '🇨🇷', label: 'Kosta Rika' },
  { code: '+385', country: 'HR', flag: '🇭🇷', label: 'Hırvatistan' },
  { code: '+53', country: 'CU', flag: '🇨🇺', label: 'Küba' },
  { code: '+965', country: 'KW', flag: '🇰🇼', label: 'Kuveyt' },
  { code: '+371', country: 'LV', flag: '🇱🇻', label: 'Letonya' },
  { code: '+961', country: 'LB', flag: '🇱🇧', label: 'Lübnan' },
  { code: '+218', country: 'LY', flag: '🇱🇾', label: 'Libya' },
  { code: '+370', country: 'LT', flag: '🇱🇹', label: 'Litvanya' },
  { code: '+352', country: 'LU', flag: '🇱🇺', label: 'Lüksemburg' },
  { code: '+36', country: 'HU', flag: '🇭🇺', label: 'Macaristan' },
  { code: '+389', country: 'MK', flag: '🇲🇰', label: 'Makedonya' },
  { code: '+60', country: 'MY', flag: '🇲🇾', label: 'Malezya' },
  { code: '+356', country: 'MT', flag: '🇲🇹', label: 'Malta' },
  { code: '+52', country: 'MX', flag: '🇲🇽', label: 'Meksika' },
  { code: '+373', country: 'MD', flag: '🇲🇩', label: 'Moldova' },
  { code: '+377', country: 'MC', flag: '🇲🇨', label: 'Monako' },
  { code: '+976', country: 'MN', flag: '🇲🇳', label: 'Moğolistan' },
  { code: '+382', country: 'ME', flag: '🇲🇪', label: 'Karadağ' },
  { code: '+212', country: 'MA', flag: '🇲🇦', label: 'Fas' },
  { code: '+95', country: 'MM', flag: '🇲🇲', label: 'Myanmar' },
  { code: '+977', country: 'NP', flag: '🇳🇵', label: 'Nepal' },
  { code: '+234', country: 'NG', flag: '🇳🇬', label: 'Nijerya' },
  { code: '+850', country: 'KP', flag: '🇰🇵', label: 'Kuzey Kore' },
  { code: '+47', country: 'NO', flag: '🇳🇴', label: 'Norveç' },
  { code: '+968', country: 'OM', flag: '🇴🇲', label: 'Umman' },
  { code: '+998', country: 'UZ', flag: '🇺🇿', label: 'Özbekistan' },
  { code: '+92', country: 'PK', flag: '🇵🇰', label: 'Pakistan' },
  { code: '+507', country: 'PA', flag: '🇵🇦', label: 'Panama' },
  { code: '+51', country: 'PE', flag: '🇵🇪', label: 'Peru' },
  { code: '+48', country: 'PL', flag: '🇵🇱', label: 'Polonya' },
  { code: '+351', country: 'PT', flag: '🇵🇹', label: 'Portekiz' },
  { code: '+40', country: 'RO', flag: '🇷🇴', label: 'Romanya' },
  { code: '+7', country: 'RU', flag: '🇷🇺', label: 'Rusya' },
  { code: '+221', country: 'SN', flag: '🇸🇳', label: 'Senegal' },
  { code: '+381', country: 'RS', flag: '🇷🇸', label: 'Sırbistan' },
  { code: '+65', country: 'SG', flag: '🇸🇬', label: 'Singapur' },
  { code: '+421', country: 'SK', flag: '🇸🇰', label: 'Slovakya' },
  { code: '+386', country: 'SI', flag: '🇸🇮', label: 'Slovenya' },
  { code: '+94', country: 'LK', flag: '🇱🇰', label: 'Sri Lanka' },
  { code: '+249', country: 'SD', flag: '🇸🇩', label: 'Sudan' },
  { code: '+966', country: 'SA', flag: '🇸🇦', label: 'Suudi Arabistan' },
  { code: '+963', country: 'SY', flag: '🇸🇾', label: 'Suriye' },
  { code: '+420', country: 'CZ', flag: '🇨🇿', label: 'Çekya' },
  { code: '+886', country: 'TW', flag: '🇹🇼', label: 'Tayvan' },
  { code: '+66', country: 'TH', flag: '🇹🇭', label: 'Tayland' },
  { code: '+992', country: 'TJ', flag: '🇹🇯', label: 'Tacikistan' },
  { code: '+216', country: 'TN', flag: '🇹🇳', label: 'Tunus' },
  { code: '+993', country: 'TM', flag: '🇹🇲', label: 'Türkmenistan' },
  { code: '+256', country: 'UG', flag: '🇺🇬', label: 'Uganda' },
  { code: '+380', country: 'UA', flag: '🇺🇦', label: 'Ukrayna' },
  { code: '+598', country: 'UY', flag: '🇺🇾', label: 'Uruguay' },
  { code: '+58', country: 'VE', flag: '🇻🇪', label: 'Venezuela' },
  { code: '+84', country: 'VN', flag: '🇻🇳', label: 'Vietnam' },
  { code: '+967', country: 'YE', flag: '🇾🇪', label: 'Yemen' },
  { code: '+64', country: 'NZ', flag: '🇳🇿', label: 'Yeni Zelanda' },
  { code: '+30', country: 'GR', flag: '🇬🇷', label: 'Yunanistan' },
  { code: '+962', country: 'JO', flag: '🇯🇴', label: 'Ürdün' },
  { code: '+56', country: 'CL', flag: '🇨🇱', label: 'Şili' },
] as const;

export const DEFAULT_PHONE_CODE = '+90';

export const REGISTER_GENDER_OPTIONS = [
  { value: 'male', label: 'Erkek' },
  { value: 'female', label: 'Kadın' },
  { value: 'other', label: 'Diğer' },
] as const;

export const REGISTER_DAY_OPTIONS = Array.from({ length: 31 }, (_, i) =>
  String(i + 1).padStart(2, '0'),
);

export const REGISTER_MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, '0'),
);

const currentYear = new Date().getFullYear();
export const REGISTER_YEAR_OPTIONS = Array.from({ length: 100 }, (_, i) =>
  String(currentYear - i),
);
