import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { parseCoordinates } from '#lib/domain/places.ts';
import { config, db } from '#lib/server/app.ts';
import {
	actorOf,
	attempt,
	getAdminContext,
	requireEdition,
	type AdminContext
} from '#lib/server/guards.ts';
import { placeSchema } from '#lib/server/schemas.ts';
import { storeImage } from '#lib/server/services/assets.ts';
import {
	createPlace,
	deletePlace,
	listPlaces,
	placeView,
	setDeskPlace,
	setSitePlan,
	updatePlace
} from '#lib/server/services/places.ts';
import { optionalUuid, parseForm, uuid } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

function requirePlaceManager(ctx: AdminContext) {
	if (!ctx.authz.can('shift.manage')) error(403, 'error.forbidden');
}

export const load: PageServerLoad = async (event) => {
	const ctx = await getAdminContext(event);
	requirePlaceManager(ctx);
	const { edition } = requireEdition(ctx);
	return {
		places: (await listPlaces(db(), edition.id)).map((p) => ({
			...placeView(p),
			sortOrder: p.sortOrder
		})),
		sitePlanAssetId: edition.sitePlanAssetId,
		deskPlaceId: edition.deskPlaceId
	};
};

export const actions: Actions = {
	save: async (event) => {
		const ctx = await getAdminContext(event);
		requirePlaceManager(ctx);
		const { edition } = requireEdition(ctx);
		const form = await event.request.formData();
		const id = String(form.get('id') ?? '');
		const parsed = parseForm(placeSchema, form);
		if (!parsed.ok) return fail(400, { action: id || 'new', errors: parsed.errors });
		const { coordinates, ...rest } = parsed.data;
		const pin = coordinates ? parseCoordinates(coordinates) : null;
		if (coordinates && !pin)
			return fail(400, {
				action: id || 'new',
				errors: { coordinates: 'error.invalidCoordinates' }
			});
		const input = { ...rest, lat: pin?.lat ?? null, lng: pin?.lng ?? null };
		const result = await attempt(
			() =>
				id
					? updatePlace(db(), actorOf(event), id, input)
					: createPlace(db(), actorOf(event), edition.id, input).then(() => undefined),
			{ action: id || 'new' }
		);
		if (!result.ok) return result.failure;
		return { action: id || 'new', success: 'common.saved' };
	},
	delete: async (event) => {
		const ctx = await getAdminContext(event);
		requirePlaceManager(ctx);
		const parsed = parseForm(z.object({ id: uuid }), await event.request.formData());
		if (!parsed.ok) return fail(400, { error: 'error.notFound' });
		await deletePlace(db(), actorOf(event), parsed.data.id);
		return { success: 'common.saved' };
	},
	plan: async (event) => {
		const ctx = await getAdminContext(event);
		requirePlaceManager(ctx);
		const { edition } = requireEdition(ctx);
		const form = await event.request.formData();
		if (form.get('remove') === 'on') {
			await setSitePlan(db(), actorOf(event), edition.id, null);
			return { action: 'plan', success: 'common.saved' };
		}
		const file = form.get('plan');
		if (!(file instanceof File) || file.size === 0)
			return fail(400, { action: 'plan', error: 'error.required' });
		const stored = await attempt(() => storeImage(db(), config.uploadDir, file, ctx.user.id), {
			action: 'plan'
		});
		if (!stored.ok) return stored.failure;
		await setSitePlan(db(), actorOf(event), edition.id, stored.value);
		return { action: 'plan', success: 'common.saved' };
	},
	desk: async (event) => {
		const ctx = await getAdminContext(event);
		requirePlaceManager(ctx);
		const { edition } = requireEdition(ctx);
		const parsed = parseForm(z.object({ placeId: optionalUuid }), await event.request.formData());
		if (!parsed.ok) return fail(400, { action: 'desk', error: 'error.notFound' });
		const result = await attempt(
			() => setDeskPlace(db(), actorOf(event), edition.id, parsed.data.placeId),
			{ action: 'desk' }
		);
		if (!result.ok) return result.failure;
		return { action: 'desk', success: 'common.saved' };
	}
};
