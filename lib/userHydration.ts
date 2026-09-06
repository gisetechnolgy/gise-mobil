import type { AuthUser } from './authTypes';
import { buildFullName, GiseUserRecord } from './giseMappers';
import { fetchSalePointById, type SalePointRecord } from './salePoints';
import {
  canEnterAdminMode,
  computeSaleModeFlags,
  isAccUser,
  isAffiliate,
  isCustomer,
  isManagerRole,
  isOrganisationCompanyManager,
  isPromoter,
  isSalePointManager,
  isVenueManager,
} from './roles';

export async function hydrateAuthUser(me: GiseUserRecord): Promise<AuthUser> {
  const crole = me.crole ?? null;
  const rid = me.rid ?? null;

  let salePoint: SalePointRecord | null = null;
  let hasSalePoint = false;

  if (isSalePointManager(crole) && rid) {
    salePoint = await fetchSalePointById(rid);
    hasSalePoint = !!salePoint;
  }

  const { isSaleMode, isManagerSaleModeActive } = computeSaleModeFlags({
    crole,
    isManagerSaleModeActive: me.isManagerSaleModeActive === true,
    hasSalePoint,
  });

  const isSalePoint = hasSalePoint;
  const isManager = isManagerRole(crole);
  const canAdmin = canEnterAdminMode({ crole, isSalePoint });

  return {
    id: me.id,
    email: me.email?.trim() ?? '',
    fullName: buildFullName(me),
    phoneNumber: me.mobile ?? undefined,
    isEmailVerified: me.isVerified ?? false,
    crole,
    roleName: crole,
    rid,
    permissions: [],
    isCustomer: isCustomer(crole),
    isVenueManager: isVenueManager(crole),
    isOrganisationCompanyManager: isOrganisationCompanyManager(crole),
    isSalePointManager: isSalePointManager(crole),
    isManager,
    canEnterAdminMode: canAdmin,
    isPromoter: isPromoter(crole),
    isAffiliate: isAffiliate(crole),
    isSalePoint,
    salePoint,
    isSaleMode,
    isManagerSaleModeActive,
    isAccUser: isAccUser({ crole, isSalePoint }),
    hasDeleteRequest: me.hasDeleteRequest === true,
    deletedUser: me.deletedUser === true,
    business: null,
  };
}
