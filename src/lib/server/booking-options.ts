import type { Tx } from './db/client.ts';
import type { User } from './db/schema.ts';
import type { BookingOptions } from './services/assignments.ts';
import { loadAuthz } from './services/roles.ts';
import { bookingAccess } from './services/waves.ts';

/**
 * Visibility and booking-window checks for one person booking for themself: internal shifts only
 * with a role covering the area, and only while a booking wave is open for them.
 */
export async function bookingOptionsFor(
	db: Tx,
	user: Pick<User, 'id' | 'isAdmin'>,
	editionId: string,
	now = new Date()
): Promise<BookingOptions> {
	const [authz, access] = await Promise.all([
		loadAuthz(db, user, editionId),
		bookingAccess(db, user, editionId, now)
	]);
	return {
		editionId,
		canSee: (shift) => shift.visibility === 'public' || authz.hasRoleCovering(shift.areaId),
		isOpen: (shift) => access(shift.areaId).open
	};
}
