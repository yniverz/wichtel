import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '#lib/server/app.ts';
import {
	actorOf,
	attempt,
	getAdminContext,
	requireEdition,
	requirePermission
} from '#lib/server/guards.ts';
import { seriesSchema } from '#lib/server/schemas.ts';
import { seriesValuesFromRequest } from '#lib/server/series-defaults.ts';
import { shiftAreaOptions } from '#lib/server/shift-access.ts';
import { detailsFromForm } from '#lib/server/shift-forms.ts';
import { getSettings } from '#lib/server/services/settings.ts';
import { createSeries } from '#lib/server/services/shifts.ts';
import { parseForm } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const ctx = await getAdminContext(event);
	const { edition } = requireEdition(ctx);
	const areas = shiftAreaOptions(ctx);
	if (areas.length === 0) error(403, 'error.forbidden');
	return {
		areas,
		timezone: (await getSettings(db())).timezone,
		edition: { startsOn: edition.startsOn, endsOn: edition.endsOn },
		...seriesValuesFromRequest(event.url, areas, edition.startsOn)
	};
};

export const actions: Actions = {
	default: async (event) => {
		const ctx = await getAdminContext(event);
		const { edition } = requireEdition(ctx);
		const form = await event.request.formData();
		const parsed = parseForm(seriesSchema, form);
		const echo = {
			positions: String(form.get('positions') ?? ''),
			slots: String(form.get('slots') ?? ''),
			weekdays: form.getAll('weekdays[]').map(String)
		};
		if (!parsed.ok) return fail(400, { errors: parsed.errors, values: parsed.values, ...echo });
		requirePermission(ctx, 'shift.manage', parsed.data.areaId);
		const tz = (await getSettings(db())).timezone;
		const result = await attempt(
			() =>
				createSeries(
					db(),
					actorOf(event),
					edition.id,
					detailsFromForm(parsed.data),
					parsed.data.positions,
					{
						from: parsed.data.from,
						to: parsed.data.to,
						weekdays: parsed.data['weekdays[]'],
						slots: parsed.data.slots,
						timeZone: tz
					}
				),
			{ values: parsed.values }
		);
		if (!result.ok) {
			const body = result.failure.data;
			return fail(400, { ...body, ...echo });
		}
		redirect(303, `/admin/shifts?created=${result.value}`);
	}
};
