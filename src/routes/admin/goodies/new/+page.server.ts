import { fail, redirect } from '@sveltejs/kit';
import { db } from '#lib/server/app.ts';
import {
	emptyGoodie,
	goodieInputFromForm,
	requireGoodieManager
} from '#lib/server/goodie-forms.ts';
import { actorOf, getAdminContext, requireEdition } from '#lib/server/guards.ts';
import { goodieSchema } from '#lib/server/schemas.ts';
import { createGoodie } from '#lib/server/services/goodies.ts';
import { parseForm } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const ctx = await getAdminContext(event);
	requireGoodieManager(ctx);
	const { tree } = requireEdition(ctx);
	return {
		values: emptyGoodie,
		areas: tree
			.flat()
			.map(({ area, depth }) => ({ id: area.id, nameDe: area.nameDe, nameEn: area.nameEn, depth }))
	};
};

export const actions: Actions = {
	default: async (event) => {
		const ctx = await getAdminContext(event);
		requireGoodieManager(ctx);
		const { edition, tree } = requireEdition(ctx);
		const parsed = parseForm(goodieSchema, await event.request.formData());
		if (!parsed.ok) return fail(400, { errors: parsed.errors });
		const areaIds = new Set(tree.flat().map((e) => e.area.id));
		const goodie = await createGoodie(
			db(),
			actorOf(event),
			edition.id,
			goodieInputFromForm(parsed.data, areaIds)
		);
		redirect(303, `/admin/goodies/${goodie.id}`);
	}
};
