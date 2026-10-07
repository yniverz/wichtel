import { error } from '@sveltejs/kit';
import { utcToZoned } from '#lib/domain/time.ts';
import { db } from '#lib/server/app.ts';
import { getAdminContext, requireEdition } from '#lib/server/guards.ts';
import { printShifts } from '#lib/server/print.ts';
import { hasShiftAccess, shiftAreaScope } from '#lib/server/shift-access.ts';
import { getSettings } from '#lib/server/services/settings.ts';
import { listShifts } from '#lib/server/services/shifts.ts';
import type { PageServerLoad } from './$types';

/** Shift plan for one area (incl. sub-areas) and/or one day, as a printable crew list. */
export const load: PageServerLoad = async (event) => {
	const ctx = await getAdminContext(event);
	if (!hasShiftAccess(ctx)) error(403, 'error.forbidden');
	const { edition, tree } = requireEdition(ctx);
	const tz = (await getSettings(db())).timezone;
	const scope = shiftAreaScope(ctx);
	const area = event.url.searchParams.get('area');
	const day = event.url.searchParams.get('day');

	let areaIds: string[] | undefined = scope === 'all' ? undefined : [...scope];
	if (area) {
		if (!tree.has(area)) error(404, 'error.notFound');
		const sub = tree.covered([area]);
		areaIds = (areaIds ?? [...sub]).filter((id) => sub.has(id));
	}
	const list = (await listShifts(db(), edition.id, areaIds ? { areaIds } : {})).filter(
		(s) => !day || utcToZoned(s.startsAt, tz).date === day
	);
	return {
		timezone: tz,
		editionName: edition.name,
		areaName: area ? (tree.get(area)?.nameDe ?? '') : null,
		day,
		shifts: await printShifts(db(), list, tree, ctx.authz, tz)
	};
};
