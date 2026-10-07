import { error } from '@sveltejs/kit';
import { db } from '#lib/server/app.ts';
import { getAdminContext, requireEdition } from '#lib/server/guards.ts';
import { printShifts } from '#lib/server/print.ts';
import { canSeeShiftArea } from '#lib/server/shift-access.ts';
import { getSettings } from '#lib/server/services/settings.ts';
import { getShift } from '#lib/server/services/shifts.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const ctx = await getAdminContext(event);
	const { edition, tree } = requireEdition(ctx);
	const shift = await getShift(db(), event.params.id);
	if (!shift || shift.editionId !== edition.id) error(404, 'error.notFound');
	if (!canSeeShiftArea(ctx, shift.areaId)) error(403, 'error.forbidden');
	const tz = (await getSettings(db())).timezone;
	const [printable] = await printShifts(db(), [shift], tree, ctx.authz, tz);
	return { timezone: tz, editionName: edition.name, shift: printable };
};
