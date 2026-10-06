import { getAdminContext } from '#lib/server/guards.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const ctx = await getAdminContext(event);
	const { authz } = ctx;
	return {
		editions: ctx.editions.map((e) => ({
			id: e.id,
			name: e.name,
			isCurrent: e.isCurrent,
			archived: e.archivedAt !== null
		})),
		edition: ctx.edition && {
			id: ctx.edition.id,
			name: ctx.edition.name,
			isCurrent: ctx.edition.isCurrent
		},
		access: {
			isAdmin: authz.isAdmin,
			areas: authz.canSomewhere('area.manage'),
			people:
				authz.isAdmin ||
				authz.canSomewhere('role.assign') ||
				authz.canSomewhere('helper.contact.view'),
			audit: authz.can('audit.view')
		}
	};
};
