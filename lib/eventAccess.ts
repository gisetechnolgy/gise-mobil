import { isOrganisationCompanyManager, isVenueManager } from './roles';
import type { AuthUser } from './authTypes';

type EventScope = {
  venueId?: string | null;
  organisationCompanyIds?: string[];
};

/** Web: navigateHomeDueToPreviliges */
export function shouldDenyManagerEventAccess(
  user: AuthUser,
  event: EventScope,
): boolean {
  if (!user.isManager || !user.isManagerSaleModeActive) {
    return false;
  }

  if (
    isOrganisationCompanyManager(user.crole) &&
    event.organisationCompanyIds &&
    event.organisationCompanyIds.length > 0 &&
    user.rid
  ) {
    if (!event.organisationCompanyIds.includes(user.rid)) {
      return true;
    }
  }

  if (isVenueManager(user.crole) && event.venueId && user.rid) {
    if (event.venueId !== user.rid) {
      return true;
    }
  }

  return false;
}
