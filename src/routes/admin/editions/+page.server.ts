import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '#lib/server/app.ts';
import { actorOf, attempt, getAdminContext, requireAdmin } from '#lib/server/guards.ts';
import { createEdition, listEditions, makeCurrentEdition } from '#lib/server/services/editions.ts';
import { parseForm, uuid } from '#lib/server/validation.ts';
import { editionSchema } from '#lib/server/schemas.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireAdmin(await getAdminContext(event));
	return { list: await listEditions(db()) };
};

export const actions: Actions = {
	create: async (event) => {
		requireAdmin(await getAdminContext(event));
		const parsed = parseForm(editionSchema, await event.request.formData());
		if (!parsed.ok)
			return fail(400, { action: 'create', errors: parsed.errors, values: parsed.values });
		const result = await attempt(() => createEdition(db(), actorOf(event), parsed.data), {
			action: 'create',
			values: parsed.values
		});
		if (!result.ok) return result.failure;
		return { action: 'create', success: 'common.saved' };
	},
	makeCurrent: async (event) => {
		requireAdmin(await getAdminContext(event));
		const parsed = parseForm(z.object({ id: uuid }), await event.request.formData());
		if (!parsed.ok) return fail(400, { action: 'makeCurrent', error: 'error.notFound' });
		const result = await attempt(() => makeCurrentEdition(db(), actorOf(event), parsed.data.id));
		if (!result.ok) return result.failure;
		return { action: 'makeCurrent', success: 'common.saved' };
	}
};
