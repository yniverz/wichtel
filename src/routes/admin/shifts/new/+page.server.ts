import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '#lib/server/app.ts';
import {
	actorOf,
	attempt,
	getAdminContext,
	requireEdition,
	requirePermission
} from '#lib/server/guards.ts';
import { seriesValuesFromRequest } from '#lib/server/series-defaults.ts';
import { shiftSchema } from '#lib/server/schemas.ts';
import { canSeeShiftArea, shiftAreaOptions } from '#lib/server/shift-access.ts';
import { formValuesFromShift, shiftInputFromForm } from '#lib/server/shift-forms.ts';
import { getSettings } from '#lib/server/services/settings.ts';
import { createShift, getShift } from '#lib/server/services/shifts.ts';
import { parseForm } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const ctx = await getAdminContext(event);
	const { edition } = requireEdition(ctx);
	const areas = shiftAreaOptions(ctx);
	if (areas.length === 0) error(403, 'error.forbidden');
	const tz = (await getSettings(db())).timezone;

	// Duplicate an existing shift (?from=…)
	const fromId = event.url.searchParams.get('from');
	if (fromId) {
		const source = await getShift(db(), fromId);
		if (source && source.editionId === edition.id && canSeeShiftArea(ctx, source.areaId)) {
			return { areas, ...formValuesFromShift(source, tz, false) };
		}
	}
	return { areas, ...seriesValuesFromRequest(event.url, areas, edition.startsOn) };
};

export const actions: Actions = {
	default: async (event) => {
		const ctx = await getAdminContext(event);
		const { edition } = requireEdition(ctx);
		const form = await event.request.formData();
		const parsed = parseForm(shiftSchema, form);
		if (!parsed.ok) {
			return fail(400, {
				errors: parsed.errors,
				values: parsed.values,
				positions: String(form.get('positions') ?? '')
			});
		}
		requirePermission(ctx, 'shift.manage', parsed.data.areaId);
		const tz = (await getSettings(db())).timezone;
		const result = await attempt(
			() => createShift(db(), actorOf(event), edition.id, shiftInputFromForm(parsed.data, tz)),
			{ values: parsed.values }
		);
		if (!result.ok) return result.failure;
		redirect(303, `/admin/shifts/${result.value.id}`);
	}
};
