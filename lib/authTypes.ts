import type { SalePointRecord } from './salePoints';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  isEmailVerified?: boolean;
  crole: string | null;
  roleName: string | null;
  rid: string | null;
  permissions: string[];
  isCustomer: boolean;
  isVenueManager: boolean;
  isOrganisationCompanyManager: boolean;
  isSalePointManager: boolean;
  isManager: boolean;
  canEnterAdminMode: boolean;
  isPromoter: boolean;
  isAffiliate: boolean;
  isSalePoint: boolean;
  salePoint: SalePointRecord | null;
  isSaleMode: boolean;
  isManagerSaleModeActive: boolean;
  isAccUser: boolean;
  hasDeleteRequest?: boolean;
  deletedUser?: boolean;
  business: { id: string; name: string; logoUrl: string | null } | null;
}
