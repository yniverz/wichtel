import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '#lib/server/app.ts';
import { attempt, requireVerifiedUser } from '#lib/server/guards.ts';
import { loadHelperShifts } from '#lib/server/helper-shifts.ts';
import { bookPosition, cancelOwnAssignment } from '#lib/server/services/assignments.ts';
import { getCurrentEdition } from '#lib/server/services/editions.ts';
import { loadAuthz } from '#lib/server/services/roles.ts';
import { getSettings } from '#lib/server/services/settings.ts';
import { parseForm, uuid } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireVerifiedUser(event);
	const database = db();
	const edition = await getCurrentEdition(database);
	if (!edition) return { shifts: [], timezone: (await getSettings(database)).timezone };
	const authz = await loadAuthz(database, user, edition.id);
	return {
		shifts: await loadHelperShifts(database, user, authz, edition.id, new Date()),
		timezone: (await getSettings(database)).timezone
	};
};

export const actions: Actions = {
	book: async (event) => {
		const user = requireVerifiedUser(event);
		const parsed = parseForm(z.object({ positionId: uuid }), await event.request.formData());
		if (!parsed.ok) return fail(400, { error: 'error.notFound' });
		const database = db();
		const edition = await getCurrentEdition(database);
		if (!edition) return fail(400, { error: 'error.notFound' });
		const authz = await loadAuthz(database, user, edition.id);
		const result = await attempt(() =>
			bookPosition({ db: database, now: new Date() }, user.id, parsed.data.positionId, {
				editionId: edition.id,
				canSee: (shift) => shift.visibility === 'public' || authz.hasRoleCovering(shift.areaId)
			})
		);
		if (!result.ok) return result.failure;
		return {
			success: result.value.status === 'requested' ? 'shifts.requested' : 'shifts.booked',
			shiftId: result.value.shiftId
		};
	},
	cancel: async (event) => {
		const user = requireVerifiedUser(event);
		const parsed = parseForm(z.object({ assignmentId: uuid }), await event.request.formData());
		if (!parsed.ok) return fail(400, { error: 'error.notFound' });
		const result = await attempt(() =>
			cancelOwnAssignment({ db: db(), now: new Date() }, user.id, parsed.data.assignmentId)
		);
		if (!result.ok) return result.failure;
		return { success: 'shifts.cancelled' };
	}
};
