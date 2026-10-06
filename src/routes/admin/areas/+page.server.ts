import { error } from '@sveltejs/kit';
import { getAdminContext, requireEdition } from '#lib/server/guards.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const ctx = await getAdminContext(event);
	if (!ctx.authz.canSomewhere('area.manage')) error(403, 'error.forbidden');
	const { tree } = requireEdition(ctx);
	return {
		canCreateRoot: ctx.authz.can('area.manage'),
		areas: tree.flat().map(({ area, depth }) => ({
			id: area.id,
			nameDe: area.nameDe,
			nameEn: area.nameEn,
			descriptionDe: area.descriptionDe,
			descriptionEn: area.descriptionEn,
			depth,
			canManage: ctx.authz.can('area.manage', area.id)
		}))
	};
};
