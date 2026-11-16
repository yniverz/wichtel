import { error, fail } from '@sveltejs/kit';
import { db } from '#lib/server/app.ts';
import { actorOf, attempt, getAdminContext, requireAdmin } from '#lib/server/guards.ts';
import { getEdition, setEditionArchived, updateEdition } from '#lib/server/services/editions.ts';
import { parseForm } from '#lib/server/validation.ts';
import { editionSchema } from '#lib/server/schemas.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireAdmin(await getAdminContext(event));
	const edition = await getEdition(db(), event.params.id);
	if (!edition) error(404, 'error.notFound');
	return { item: edition };
};

export const actions: Actions = {
	update: async (event) => {
		requireAdmin(await getAdminContext(event));
		const parsed = parseForm(editionSchema, await event.request.formData());
		if (!parsed.ok)
			return fail(400, { action: 'update', errors: parsed.errors, values: parsed.values });
		const result = await attempt(
			() => updateEdition(db(), actorOf(event), event.params.id, parsed.data),
			{
				action: 'update',
				values: parsed.values
			}
		);
		if (!result.ok) return result.failure;
		return { action: 'update', success: 'common.saved' };
	},
	archive: async (event) => {
		requireAdmin(await getAdminContext(event));
		await setEditionArchived(db(), actorOf(event), event.params.id, true);
		return { action: 'archive', success: 'common.saved' };
	},
	unarchive: async (event) => {
		requireAdmin(await getAdminContext(event));
		await setEditionArchived(db(), actorOf(event), event.params.id, false);
		return { action: 'archive', success: 'common.saved' };
	}
};
