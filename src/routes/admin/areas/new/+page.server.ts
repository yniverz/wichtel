import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '#lib/server/app.ts';
import { assertCanPlaceUnder, parentOptions } from '#lib/server/area-forms.ts';
import { actorOf, attempt, getAdminContext, requireEdition } from '#lib/server/guards.ts';
import { areaSchema } from '#lib/server/schemas.ts';
import { createArea } from '#lib/server/services/areas.ts';
import { parseForm } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const ctx = await getAdminContext(event);
	const { tree } = requireEdition(ctx);
	const parents = parentOptions(tree, ctx.authz);
	const allowRoot = ctx.authz.can('area.manage');
	if (!allowRoot && parents.length === 0) error(403, 'error.forbidden');
	const requested = event.url.searchParams.get('parent') ?? '';
	const parentId = parents.some((p) => p.id === requested)
		? requested
		: allowRoot
			? ''
			: parents[0].id;
	return { parents, allowRoot, parentId };
};

export const actions: Actions = {
	default: async (event) => {
		const ctx = await getAdminContext(event);
		const { edition } = requireEdition(ctx);
		const parsed = parseForm(areaSchema, await event.request.formData());
		if (!parsed.ok) return fail(400, { errors: parsed.errors, values: parsed.values });
		assertCanPlaceUnder(ctx.authz, parsed.data.parentId);
		const result = await attempt(() => createArea(db(), actorOf(event), edition.id, parsed.data), {
			values: parsed.values
		});
		if (!result.ok) return result.failure;
		redirect(303, '/admin/areas');
	}
};
