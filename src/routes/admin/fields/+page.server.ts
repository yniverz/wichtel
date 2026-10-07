import { fail } from '@sveltejs/kit';
import { db } from '#lib/server/app.ts';
import { actorOf, getAdminContext, requireAdmin } from '#lib/server/guards.ts';
import { fieldSchema } from '#lib/server/schemas.ts';
import { createField, listFields, updateField } from '#lib/server/services/fields.ts';
import { listGoodies } from '#lib/server/services/goodies.ts';
import { parseForm } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const ctx = await getAdminContext(event);
	requireAdmin(ctx);
	const goodies = ctx.edition ? await listGoodies(db(), ctx.edition.id) : [];
	return {
		fields: await listFields(db()),
		goodies: goodies.map((g) => ({ id: g.id, nameDe: g.nameDe, nameEn: g.nameEn }))
	};
};

export const actions: Actions = {
	save: async (event) => {
		requireAdmin(await getAdminContext(event));
		const form = await event.request.formData();
		const id = String(form.get('id') ?? '');
		const parsed = parseForm(fieldSchema, form);
		if (!parsed.ok) return fail(400, { action: id || 'new', errors: parsed.errors });
		const { 'goodieIds[]': goodieIds, ...rest } = parsed.data;
		const input = {
			...rest,
			goodieIds: rest.context === 'goodie' ? goodieIds : [],
			options: rest.type === 'select' || rest.type === 'multiselect' ? rest.options : []
		};
		if ((input.type === 'select' || input.type === 'multiselect') && input.options.length === 0) {
			return fail(400, { action: id || 'new', errors: { options: 'error.required' } });
		}
		if (id) await updateField(db(), actorOf(event), id, input);
		else await createField(db(), actorOf(event), input);
		return { action: id || 'new', success: 'common.saved' };
	}
};
