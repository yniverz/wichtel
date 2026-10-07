import { getAdminContext } from '#lib/server/guards.ts';
import { hasShiftAccess } from '#lib/server/shift-access.ts';
import { db } from '#lib/server/app.ts';
import { pendingRequests } from '#lib/server/services/assignments.ts';
import { pendingSwaps } from '#lib/server/services/swaps.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const ctx = await getAdminContext(event);
	const { authz } = ctx;
	const shifts = hasShiftAccess(ctx);
	const openRequests =
		shifts && ctx.edition
			? (await pendingRequests(db(), authz, ctx.edition.id)).length +
				(await pendingSwaps(db(), authz, ctx.edition.id)).length
			: 0;
	return {
		openRequests,
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
			shifts,
			waves: authz.can('shift.manage'),
			mail: authz.canSomewhere('mail.send'),
			goodies: authz.can('goodie.manage'),
			qualifications: authz.isAdmin || authz.canSomewhere('qualification.review'),
			desk:
				authz.canSomewhere('goodie.issue') ||
				authz.canSomewhere('attendance.confirm') ||
				authz.can('points.adjust'),
			people:
				authz.isAdmin ||
				authz.canSomewhere('role.assign') ||
				authz.canSomewhere('helper.contact.view'),
			audit: authz.can('audit.view')
		}
	};
};
