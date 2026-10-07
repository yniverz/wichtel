import { db } from '#lib/server/app.ts';
import { requireUser } from '#lib/server/guards.ts';
import { loadHelperShifts } from '#lib/server/helper-shifts.ts';
import { getCurrentEdition } from '#lib/server/services/editions.ts';
import { loadAuthz } from '#lib/server/services/roles.ts';
import { getSettings } from '#lib/server/services/settings.ts';
import { fieldsFor, listFields, missingRequired, valuesOf } from '#lib/server/services/fields.ts';
import { listPlaces, placeView } from '#lib/server/services/places.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const database = db();
	const edition = await getCurrentEdition(database);
	const timezone = (await getSettings(database)).timezone;
	const missingFields =
		missingRequired(
			fieldsFor(await listFields(database), 'profile'),
			await valuesOf(database, user.id)
		).length > 0;
	if (!edition || !user.emailVerifiedAt)
		return { mine: [], timezone, openShifts: 0, missingFields, desk: null, sitePlanAssetId: null };
	const authz = await loadAuthz(database, user, edition.id);
	const shifts = await loadHelperShifts(database, user, authz, edition.id, new Date());
	const desk = edition.deskPlaceId
		? (await listPlaces(database, edition.id)).find((p) => p.id === edition.deskPlaceId)
		: undefined;
	return {
		desk: desk ? placeView(desk) : null,
		sitePlanAssetId: edition.sitePlanAssetId,
		timezone,
		mine: shifts.filter((s) => s.mine && s.mine.status !== 'rejected' && !s.past),
		missingFields,
		openShifts: shifts.filter((s) => !s.past && s.positions.some((p) => p.free > 0)).length
	};
};
