import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '#lib/server/app.ts';
import { assertCanPlaceUnder, parentOptions } from '#lib/server/area-forms.ts';
import {
	actorOf,
	attempt,
	getAdminContext,
	requireEdition,
	requirePermission
} from '#lib/server/guards.ts';
import { areaSchema } from '#lib/server/schemas.ts';
import { deleteArea, updateArea } from '#lib/server/services/areas.ts';
import { listAssignmentsForEdition } from '#lib/server/services/roles.ts';
import { parseForm } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const ctx = await getAdminContext(event);
	const { tree, edition } = requireEdition(ctx);
	const area = tree.get(event.params.id);
	if (!area) error(404, 'error.notFound');
	requirePermission(ctx, 'area.manage', area.id);

	const assignments = (await listAssignmentsForEdition(db(), edition.id)).filter(
		(a) => a.areaId === area.id
	);
	return {
		item: area,
		path: tree.path(area.id).map((a) => ({ id: a.id, nameDe: a.nameDe, nameEn: a.nameEn })),
		hasChildren: tree.children(area.id).length > 0,
		parents: parentOptions(tree, ctx.authz, area.id),
		allowRoot: ctx.authz.can('area.manage') || area.parentId === null,
		assignments
	};
};

export const actions: Actions = {
	update: async (event) => {
		const ctx = await getAdminContext(event);
		const { tree, edition } = requireEdition(ctx);
		const area = tree.get(event.params.id);
		if (!area) error(404, 'error.notFound');
		requirePermission(ctx, 'area.manage', area.id);

		const parsed = parseForm(areaSchema, await event.request.formData());
		if (!parsed.ok)
			return fail(400, { action: 'update', errors: parsed.errors, values: parsed.values });
		if (parsed.data.parentId !== area.parentId)
			assertCanPlaceUnder(ctx.authz, parsed.data.parentId);

		const result = await attempt(
			() => updateArea(db(), actorOf(event), edition.id, area.id, parsed.data),
			{ action: 'update', values: parsed.values }
		);
		if (!result.ok) return result.failure;
		return { action: 'update', success: 'common.saved' };
	},
	delete: async (event) => {
		const ctx = await getAdminContext(event);
		const { tree, edition } = requireEdition(ctx);
		const area = tree.get(event.params.id);
		if (!area) error(404, 'error.notFound');
		requirePermission(ctx, 'area.manage', area.id);
		const result = await attempt(() => deleteArea(db(), actorOf(event), edition.id, area.id), {
			action: 'delete'
		});
		if (!result.ok) return result.failure;
		redirect(303, '/admin/areas');
	}
};
