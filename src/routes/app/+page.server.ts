import { db } from '#lib/server/app.ts';
import { requireUser } from '#lib/server/guards.ts';
import { loadHelperShifts } from '#lib/server/helper-shifts.ts';
import { getCurrentEdition } from '#lib/server/services/editions.ts';
import { loadAuthz } from '#lib/server/services/roles.ts';
import { getSettings } from '#lib/server/services/settings.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const database = db();
	const edition = await getCurrentEdition(database);
	const timezone = (await getSettings(database)).timezone;
	if (!edition || !user.emailVerifiedAt) return { mine: [], timezone, openShifts: 0 };
	const authz = await loadAuthz(database, user, edition.id);
	const shifts = await loadHelperShifts(database, user, authz, edition.id, new Date());
	return {
		timezone,
		mine: shifts.filter((s) => s.mine && s.mine.status !== 'rejected' && !s.past),
		openShifts: shifts.filter((s) => !s.past && s.positions.some((p) => p.free > 0)).length
	};
};
