import { error } from '@sveltejs/kit';
import { utcToZoned } from '#lib/domain/time.ts';
import { db } from '#lib/server/app.ts';
import { getAdminContext, requireEdition } from '#lib/server/guards.ts';
import { hasShiftAccess, shiftAreaScope } from '#lib/server/shift-access.ts';
import { getSettings } from '#lib/server/services/settings.ts';
import { listShifts } from '#lib/server/services/shifts.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const ctx = await getAdminContext(event);
	if (!hasShiftAccess(ctx)) error(403, 'error.forbidden');
	const { edition, tree } = requireEdition(ctx);
	const tz = (await getSettings(db())).timezone;

	const scope = shiftAreaScope(ctx);
	const filterArea = event.url.searchParams.get('area');
	let areaIds = scope === 'all' ? null : [...scope];
	if (filterArea && tree.has(filterArea)) {
		const sub = tree.covered([filterArea]);
		areaIds = (areaIds ?? [...sub]).filter((id) => sub.has(id));
	}
	const shifts = await listShifts(db(), edition.id, areaIds ? { areaIds } : {});

	const areaOptions = tree
		.flat()
		.filter(({ area }) => scope === 'all' || scope.has(area.id))
		.map(({ area, depth }) => ({ id: area.id, nameDe: area.nameDe, nameEn: area.nameEn, depth }));

	return {
		timezone: tz,
		filterArea: filterArea ?? '',
		areaOptions,
		canCreate: ctx.authz.canSomewhere('shift.manage'),
		created: Number(event.url.searchParams.get('created')) || 0,
		shifts: shifts.map((s) => ({
			id: s.id,
			titleDe: s.titleDe,
			titleEn: s.titleEn,
			area: tree.get(s.areaId),
			internal: s.visibility === 'internal',
			startsAt: s.startsAt.toISOString(),
			endsAt: s.endsAt.toISOString(),
			day: utcToZoned(s.startsAt, tz).date,
			requested: s.positions.reduce((n, p) => n + p.requested, 0),
			positions: s.positions.map((p) => ({
				id: p.id,
				nameDe: p.nameDe,
				nameEn: p.nameEn,
				capacity: p.capacity,
				booked: p.booked
			}))
		}))
	};
};
