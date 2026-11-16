import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '#lib/server/app.ts';
import { goodieInputFromForm, requireGoodieManager } from '#lib/server/goodie-forms.ts';
import { actorOf, attempt, getAdminContext, requireEdition } from '#lib/server/guards.ts';
import { goodieSchema } from '#lib/server/schemas.ts';
import {
	claimsForGoodie,
	deleteGoodie,
	getGoodie,
	updateGoodie
} from '#lib/server/services/goodies.ts';
import { placeOptions } from '#lib/server/services/places.ts';
import { parseForm } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

async function load_(event: RequestEvent) {
	const ctx = await getAdminContext(event);
	requireGoodieManager(ctx);
	const { edition, tree } = requireEdition(ctx);
	const goodie = await getGoodie(db(), event.params.id);
	if (!goodie || goodie.editionId !== edition.id) error(404, 'error.notFound');
	return { goodie, tree, edition };
}

export const load: PageServerLoad = async (event) => {
	const { goodie, tree, edition } = await load_(event);
	const claims = await claimsForGoodie(db(), goodie.id);
	return {
		goodie,
		places: await placeOptions(db(), edition.id),
		areas: tree
			.flat()
			.map(({ area, depth }) => ({ id: area.id, nameDe: area.nameDe, nameEn: area.nameEn, depth })),
		claims: claims.map((c) => ({
			...c,
			createdAt: c.createdAt.toISOString(),
			issuedAt: c.issuedAt?.toISOString() ?? null
		}))
	};
};

export const actions: Actions = {
	update: async (event) => {
		const { goodie, tree } = await load_(event);
		const parsed = parseForm(goodieSchema, await event.request.formData());
		if (!parsed.ok) return fail(400, { errors: parsed.errors });
		const areaIds = new Set(tree.flat().map((e) => e.area.id));
		const result = await attempt(() =>
			updateGoodie(db(), actorOf(event), goodie.id, goodieInputFromForm(parsed.data, areaIds))
		);
		if (!result.ok) return result.failure;
		return { success: 'common.saved' };
	},
	delete: async (event) => {
		const { goodie } = await load_(event);
		const result = await attempt(() => deleteGoodie(db(), actorOf(event), goodie.id));
		if (!result.ok) return result.failure;
		redirect(303, '/admin/goodies');
	}
};
