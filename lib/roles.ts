/** gisekibris-web / gisekibris-api ile aynı crole değerleri */
export const CROLES = {
  CUSTOMER: 'customer',
  VENUE_MANAGER: 'venueManager',
  ORGANISATION_COMPANY_MANAGER: 'organisationCompanyManager',
  SALE_POINT_MANAGER: 'salePointManager',
  PROMOTER: 'promoter',
  AFFILIATE: 'affiliate',
  ADMIN: 'admin',
  OPERATOR: 'operator',
  EDITOR: 'editor',
} as const;

export type Crole = (typeof CROLES)[keyof typeof CROLES] | string;

export function isVenueManager(crole?: string | null): boolean {
  return crole === CROLES.VENUE_MANAGER;
}

export function isOrganisationCompanyManager(crole?: string | null): boolean {
  return crole === CROLES.ORGANISATION_COMPANY_MANAGER;
}

export function isAdminRole(crole?: string | null): boolean {
  return crole === CROLES.ADMIN;
}

export function isOperatorRole(crole?: string | null): boolean {
  return crole === CROLES.OPERATOR;
}

/** Panel + saha yöneticileri — mobil admin moduna girebilir. */
export function isPanelMobileStaff(crole?: string | null): boolean {
  return (
    isManagerRole(crole) ||
    isAdminRole(crole) ||
    isOperatorRole(crole)
  );
}

/** Web: organisationCompanyManager || venueManager */
export function isManagerRole(crole?: string | null): boolean {
  return isVenueManager(crole) || isOrganisationCompanyManager(crole);
}

/** Mobil admin moduna girebilir. */
export function canEnterAdminMode(input: {
  crole?: string | null;
  isSalePoint?: boolean;
}): boolean {
  return (
    isPanelMobileStaff(input.crole) ||
    (isSalePointManager(input.crole) && input.isSalePoint === true)
  );
}

/** Admin modundan çıkış (satış noktası hariç — o modda kalıcı). */
export function canExitAdminMode(input: {
  crole?: string | null;
  isSalePoint?: boolean;
}): boolean {
  if (isSalePointManager(input.crole) && input.isSalePoint === true) {
    return false;
  }
  return isPanelMobileStaff(input.crole);
}

/** Satış modu toggle ile admin moduna geçiş (rid gerektirmez). */
export function usesAdminModeToggle(crole?: string | null): boolean {
  return isPanelMobileStaff(crole);
}

export function isSalePointManager(crole?: string | null): boolean {
  return crole === CROLES.SALE_POINT_MANAGER;
}

export function isCustomer(crole?: string | null): boolean {
  return !crole || crole === CROLES.CUSTOMER;
}

export function isPromoter(crole?: string | null): boolean {
  return crole === CROLES.PROMOTER;
}

export function isAffiliate(crole?: string | null): boolean {
  return crole === CROLES.AFFILIATE;
}

/** Web profil: promoter | affiliate | isSalePoint */
export function isAccUser(input: {
  crole?: string | null;
  isSalePoint?: boolean;
}): boolean {
  return (
    isPromoter(input.crole) ||
    isAffiliate(input.crole) ||
    input.isSalePoint === true
  );
}

/** Web hydrateUser — satış modu bayrakları */
export function computeSaleModeFlags(input: {
  crole?: string | null;
  isManagerSaleModeActive?: boolean;
  hasSalePoint?: boolean;
}): { isSaleMode: boolean; isManagerSaleModeActive: boolean } {
  let isManagerSaleModeActive = input.isManagerSaleModeActive === true;
  let isSaleMode = false;

  if (isSalePointManager(input.crole) && input.hasSalePoint) {
    isSaleMode = true;
  }

  if (isPanelMobileStaff(input.crole) && isManagerSaleModeActive) {
    isSaleMode = true;
  }

  return { isSaleMode, isManagerSaleModeActive };
}

export function getRoleLabel(crole?: string | null): string | null {
  switch (crole) {
    case CROLES.CUSTOMER:
      return 'Müşteri';
    case CROLES.VENUE_MANAGER:
      return 'Mekan Yöneticisi';
    case CROLES.ORGANISATION_COMPANY_MANAGER:
      return 'Organizasyon Yöneticisi';
    case CROLES.SALE_POINT_MANAGER:
      return 'Satış Noktası';
    case CROLES.PROMOTER:
      return 'Promotör';
    case CROLES.AFFILIATE:
      return 'Affiliate';
    default:
      return crole ?? null;
  }
}
