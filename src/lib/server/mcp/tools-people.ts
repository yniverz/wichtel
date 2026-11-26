import { and, asc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { displayValue } from '#lib/domain/fields.ts';
import { canViewPeople, PERMISSIONS } from '#lib/domain/permissions.ts';
import { LOCALES } from '#lib/i18n/index.ts';
import type { Tx } from '../db/client.ts';
import { assignments, shifts, type ProfileField } from '../db/schema.ts';
import { audit } from '../audit.ts';
import { canSeeShiftArea } from '../shift-access.ts';
import { markEmailVerified, updateAccount } from '../services/accounts.ts';
import {
	createField,
	fieldsFor,
	listFields,
	saveValues,
	updateField,
	validateFields,
	valuesOf
} from '../services/fields.ts';
import { getPerson } from '../services/people.ts';
import {
	createQualification,
	grantQualification,
	listQualifications,
	listUserQualifications,
	pendingRequests,
	recentDecisions,
	reviewQualification,
	revokeQualification,
	updateQualification
} from '../services/qualifications.ts';
import {
	assignRole,
	createRole,
	deleteRole,
	getRole,
	listAssignmentsForEdition,
	listAssignmentsForUser,
	listRoles,
	removeAssignment,
	roleUsage,
	updateRole
} from '../services/roles.ts';
import { editionParam, ToolError, type Kit } from './kit.ts';

/** Answers to profile fields as the assistant sends them; null clears an answer. */
export const fieldValuesParam = z
	.record(
		z.string().uuid(),
		z.union([z.string().max(2000), z.number(), z.boolean(), z.array(z.string().max(200)), z.null()])
	)
	.describe('Field id → answer (text, number, true/false, list for multiple choice, null clears)');

/**
 * Validates and stores answers to some of `fields` (only those given). Returns per-field errors
 * instead of saving anything when one answer is invalid.
 */
export async function saveFieldAnswers(
	db: Tx,
	userId: string,
	fields: ProfileField[],
	answers: z.infer<typeof fieldValuesParam>
) {
	const given = fields.filter((f) => f.id in answers);
	const unknown = Object.keys(answers).filter((id) => !fields.some((f) => f.id === id));
	if (unknown.length > 0)
		throw new ToolError(`Unknown or inactive field(s): ${unknown.join(', ')}`);
	const raw = Object.fromEntries(
		given.map((f) => {
			const v = answers[f.id];
			const list =
				v === null
					? []
					: Array.isArray(v)
						? v
						: typeof v === 'boolean'
							? [v ? 'on' : '']
							: [String(v)];
			return [f.id, list];
		})
	);
	const checked = validateFields(given, raw);
	if (!checked.ok) throw new ToolError(`Invalid answers: ${JSON.stringify(checked.errors)}`);
	await saveValues(db, userId, checked.values);
	return given.map((f) => f.id);
}

const fieldDefinitionShape = {
	labelEn: z.string().max(200).optional(),
	help: z.string().max(500).optional(),
	helpEn: z.string().max(500).optional(),
	type: z
		.enum(['text', 'textarea', 'number', 'date', 'select', 'multiselect', 'checkbox'])
		.optional(),
	options: z
		.array(z.string().min(1).max(100))
		.max(50)
		.optional()
		.describe('Choices for select / multiselect'),
	required: z.boolean().optional(),
	context: z
		.enum(['registration', 'profile', 'goodie'])
		.optional()
		.describe('Asked at registration, only in the profile, or when choosing certain goodies'),
	goodieIds: z.array(z.string().uuid()).max(50).optional().describe('For context goodie'),
	showToLeads: z
		.boolean()
		.optional()
		.describe('Leads see the answer next to the person in rosters'),
	active: z.boolean().optional(),
	sortOrder: z.number().int().min(-9999).max(9999).optional()
};

const qualificationShape = {
	nameEn: z.string().max(100).optional(),
	description: z.string().max(1000).optional(),
	descriptionEn: z.string().max(1000).optional(),
	proof: z
		.enum(['confirm', 'upload', 'either'])
		.optional()
		.describe('How helpers prove it: confirm, upload a document, or either'),
	documentRetention: z.enum(['keep', 'delete_after_review']).optional(),
	validityDays: z
		.number()
		.int()
		.min(0)
		.max(1440)
		.nullable()
		.optional()
		.describe('null = no expiry'),
	active: z.boolean().optional(),
	sortOrder: z.number().int().min(-9999).max(9999).optional()
};

const roleShape = {
	nameEn: z.string().max(100).optional(),
	description: z.string().max(1000).optional(),
	descriptionEn: z.string().max(1000).optional(),
	permissions: z.array(z.enum(PERMISSIONS)).optional()
};

export function registerPeopleTools(k: Kit) {
	const { ctx, tool, scope, require, requireAdmin, enabled, pick, nameOf, person, local } = k;

	// -- reading --------------------------------------------------------------------

	tool(
		'list_roles',
		{
			title: 'List roles',
			description: `Role definitions with their permissions and how often they are assigned. Permissions: ${PERMISSIONS.join(', ')}.`,
			input: {},
			readOnly: true
		},
		async () => {
			const s = await scope();
			require(s.authz.isAdmin || s.authz.canSomewhere('role.assign'));
			const [list, usage] = await Promise.all([listRoles(ctx.db), roleUsage(ctx.db)]);
			return list.map((r) => ({
				id: r.id,
				name: r.nameDe,
				nameEn: r.nameEn,
				description: r.descriptionDe,
				permissions: r.permissions,
				assigned: usage.get(r.id) ?? 0
			}));
		}
	);

	tool(
		'list_role_assignments',
		{
			title: 'List role assignments',
			description: 'Who has which role in which area in an edition (the crew).',
			input: { ...editionParam, areaId: z.string().uuid().optional() },
			readOnly: true
		},
		async ({ editionId, areaId }) => {
			const s = await scope(editionId);
			require(canViewPeople(s.authz));
			const rows = await listAssignmentsForEdition(ctx.db, s.edition.id);
			const covered = areaId ? s.tree.covered([areaId]) : null;
			return rows
				.filter((r) => !covered || (r.areaId !== null && covered.has(r.areaId)))
				.map((r) => ({
					assignmentId: r.id,
					userId: r.userId,
					name: nameOf({ id: r.userId, firstName: r.firstName, lastName: r.lastName }),
					role: r.roleNameDe,
					areaId: r.areaId,
					area: r.areaId ? k.areaPath(s, r.areaId) : 'whole edition'
				}));
		}
	);

	tool(
		'get_person',
		{
			title: 'Get person',
			description:
				'One person: roles in the edition, shifts, qualifications and profile answers (as far as you may see them).',
			input: { ...editionParam, userId: z.string().uuid() },
			readOnly: true
		},
		async ({ editionId, userId }) => {
			const s = await scope(editionId);
			require(canViewPeople(s.authz));
			const p = await getPerson(ctx.db, userId);
			if (!p || p.deletedAt) throw new ToolError(k.t('error.notFound'));
			const contact = s.authz.isAdmin || s.authz.can('helper.contact.view');
			const [roles, rows] = await Promise.all([
				listAssignmentsForUser(ctx.db, p.id, s.edition.id),
				ctx.db
					.select({
						assignmentId: assignments.id,
						shiftId: shifts.id,
						areaId: shifts.areaId,
						title: shifts.titleDe,
						startsAt: shifts.startsAt,
						status: assignments.status,
						attendance: assignments.attendance
					})
					.from(assignments)
					.innerJoin(shifts, eq(assignments.shiftId, shifts.id))
					.where(
						and(
							eq(assignments.userId, p.id),
							eq(shifts.editionId, s.edition.id),
							inArray(assignments.status, ['booked', 'requested', 'held', 'waitlisted'])
						)
					)
					.orderBy(asc(shifts.startsAt))
			]);
			const result: Record<string, unknown> = {
				...person(p, contact),
				isAdmin: p.isAdmin,
				emailVerified: p.emailVerifiedAt !== null,
				roles: roles.map((r) => ({
					assignmentId: r.id,
					roleId: r.roleId,
					role: r.role.nameDe,
					areaId: r.areaId,
					area: r.areaNameDe ?? 'whole edition',
					removable: s.authz.canAssignRole(r.role.permissions, r.areaId)
				})),
				shifts: rows
					.filter((r) => canSeeShiftArea(s, r.areaId))
					.map((r) => ({
						assignmentId: r.assignmentId,
						shiftId: r.shiftId,
						title: r.title,
						start: local(r.startsAt),
						status: r.status,
						attendance: r.attendance
					}))
			};
			if (s.authz.canSomewhere('qualification.review'))
				result.qualifications = (await listUserQualifications(ctx.db, p.id)).map(
					({ entry, qualification }) => ({
						id: entry.id,
						qualificationId: qualification.id,
						name: qualification.nameDe,
						status: entry.status,
						expiresAt: entry.expiresAt ? local(entry.expiresAt) : null
					})
				);
			if (contact && ctx.settings.mcpPersonalData !== 'pseudonymous') {
				const [fields, values] = await Promise.all([listFields(ctx.db), valuesOf(ctx.db, p.id)]);
				result.profile = fields
					.map((f) => ({
						fieldId: f.id,
						label: f.labelDe,
						value: displayValue(values[f.id], '✓', '–')
					}))
					.filter((d) => d.value !== '');
			}
			return result;
		}
	);

	tool(
		'list_fields',
		{
			title: 'List profile fields',
			description: 'Custom questions asked at registration, in the profile or for goodies.',
			input: {},
			readOnly: true
		},
		async () => {
			requireAdmin();
			return (await listFields(ctx.db)).map((f) => ({
				id: f.id,
				label: f.labelDe,
				labelEn: f.labelEn,
				help: f.helpDe,
				type: f.type,
				options: f.options,
				required: f.required,
				context: f.context,
				goodieIds: f.goodieIds,
				showToLeads: f.showToLeads,
				active: f.active,
				sortOrder: f.sortOrder
			}));
		}
	);

	tool(
		'list_qualification_requests',
		{
			title: 'Qualification requests',
			description: 'Pending qualification requests (to review) and the latest decisions.',
			input: {},
			readOnly: true
		},
		async () => {
			const s = await scope();
			require(s.authz.isAdmin || s.authz.canSomewhere('qualification.review'));
			const [pending, recent] = await Promise.all([
				pendingRequests(ctx.db),
				recentDecisions(ctx.db, 20)
			]);
			return {
				pending: pending.map((r) => ({
					requestId: r.id,
					userId: r.userId,
					name: nameOf({ id: r.userId, firstName: r.firstName, lastName: r.lastName }),
					qualification: r.qualificationNameDe,
					note: r.note,
					hasDocument: r.documentId !== null,
					since: local(r.createdAt)
				})),
				recent: recent.map((r) => ({
					requestId: r.id,
					name: nameOf({ id: r.userId, firstName: r.firstName, lastName: r.lastName }),
					qualification: r.qualificationNameDe,
					status: r.status,
					at: r.reviewedAt ? local(r.reviewedAt) : null
				}))
			};
		}
	);

	// -- roles ----------------------------------------------------------------------

	if (enabled('roles')) {
		tool(
			'create_role',
			{
				title: 'Create role',
				description:
					'Defines a new role (a bundle of permissions). Administrators only. Assign it with assign_role.',
				input: { name: z.string().min(1).max(100), ...roleShape }
			},
			async (a) => {
				requireAdmin();
				const role = await createRole(ctx.db, ctx.actor, {
					nameDe: a.name,
					nameEn: a.nameEn ?? '',
					descriptionDe: a.description ?? '',
					descriptionEn: a.descriptionEn ?? '',
					permissions: a.permissions ?? []
				});
				return { id: role.id, name: role.nameDe, permissions: role.permissions };
			}
		);

		tool(
			'update_role',
			{
				title: 'Update role',
				description:
					'Changes a role definition; permissions is the full new list. Affects everyone who has the role. Administrators only.',
				input: {
					roleId: z.string().uuid(),
					name: z.string().min(1).max(100).optional(),
					...roleShape
				}
			},
			async (a) => {
				requireAdmin();
				const role = await getRole(ctx.db, a.roleId);
				if (!role) throw new ToolError(k.t('error.notFound'));
				await updateRole(ctx.db, ctx.actor, role.id, {
					nameDe: pick(a.name, role.nameDe),
					nameEn: pick(a.nameEn, role.nameEn),
					descriptionDe: pick(a.description, role.descriptionDe),
					descriptionEn: pick(a.descriptionEn, role.descriptionEn),
					permissions: pick(a.permissions, role.permissions as (typeof PERMISSIONS)[number][])
				});
				return { id: role.id, updated: true };
			}
		);

		tool(
			'delete_role',
			{
				title: 'Delete role',
				description:
					'Deletes a role definition. Without confirm: true it only reports how many assignments it has. Administrators only.',
				input: { roleId: z.string().uuid(), confirm: z.boolean().optional() },
				destructive: true
			},
			async ({ roleId, confirm }) => {
				requireAdmin();
				const role = await getRole(ctx.db, roleId);
				if (!role) throw new ToolError(k.t('error.notFound'));
				if (!confirm)
					return {
						preview: true,
						role: role.nameDe,
						assigned: (await roleUsage(ctx.db)).get(role.id) ?? 0,
						note: 'Repeat with confirm: true to delete.'
					};
				await deleteRole(ctx.db, ctx.actor, role.id);
				return { deleted: role.id };
			}
		);

		tool(
			'assign_role',
			{
				title: 'Assign role',
				description:
					'Gives a person a role in an area (incl. sub-areas) or the whole edition. Nobody can hand out more permissions than they have there.',
				input: {
					...editionParam,
					userId: z.string().uuid(),
					roleId: z.string().uuid(),
					areaId: z.string().uuid().nullable().optional().describe('null/omitted = whole edition')
				}
			},
			async ({ editionId, userId, roleId, areaId }) => {
				const s = await scope(editionId);
				await assignRole(ctx.db, ctx.actor, s.authz, {
					userId,
					roleId,
					areaId: areaId ?? null,
					editionId: s.edition.id
				});
				return { userId, roleId, areaId: areaId ?? null };
			}
		);

		tool(
			'remove_role_assignment',
			{
				title: 'Remove role assignment',
				description:
					'Takes a role away again (assignment id from get_person or list_role_assignments).',
				input: { ...editionParam, assignmentId: z.string().uuid() },
				destructive: true
			},
			async ({ editionId, assignmentId }) => {
				const s = await scope(editionId);
				await removeAssignment(ctx.db, ctx.actor, s.authz, assignmentId, s.edition.id);
				return { removed: assignmentId };
			}
		);
	}

	// -- people, qualifications, profile fields --------------------------------------------

	if (!enabled('people')) return;

	tool(
		'update_person',
		{
			title: 'Update person',
			description:
				'Corrects a person’s name, phone or language. Administrators only. E-mail addresses can only be changed in Wichtel itself.',
			input: {
				userId: z.string().uuid(),
				firstName: z.string().min(1).max(100).optional(),
				lastName: z.string().min(1).max(100).optional(),
				phone: z.string().max(50).optional(),
				locale: z.enum(LOCALES).optional()
			}
		},
		async (a) => {
			requireAdmin();
			const p = await getPerson(ctx.db, a.userId);
			if (!p || p.deletedAt) throw new ToolError(k.t('error.notFound'));
			await updateAccount(ctx.db, ctx.actor, p.id, {
				firstName: pick(a.firstName, p.firstName),
				lastName: pick(a.lastName, p.lastName),
				phone: pick(a.phone, p.phone),
				locale: pick(a.locale, p.locale),
				// Never changed through an assistant: a new address would take over the account.
				email: p.email
			});
			return { userId: p.id, updated: true };
		}
	);

	tool(
		'set_person_fields',
		{
			title: 'Set profile answers of a person',
			description:
				'Sets answers to registration/profile fields (see list_fields) for a person. Only given fields change. Administrators only.',
			input: { userId: z.string().uuid(), values: fieldValuesParam }
		},
		async ({ userId, values }) => {
			requireAdmin();
			const p = await getPerson(ctx.db, userId);
			if (!p || p.deletedAt) throw new ToolError(k.t('error.notFound'));
			const fields = fieldsFor(await listFields(ctx.db), 'profile');
			const saved = await ctx.db.transaction(async (tx) => {
				const ids = await saveFieldAnswers(tx, p.id, fields, values);
				await audit(tx, ctx.actor, {
					action: 'user.update',
					entityType: 'user',
					entityId: p.id,
					data: { fields: ['profileFields'] }
				});
				return ids;
			});
			return { userId: p.id, saved };
		}
	);

	tool(
		'verify_email',
		{
			title: 'Confirm e-mail address',
			description:
				'Marks a person’s e-mail address as confirmed (e.g. the confirmation mail never arrived). Administrators only.',
			input: { userId: z.string().uuid() }
		},
		async ({ userId }) => {
			requireAdmin();
			await markEmailVerified(ctx.db, ctx.actor, userId);
			return { userId, verified: true };
		}
	);

	const requireReviewer = async () => {
		const s = await scope();
		require(s.authz.isAdmin || s.authz.canSomewhere('qualification.review'));
	};

	tool(
		'grant_qualification',
		{
			title: 'Grant qualification',
			description: 'Gives a person a qualification directly (no request needed).',
			input: { userId: z.string().uuid(), qualificationId: z.string().uuid() }
		},
		async ({ userId, qualificationId }) => {
			await requireReviewer();
			await grantQualification(ctx.db, ctx.actor, { userId, qualificationId, now: ctx.now() });
			return { userId, qualificationId, granted: true };
		}
	);

	tool(
		'revoke_qualification',
		{
			title: 'Revoke qualification',
			description: 'Takes a qualification away (id of the person’s entry, see get_person).',
			input: { id: z.string().uuid(), reason: z.string().max(500).optional() },
			destructive: true
		},
		async ({ id, reason }) => {
			await requireReviewer();
			await revokeQualification(ctx.db, ctx.actor, id, reason ?? '', ctx.now());
			return { revoked: id };
		}
	);

	tool(
		'review_qualification',
		{
			title: 'Decide qualification request',
			description: 'Approves or rejects a pending request (see list_qualification_requests).',
			input: {
				requestId: z.string().uuid(),
				approve: z.boolean(),
				reviewNote: z.string().max(500).optional().describe('Shown to the person')
			}
		},
		async ({ requestId, approve, reviewNote }) => {
			await requireReviewer();
			await reviewQualification(ctx.db, ctx.uploadDir, ctx.actor, {
				id: requestId,
				approve,
				reviewNote: reviewNote ?? '',
				now: ctx.now()
			});
			return { requestId, approved: approve };
		}
	);

	tool(
		'create_qualification',
		{
			title: 'Create qualification',
			description:
				'Defines a qualification positions can require (e.g. first aid, awareness training). Administrators only.',
			input: { name: z.string().min(1).max(100), ...qualificationShape }
		},
		async (a) => {
			requireAdmin();
			const q = await createQualification(ctx.db, ctx.actor, {
				nameDe: a.name,
				nameEn: a.nameEn ?? '',
				descriptionDe: a.description ?? '',
				descriptionEn: a.descriptionEn ?? '',
				proof: a.proof ?? 'confirm',
				documentRetention: a.documentRetention ?? 'delete_after_review',
				validityDays: a.validityDays ?? null,
				active: a.active ?? true,
				sortOrder: a.sortOrder ?? 0
			});
			return { id: q.id, name: q.nameDe };
		}
	);

	tool(
		'update_qualification',
		{
			title: 'Update qualification',
			description:
				'Changes a qualification definition. Only given fields change. Administrators only.',
			input: {
				qualificationId: z.string().uuid(),
				name: z.string().min(1).max(100).optional(),
				...qualificationShape
			}
		},
		async (a) => {
			requireAdmin();
			const q = (await listQualifications(ctx.db)).find((x) => x.id === a.qualificationId);
			if (!q) throw new ToolError(k.t('error.notFound'));
			await updateQualification(ctx.db, ctx.actor, q.id, {
				nameDe: pick(a.name, q.nameDe),
				nameEn: pick(a.nameEn, q.nameEn),
				descriptionDe: pick(a.description, q.descriptionDe),
				descriptionEn: pick(a.descriptionEn, q.descriptionEn),
				proof: pick(a.proof, q.proof),
				documentRetention: pick(a.documentRetention, q.documentRetention),
				validityDays: pick(a.validityDays, q.validityDays),
				active: pick(a.active, q.active),
				sortOrder: pick(a.sortOrder, q.sortOrder)
			});
			return { id: q.id, updated: true };
		}
	);

	const checkOptions = (type: string, options: string[]) => {
		if ((type === 'select' || type === 'multiselect') && options.length === 0)
			throw new ToolError('Select fields need options.');
	};

	tool(
		'create_field',
		{
			title: 'Create profile field',
			description:
				'Adds a custom question for registration, the profile or certain goodies. Administrators only.',
			input: { label: z.string().min(1).max(200), ...fieldDefinitionShape }
		},
		async (a) => {
			requireAdmin();
			const type = a.type ?? 'text';
			const context = a.context ?? 'profile';
			const options = type === 'select' || type === 'multiselect' ? (a.options ?? []) : [];
			checkOptions(type, options);
			const field = await createField(ctx.db, ctx.actor, {
				labelDe: a.label,
				labelEn: a.labelEn ?? '',
				helpDe: a.help ?? '',
				helpEn: a.helpEn ?? '',
				type,
				options,
				required: a.required ?? false,
				context,
				goodieIds: context === 'goodie' ? (a.goodieIds ?? []) : [],
				showToLeads: a.showToLeads ?? false,
				active: a.active ?? true,
				sortOrder: a.sortOrder ?? 0
			});
			return { id: field.id, label: field.labelDe };
		}
	);

	tool(
		'update_field',
		{
			title: 'Update profile field',
			description: 'Changes a custom question. Only given fields change. Administrators only.',
			input: {
				fieldId: z.string().uuid(),
				label: z.string().min(1).max(200).optional(),
				...fieldDefinitionShape
			}
		},
		async (a) => {
			requireAdmin();
			const f = (await listFields(ctx.db)).find((x) => x.id === a.fieldId);
			if (!f) throw new ToolError(k.t('error.notFound'));
			const type = pick(a.type, f.type);
			const context = pick(a.context, f.context);
			const options = type === 'select' || type === 'multiselect' ? pick(a.options, f.options) : [];
			checkOptions(type, options);
			await updateField(ctx.db, ctx.actor, f.id, {
				labelDe: pick(a.label, f.labelDe),
				labelEn: pick(a.labelEn, f.labelEn),
				helpDe: pick(a.help, f.helpDe),
				helpEn: pick(a.helpEn, f.helpEn),
				type,
				options,
				required: pick(a.required, f.required),
				context,
				goodieIds: context === 'goodie' ? pick(a.goodieIds, f.goodieIds) : [],
				showToLeads: pick(a.showToLeads, f.showToLeads),
				active: pick(a.active, f.active),
				sortOrder: pick(a.sortOrder, f.sortOrder)
			});
			return { id: f.id, updated: true };
		}
	);
}
