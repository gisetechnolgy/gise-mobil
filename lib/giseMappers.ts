import { APP_NAME, GISE_WEB_URL } from './appConfig';
import { getAppLocale, type AppLocale } from './appLocale';
import { t } from './i18n';

export type GiseUserRecord = {
  id: string;
  email?: string | null;
  name?: string | null;
  surname?: string | null;
  mobile?: string | null;
  isVerified?: boolean;
  crole?: string | null;
  rid?: string | null;
  isManagerSaleModeActive?: boolean;
  hasDeleteRequest?: boolean;
  deletedUser?: boolean;
};

export type GiseListResponse<T> = {
  data?: T[];
  total?: number;
  page?: number;
  perPage?: number;
};

/** Ticket.sale string veya { id } olabilir. */
function extractSaleId(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === 'string' || typeof raw === 'number') {
    const s = String(raw).trim();
    return s && s !== '[object Object]' ? s : null;
  }
  if (typeof raw === 'object') {
    const row = raw as Record<string, unknown>;
    const id = row.id ?? row.saleId ?? row.sale;
    if (id != null && (typeof id === 'string' || typeof id === 'number')) {
      const s = String(id).trim();
      return s || null;
    }
  }
  return null;
}

export function pickLocalizedText(
  value: unknown,
  locale: AppLocale = getAppLocale(),
): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const o = value as Record<string, unknown>;
    const tr = o.tr;
    const en = o.en;
    if (locale === 'en' && typeof en === 'string' && en.trim()) return en;
    if (locale === 'tr' && typeof tr === 'string' && tr.trim()) return tr;
    if (typeof en === 'string' && en.trim()) return en;
    if (typeof tr === 'string') return tr;
  }
  return '';
}

export function toIsoDate(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const sec = Number((value as { seconds?: unknown }).seconds);
    if (Number.isFinite(sec)) return new Date(sec * 1000).toISOString();
  }
  return null;
}

export function pickImageSrc(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'object' && value !== null && 'src' in value) {
    const src = (value as { src?: unknown }).src;
    return typeof src === 'string' && src.trim() ? src.trim() : null;
  }
  return null;
}

export function buildFullName(user: GiseUserRecord): string {
  const parts = [user.name, user.surname].filter(
    (p): p is string => typeof p === 'string' && !!p.trim(),
  );
  const joined = parts.join(' ').trim();
  return joined || user.email?.trim() || t('defaultUserName');
}

function hasActiveSpecialOffer(raw: Record<string, unknown>): boolean {
  const coupons = raw.coupons;
  if (!Array.isArray(coupons) || coupons.length === 0) return false;
  const now = Date.now();
  return coupons.some((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    const coupon = entry as Record<string, unknown>;
    const stock = Number(coupon.stock ?? 0);
    const used = Number(coupon.used ?? 0);
    if (stock <= 0 || used >= stock) return false;
    if (coupon.activeUntil) {
      const until = new Date(`${String(coupon.activeUntil)}T23:59:59`);
      if (!Number.isNaN(until.getTime()) && until.getTime() < now) return false;
    }
    return true;
  });
}

export function mapEventRecord(raw: Record<string, unknown>) {
  const id = String(raw.id ?? '');
  const banner = pickImageSrc(raw.banner) ?? pickImageSrc(raw.badge);
  const bannerCard = pickImageSrc(raw.bannerCard);
  const venueLayout = pickImageSrc(raw.venueLayout);
  const rulesRaw = raw.rules as Record<string, unknown> | null | undefined;
  const dressRaw = rulesRaw?.dress;
  const dressList = Array.isArray(dressRaw)
    ? dressRaw.map(String)
    : dressRaw != null
      ? [String(dressRaw)]
      : [];

  const typeNum = Number(raw.type);
  const type = Number.isFinite(typeNum) ? typeNum : null;

  return {
    id,
    title: String(raw.name ?? ''),
    description: pickLocalizedText(raw.description) || pickLocalizedText(raw.details),
    imageUrl: banner,
    /** Web design1 (dikey kart): bannerCard → banner */
    bannerCardUrl: bannerCard,
    venueLayoutImageUrl: venueLayout,
    startsAt: toIsoDate(raw.startdate) ?? '',
    endsAt: toIsoDate(raw.enddate),
    /** 3 = koltuklu (seated) etkinlik */
    type,
    category: raw.category != null ? String(raw.category) : null,
    categoryLabel: raw.category != null ? String(raw.category) : null,
    subcategories: Array.isArray(raw.subcategories)
      ? raw.subcategories.map(String)
      : [],
    hasSpecialOffer: hasActiveSpecialOffer(raw),
    city: raw.city != null ? String(raw.city) : null,
    venueId: raw.venue != null ? String(raw.venue) : null,
    venueName: null as string | null,
    organisationCompanyIds: Array.isArray(raw.organisationCompanies)
      ? raw.organisationCompanies.map(String)
      : [],
    videoUrl: raw.videoURL != null ? String(raw.videoURL) : null,
    eventUrl: id ? `${GISE_WEB_URL}/etkinlikler/${id}` : undefined,
    rules: rulesRaw
      ? {
          age: rulesRaw.age != null ? String(rulesRaw.age) : null,
          couples:
            typeof rulesRaw.couples === 'number'
              ? rulesRaw.couples
              : Array.isArray(rulesRaw.couples)
                ? rulesRaw.couples.length
                : null,
          dress: dressList,
        }
      : null,
    details: pickLocalizedText(raw.details),
    venueSlug: undefined as string | undefined,
    hideFromWebHome: raw.hideFromWebHome === true,
    hideFromMobileHome: raw.hideFromMobileHome === true,
    startingPrice:
      raw.startingPrice != null && Number(raw.startingPrice) > 0
        ? Number(raw.startingPrice)
        : null,
    commissionFee: Number(raw.commissionFee ?? 0) || 0,
    isCommissionExtra: raw.isCommissionExtra === true,
    urgency:
      raw.urgency && typeof raw.urgency === 'object'
        ? (raw.urgency as Record<string, unknown>)
        : null,
    badge:
      raw.badge && typeof raw.badge === 'object'
        ? (raw.badge as {
            label?: { tr?: string; en?: string } | string;
            textColor?: string;
            backgroundColor?: string;
          })
        : null,
  };
}

export function mapTicketRecord(raw: Record<string, unknown>) {
  const pnr = typeof raw.pnr === 'string' ? raw.pnr : '';
  const event =
    raw.event && typeof raw.event === 'object'
      ? (raw.event as Record<string, unknown>)
      : null;
  const user =
    raw.user && typeof raw.user === 'object'
      ? (raw.user as Record<string, unknown>)
      : null;
  const product =
    raw.product && typeof raw.product === 'object'
      ? (raw.product as Record<string, unknown>)
      : null;

  const holderName = user
    ? [user.name, user.surname].filter(Boolean).join(' ').trim()
    : '';
  const holderEmail =
    user?.email != null ? String(user.email) : null;
  const holderPhone =
    user?.mobile != null
      ? String(user.mobile)
      : user?.phone != null
        ? String(user.phone)
        : null;
  const seats = Array.isArray(raw.seats) ? raw.seats : [];
  const ticketLabel = product
    ? pickLocalizedText(product.title) || pickLocalizedText(product.description)
    : seats.length > 0
      ? `${seats.length} koltuk`
      : '';

  const eventStart =
    event?.session != null
      ? toIsoDate(event.session)
      : toIsoDate(event?.startdate);

  return {
    id: String(raw.id ?? pnr),
    ticketNo: pnr,
    qrData: pnr,
    eventTitle: event?.name != null ? String(event.name) : t('defaultEventTitle'),
    holderName: holderName || '—',
    holderEmail,
    holderPhone,
    ticketLabel: ticketLabel || t('defaultTicketLabel'),
    venueName: raw.venue != null ? String(raw.venue) : null,
    eventDate: eventStart,
    createdAt: toIsoDate(raw.created),
    isUsed: raw.isUsed === true,
    usedAt: raw.isUsedAt != null ? String(raw.isUsedAt) : null,
    usedBy: raw.isUsedBy != null ? String(raw.isUsedBy) : null,
    channel: raw.channel != null ? String(raw.channel) : null,
    productId: product
      ? String(product.id ?? product.key ?? '').trim() || null
      : null,
    /** Ürün iade edilebilir mi (API enrich; yoksa null) */
    productRefundable:
      product?.refundable == null
        ? null
        : product.refundable === true ||
          product.refundable === 1 ||
          product.refundable === 'true',
    /** Etkinlik iade açık mı (API enrich) */
    eventRefundEnabled: event?.refundEnabled !== false,
    /** API enrich (opsiyonel; buton buna kilitli değil) */
    refundEligible:
      raw.refundEligible == null ? null : raw.refundEligible === true,
    /** Satış id — müşteri iadesi için gerekli */
    saleId: extractSaleId(raw.sale),
    extras: (() => {
      const ex =
        raw.extras && typeof raw.extras === 'object'
          ? (raw.extras as Record<string, unknown>)
          : null;
      if (!ex) {
        return {
          refunded: false,
          refundPending: false,
          refundRequested: false,
          refundProcessSuccess: false,
        };
      }
      return {
        refunded: ex.refunded === true,
        refundPending: ex.refundPending === true,
        refundRequested: ex.refundRequested === true,
        refundProcessSuccess: ex.refundProcessSuccess === true,
      };
    })(),
  };
}

export function mapVenueRecord(raw: Record<string, unknown>) {
  const id = String(raw.id ?? '');
  return {
    id,
    name: String(raw.name ?? ''),
    slug: raw.slug != null ? String(raw.slug) : undefined,
    city: raw.city != null ? String(raw.city) : null,
    address: raw.address != null ? String(raw.address) : null,
    phone: raw.phone != null ? String(raw.phone) : null,
    email: raw.email != null ? String(raw.email) : null,
    about: pickLocalizedText(raw.about),
    logoUrl: pickImageSrc(raw.logo),
    bannerUrl: pickImageSrc(raw.banner),
    layoutUrl: pickImageSrc(raw.layout) ?? pickImageSrc(
      raw.details && typeof raw.details === 'object'
        ? (raw.details as Record<string, unknown>).layout
        : null,
    ),
    youtube: raw.youtube != null ? String(raw.youtube) : null,
    eventCount: Number(raw.eventCount ?? 0) || 0,
    categories: Array.isArray(raw.categories)
      ? raw.categories.map(String)
      : [],
    coordinates: raw.coordinates != null ? String(raw.coordinates) : null,
    venueUrl: id ? `${GISE_WEB_URL}/mekanlar/${id}` : undefined,
  };
}

export function mapOrganisationCompanyRecord(raw: Record<string, unknown>) {
  const id = String(raw.id ?? '');
  const slug = raw.slug != null ? String(raw.slug) : undefined;
  return {
    id,
    name: String(raw.name ?? ''),
    slug,
    city: raw.city != null ? String(raw.city) : null,
    address: raw.address != null ? String(raw.address) : null,
    phone: raw.phone != null ? String(raw.phone) : null,
    email: raw.email != null ? String(raw.email) : null,
    about: pickLocalizedText(raw.about),
    logoUrl: pickImageSrc(raw.logo),
    bannerUrl: pickImageSrc(raw.banner),
    youtube: raw.youtube != null ? String(raw.youtube) : null,
    eventCount: Number(raw.eventCount ?? 0) || 0,
    coordinates: raw.coordinates != null ? String(raw.coordinates) : null,
    companyUrl: id
      ? `${GISE_WEB_URL}/organizasyon-sirketleri/${slug ?? id}`
      : undefined,
  };
}

export function mapPlatformHero(raw: Record<string, unknown>) {
  const banner = pickImageSrc(raw.banner) ?? pickImageSrc(raw.image);
  const button =
    raw.button && typeof raw.button === 'object'
      ? (raw.button as Record<string, unknown>)
      : null;
  const buttonLabel = button ? pickLocalizedText(button.label) : null;
  const buttonLink =
    button?.link != null ? String(button.link) : null;

  return {
    id: String(raw.id ?? 'home'),
    name: APP_NAME,
    logoUrl: null as string | null,
    loginBackgroundUrl: banner,
    loginSlogan:
      pickLocalizedText(raw.secondline) || pickLocalizedText(raw.firstline),
    mobileBannerUrl: banner,
    mobileTermsTitle: null as string | null,
    mobileTermsContent: null as string | null,
    headline: pickLocalizedText(raw.firstline),
    subheadline: pickLocalizedText(raw.secondline),
    ctaLabel: buttonLabel,
    ctaLink: buttonLink,
  };
}

export function mapVenueBranding(raw: Record<string, unknown>) {
  const id = String(raw.id ?? '');
  return {
    id,
    name: String(raw.name ?? APP_NAME),
    logoUrl: pickImageSrc(raw.logo),
    loginBackgroundUrl: pickImageSrc(raw.banner),
    loginSlogan: pickLocalizedText(raw.about),
    mobileBannerUrl: pickImageSrc(raw.banner),
    mobileTermsTitle: null as string | null,
    mobileTermsContent: null as string | null,
  };
}
