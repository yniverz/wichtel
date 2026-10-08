import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { config, db } from '#lib/server/app.ts';
import { deleteAccount } from '#lib/server/services/privacy.ts';
import {
	grantQualification,
	listUserQualifications,
	qualificationOptions,
	revokeQualification
} from '#lib/server/services/qualifications.ts';
import {
	actorOf,
	attempt,
	getAdminContext,
	requireAdmin,
	requireEdition
} from '#lib/server/guards.ts';
import { setAdmin } from '#lib/server/services/accounts.ts';
import { getSettings } from '#lib/server/services/settings.ts';
import { getPerson } from '#lib/server/services/people.ts';
import {
	assignRole,
	listAssignmentsForUser,
	listRoles,
	removeAssignment
} from '#lib/server/services/roles.ts';
import { checkbox, optionalUuid, parseForm, uuid } from '#lib/server/validation.ts';
import { displayValue } from '#lib/domain/fields.ts';
import { listFields, valuesOf } from '#lib/server/services/fields.ts';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { assignments as assignmentTable, shifts } from '#lib/server/db/schema.ts';
import { canSeeShiftArea } from '#lib/server/shift-access.ts';
import type { Actions, PageServerLoad } from './$types';

async function personDetails(userId: string) {
	const [fields, values] = await Promise.all([listFields(db()), valuesOf(db(), userId)]);
	return fields
		.map((f) => ({
			id: f.id,
			labelDe: f.labelDe,
			labelEn: f.labelEn,
			value: displayValue(values[f.id], '✓', '–')
		}))
		.filter((d) => d.value !== '');
}

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
	if (!person || person.deletedAt) error(404, 'error.notFound');
	const canReviewQualifications = authz.canSomewhere('qualification.review');

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

	// The person's shifts in this edition, as far as the viewer may see them.
	const personShifts = edition
		? (
				await db()
					.select({
						id: shifts.id,
						areaId: shifts.areaId,
						titleDe: shifts.titleDe,
						titleEn: shifts.titleEn,
						startsAt: shifts.startsAt,
						endsAt: shifts.endsAt,
						status: assignmentTable.status,
						attendance: assignmentTable.attendance
					})
					.from(assignmentTable)
					.innerJoin(shifts, eq(assignmentTable.shiftId, shifts.id))
					.where(
						and(
							eq(assignmentTable.userId, person.id),
							eq(shifts.editionId, edition.id),
							inArray(assignmentTable.status, ['booked', 'requested', 'held', 'waitlisted'])
						)
					)
					.orderBy(asc(shifts.startsAt))
			)
				.filter((r) => canSeeShiftArea(ctx, r.areaId))
				.map((r) => ({
					id: r.id,
					titleDe: r.titleDe,
					titleEn: r.titleEn,
					status: r.status,
					attendance: r.attendance,
					startsAt: r.startsAt.toISOString(),
					endsAt: r.endsAt.toISOString()
				}))
		: [];

	return {
		shifts: personShifts,
		timezone: (await getSettings(db())).timezone,
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
		isSelf: person.id === ctx.user.id,
		details:
			authz.isAdmin || authz.can('helper.contact.view') ? await personDetails(person.id) : [],
		qualifications: canReviewQualifications
			? {
					held: (await listUserQualifications(db(), person.id)).map(({ entry, qualification }) => ({
						id: entry.id,
						status: entry.status,
						expiresAt: entry.expiresAt?.toISOString() ?? null,
						nameDe: qualification.nameDe,
						nameEn: qualification.nameEn
					})),
					options: await qualificationOptions(db())
				}
			: null
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
		const { edition } = requireEdition(ctx);
		const parsed = parseForm(z.object({ id: uuid }), await event.request.formData());
		if (!parsed.ok) return fail(400, { action: 'remove', error: 'error.notFound' });
		const result = await attempt(
			() => removeAssignment(db(), actorOf(event), ctx.authz, parsed.data.id, edition.id),
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
	},
	deleteAccount: async (event) => {
		const ctx = await getAdminContext(event);
		requireAdmin(ctx);
		if (event.params.id === ctx.user.id)
			return fail(400, { action: 'delete', error: 'privacy.deleteSelfHere' });
		const result = await attempt(
			() =>
				deleteAccount(
					{ db: db(), uploadDir: config.uploadDir },
					actorOf(event),
					event.params.id,
					'admin'
				),
			{ action: 'delete' }
		);
		if (!result.ok) return result.failure;
		redirect(303, '/admin/people?deleted=1');
	},
	grantQualification: async (event) => {
		const ctx = await getAdminContext(event);
		if (!ctx.authz.canSomewhere('qualification.review')) error(403, 'error.forbidden');
		const parsed = parseForm(z.object({ qualificationId: uuid }), await event.request.formData());
		if (!parsed.ok) return fail(400, { action: 'qualification', error: 'error.notFound' });
		const result = await attempt(
			() =>
				grantQualification(db(), actorOf(event), {
					userId: event.params.id,
					qualificationId: parsed.data.qualificationId,
					now: new Date()
				}),
			{ action: 'qualification' }
		);
		if (!result.ok) return result.failure;
		return { action: 'qualification', success: 'common.saved' };
	},
	revokeQualification: async (event) => {
		const ctx = await getAdminContext(event);
		if (!ctx.authz.canSomewhere('qualification.review')) error(403, 'error.forbidden');
		const parsed = parseForm(z.object({ id: uuid }), await event.request.formData());
		if (!parsed.ok) return fail(400, { action: 'qualification', error: 'error.notFound' });
		const result = await attempt(
			() => revokeQualification(db(), actorOf(event), parsed.data.id, '', new Date()),
			{
				action: 'qualification'
			}
		);
		if (!result.ok) return result.failure;
		return { action: 'qualification', success: 'common.saved' };
	}
};
