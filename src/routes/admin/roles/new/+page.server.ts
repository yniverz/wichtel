import { fail, redirect } from '@sveltejs/kit';
import { db } from '#lib/server/app.ts';
import { actorOf, getAdminContext, requireAdmin } from '#lib/server/guards.ts';
import { roleSchema } from '#lib/server/schemas.ts';
import { createRole } from '#lib/server/services/roles.ts';
import { parseForm } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireAdmin(await getAdminContext(event));
};

export const actions: Actions = {
	default: async (event) => {
		requireAdmin(await getAdminContext(event));
		const form = await event.request.formData();
		const parsed = parseForm(roleSchema, form);
		if (!parsed.ok) {
			return fail(400, {
				errors: parsed.errors,
				values: parsed.values,
				permissions: form.getAll('permissions[]').map(String)
			});
		}
		const { 'permissions[]': permissions, ...rest } = parsed.data;
		const role = await createRole(db(), actorOf(event), { ...rest, permissions });
		redirect(303, `/admin/roles/${role.id}`);
	}
};
