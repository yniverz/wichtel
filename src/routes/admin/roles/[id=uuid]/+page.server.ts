import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '#lib/server/app.ts';
import { actorOf, getAdminContext, requireAdmin } from '#lib/server/guards.ts';
import { roleSchema } from '#lib/server/schemas.ts';
import { deleteRole, getRole, roleUsage, updateRole } from '#lib/server/services/roles.ts';
import { parseForm } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireAdmin(await getAdminContext(event));
	const role = await getRole(db(), event.params.id);
	if (!role) error(404, 'error.notFound');
	const usage = (await roleUsage(db())).get(role.id) ?? 0;
	return { item: role, usage };
};

export const actions: Actions = {
	update: async (event) => {
		requireAdmin(await getAdminContext(event));
		const form = await event.request.formData();
		const parsed = parseForm(roleSchema, form);
		if (!parsed.ok) {
			return fail(400, {
				action: 'update',
				errors: parsed.errors,
				values: parsed.values,
				permissions: form.getAll('permissions[]').map(String)
			});
		}
		const { 'permissions[]': permissions, ...rest } = parsed.data;
		await updateRole(db(), actorOf(event), event.params.id, { ...rest, permissions });
		return { action: 'update', success: 'common.saved' };
	},
	delete: async (event) => {
		requireAdmin(await getAdminContext(event));
		await deleteRole(db(), actorOf(event), event.params.id);
		redirect(303, '/admin/roles');
	}
};
