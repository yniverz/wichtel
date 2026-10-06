import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '#lib/server/app.ts';
import {
	actorOf,
	attempt,
	getAdminContext,
	requireAdmin,
	requireEdition
} from '#lib/server/guards.ts';
import { setAdmin } from '#lib/server/services/accounts.ts';
import { getPerson } from '#lib/server/services/people.ts';
import {
	assignRole,
	listAssignmentsForUser,
	listRoles,
	removeAssignment
} from '#lib/server/services/roles.ts';
import { checkbox, optionalUuid, parseForm, uuid } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const ctx = await getAdminContext(event);
	const { authz } = ctx;
	if (!(
		authz.isAdmin ||
		authz.canSomewhere('role.assign') ||
		authz.canSomewhere('helper.contact.view')
	)) {
		error(403, 'error.forbidden');
	}
	const person = await getPerson(db(), event.params.id);
	if (!person) error(404, 'error.notFound');

	const edition = ctx.edition;
	const tree = ctx.tree;
	const [assignments, roles] = await Promise.all([
		edition ? listAssignmentsForUser(db(), person.id, edition.id) : Promise.resolve([]),
		listRoles(db())
	]);

	// Scopes where the viewer may hand out roles, and which roles they may hand out at all.
	const scopes = [
		...(authz.can('role.assign') ? [{ id: '', label: null as string | null, depth: 0 }] : []),
		...(tree?.flat() ?? [])
			.filter(({ area }) => authz.can('role.assign', area.id))
			.map(({ area, depth }) => ({ id: area.id, label: area.nameDe as string | null, depth }))
	];
	const assignableRoles = roles.filter((r) =>
		scopes.some((s) => authz.canAssignRole(r.permissions, s.id || null))
	);

	return {
		person: {
			id: person.id,
			firstName: person.firstName,
			lastName: person.lastName,
			createdAt: person.createdAt,
			isAdmin: person.isAdmin,
			emailVerified: person.emailVerifiedAt !== null,
			// Contact details only with the matching permission.
			email: authz.can('helper.contact.view') || authz.isAdmin ? person.email : null,
			phone: authz.can('helper.contact.view') || authz.isAdmin ? person.phone : null
		},
		assignments: assignments.map((a) => ({
			...a,
			removable: authz.canAssignRole(a.role.permissions, a.areaId)
		})),
		assignableRoles: assignableRoles.map((r) => ({ id: r.id, nameDe: r.nameDe, nameEn: r.nameEn })),
		scopes,
		isSelf: person.id === ctx.user.id
	};
};

export const actions: Actions = {
	assign: async (event) => {
		const ctx = await getAdminContext(event);
		const { edition } = requireEdition(ctx);
		const parsed = parseForm(
			z.object({ roleId: uuid, areaId: optionalUuid }),
			await event.request.formData()
		);
		if (!parsed.ok) return fail(400, { action: 'assign', errors: parsed.errors });
		const result = await attempt(
			() =>
				assignRole(db(), actorOf(event), ctx.authz, {
					userId: event.params.id,
					roleId: parsed.data.roleId,
					areaId: parsed.data.areaId,
					editionId: edition.id
				}),
			{ action: 'assign' }
		);
		if (!result.ok) return result.failure;
		return { action: 'assign', success: 'common.saved' };
	},
	remove: async (event) => {
		const ctx = await getAdminContext(event);
		const parsed = parseForm(z.object({ id: uuid }), await event.request.formData());
		if (!parsed.ok) return fail(400, { action: 'remove', error: 'error.notFound' });
		const result = await attempt(
			() => removeAssignment(db(), actorOf(event), ctx.authz, parsed.data.id),
			{
				action: 'remove'
			}
		);
		if (!result.ok) return result.failure;
		return { action: 'remove', success: 'common.saved' };
	},
	admin: async (event) => {
		requireAdmin(await getAdminContext(event));
		const parsed = parseForm(z.object({ isAdmin: checkbox }), await event.request.formData());
		if (!parsed.ok) return fail(400, { action: 'admin', error: 'error.generic' });
		const result = await attempt(
			() => setAdmin(db(), actorOf(event), event.params.id, parsed.data.isAdmin),
			{
				action: 'admin'
			}
		);
		if (!result.ok) return result.failure;
		return { action: 'admin', success: 'common.saved' };
	}
};
