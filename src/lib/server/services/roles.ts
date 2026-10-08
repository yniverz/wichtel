import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { Authz, isPermission, type Permission } from '#lib/domain/permissions.ts';
import type { DB, Tx } from '../db/client.ts';
import {
	areas,
	editions,
	roleAssignments,
	roles,
	users,
	type Role,
	type User
} from '../db/schema.ts';
import { audit, diff, type Actor } from '../audit.ts';
import { DomainError } from '../errors.ts';
import { loadAreaTree } from './areas.ts';

export interface RoleInput {
	nameDe: string;
	nameEn: string;
	descriptionDe: string;
	descriptionEn: string;
	permissions: Permission[];
}

export function listRoles(db: Tx): Promise<Role[]> {
	return db.select().from(roles).orderBy(asc(roles.nameDe));
}

export async function getRole(db: Tx, id: string): Promise<Role | undefined> {
	const [row] = await db.select().from(roles).where(eq(roles.id, id));
	return row;
}

/** Number of assignments per role (all editions). */
export async function roleUsage(db: Tx): Promise<Map<string, number>> {
	const rows = await db
		.select({ roleId: roleAssignments.roleId, count: sql<number>`count(*)::int` })
		.from(roleAssignments)
		.groupBy(roleAssignments.roleId);
	return new Map(rows.map((r) => [r.roleId, r.count]));
}

function cleanPermissions(permissions: readonly string[]): Permission[] {
	return [...new Set(permissions.filter(isPermission))];
}

export async function createRole(db: DB, actor: Actor, input: RoleInput): Promise<Role> {
	return db.transaction(async (tx) => {
		const values = { ...input, permissions: cleanPermissions(input.permissions) };
		const [role] = await tx.insert(roles).values(values).returning();
		await audit(tx, actor, {
			action: 'role.create',
			entityType: 'role',
			entityId: role.id,
			data: { after: values }
		});
		return role;
	});
}

export async function updateRole(
	db: DB,
	actor: Actor,
	id: string,
	input: RoleInput
): Promise<Role> {
	return db.transaction(async (tx) => {
		const before = await getRole(tx, id);
		if (!before) throw new DomainError('notFound');
		const values = { ...input, permissions: cleanPermissions(input.permissions) };
		const [after] = await tx.update(roles).set(values).where(eq(roles.id, id)).returning();
		const changes = diff(before, values);
		if (changes) {
			await audit(tx, actor, {
				action: 'role.update',
				entityType: 'role',
				entityId: id,
				data: changes
			});
		}
		return after;
	});
}

export async function deleteRole(db: DB, actor: Actor, id: string): Promise<void> {
	await db.transaction(async (tx) => {
		const role = await getRole(tx, id);
		if (!role) throw new DomainError('notFound');
		await tx.delete(roles).where(eq(roles.id, id));
		await audit(tx, actor, {
			action: 'role.delete',
			entityType: 'role',
			entityId: id,
			data: { before: { nameDe: role.nameDe, permissions: role.permissions } }
		});
	});
}

// ---------------------------------------------------------------------------
// Assignments & authorization
// ---------------------------------------------------------------------------

/** Builds the permission checker for a user within an edition. */
export async function loadAuthz(
	db: Tx,
	user: Pick<User, 'id' | 'isAdmin'>,
	editionId: string | null
): Promise<Authz> {
	if (!editionId) return new Authz(user.isAdmin, [], () => []);
	const [grants, tree] = await Promise.all([
		// Roles of an archived edition no longer give any rights (former leads keep nothing).
		db
			.select({
				areaId: roleAssignments.areaId,
				permissions: roles.permissions,
				isCurrent: editions.isCurrent
			})
			.from(roleAssignments)
			.innerJoin(roles, eq(roleAssignments.roleId, roles.id))
			.innerJoin(editions, eq(roleAssignments.editionId, editions.id))
			.where(
				and(
					eq(roleAssignments.userId, user.id),
					eq(roleAssignments.editionId, editionId),
					isNull(editions.archivedAt)
				)
			),
		loadAreaTree(db, editionId)
	]);
	// People are instance-wide: their contact data and proofs are only visible through roles of
	// the current edition, not through roles of past (or upcoming) years.
	const effective = grants.map((g) => ({
		areaId: g.areaId,
		permissions: g.isCurrent
			? g.permissions
			: g.permissions.filter((p) => !CURRENT_EDITION_ONLY.includes(p))
	}));
	return new Authz(user.isAdmin, effective, (id) => tree.lineage(id));
}

/** Permissions on personal data that only count in the current edition. */
const CURRENT_EDITION_ONLY: readonly string[] = [
	'helper.contact.view',
	'qualification.documents.view'
];

export interface AssignmentView {
	id: string;
	userId: string;
	roleId: string;
	areaId: string | null;
	role: Pick<Role, 'nameDe' | 'nameEn' | 'permissions'>;
	areaNameDe: string | null;
	areaNameEn: string | null;
}

export async function listAssignmentsForUser(
	db: Tx,
	userId: string,
	editionId: string
): Promise<AssignmentView[]> {
	return db
		.select({
			id: roleAssignments.id,
			userId: roleAssignments.userId,
			roleId: roleAssignments.roleId,
			areaId: roleAssignments.areaId,
			role: { nameDe: roles.nameDe, nameEn: roles.nameEn, permissions: roles.permissions },
			areaNameDe: areas.nameDe,
			areaNameEn: areas.nameEn
		})
		.from(roleAssignments)
		.innerJoin(roles, eq(roleAssignments.roleId, roles.id))
		.leftJoin(areas, eq(roleAssignments.areaId, areas.id))
		.where(and(eq(roleAssignments.userId, userId), eq(roleAssignments.editionId, editionId)))
		.orderBy(asc(roles.nameDe));
}

export async function listAssignmentsForEdition(db: Tx, editionId: string) {
	return db
		.select({
			id: roleAssignments.id,
			userId: roleAssignments.userId,
			areaId: roleAssignments.areaId,
			roleNameDe: roles.nameDe,
			roleNameEn: roles.nameEn,
			firstName: users.firstName,
			lastName: users.lastName
		})
		.from(roleAssignments)
		.innerJoin(roles, eq(roleAssignments.roleId, roles.id))
		.innerJoin(users, eq(roleAssignments.userId, users.id))
		.where(eq(roleAssignments.editionId, editionId))
		.orderBy(asc(users.lastName), asc(users.firstName));
}

export async function assignRole(
	db: DB,
	actor: Actor,
	actorAuthz: Authz,
	input: { userId: string; roleId: string; editionId: string; areaId: string | null }
): Promise<void> {
	await db.transaction(async (tx) => {
		const role = await getRole(tx, input.roleId);
		if (!role) throw new DomainError('notFound', 'roleId');
		if (input.areaId) {
			const tree = await loadAreaTree(tx, input.editionId);
			if (!tree.has(input.areaId)) throw new DomainError('notFound', 'areaId');
		}
		const [user] = await tx.select({ id: users.id }).from(users).where(eq(users.id, input.userId));
		if (!user) throw new DomainError('notFound');
		if (!actorAuthz.canAssignRole(role.permissions, input.areaId)) {
			throw new DomainError('cannotAssignRole');
		}
		const [created] = await tx
			.insert(roleAssignments)
			.values({ ...input, createdBy: actor.userId })
			.onConflictDoNothing()
			.returning();
		if (!created) throw new DomainError('alreadyAssigned');
		await audit(tx, actor, {
			action: 'role_assignment.create',
			entityType: 'user',
			entityId: input.userId,
			editionId: input.editionId,
			data: { roleId: role.id, role: role.nameDe, areaId: input.areaId }
		});
	});
}

export async function removeAssignment(
	db: DB,
	actor: Actor,
	actorAuthz: Authz,
	assignmentId: string,
	/** The edition `actorAuthz` was loaded for; assignments of other editions are out of reach. */
	editionId: string
): Promise<void> {
	await db.transaction(async (tx) => {
		const [row] = await tx
			.select({ assignment: roleAssignments, role: roles })
			.from(roleAssignments)
			.innerJoin(roles, eq(roleAssignments.roleId, roles.id))
			.where(and(eq(roleAssignments.id, assignmentId), eq(roleAssignments.editionId, editionId)));
		if (!row) throw new DomainError('notFound');
		// Removing follows the same rule as granting: you need the role's permissions at that scope.
		if (!actorAuthz.canAssignRole(row.role.permissions, row.assignment.areaId)) {
			throw new DomainError('cannotAssignRole');
		}
		await tx.delete(roleAssignments).where(eq(roleAssignments.id, assignmentId));
		await audit(tx, actor, {
			action: 'role_assignment.delete',
			entityType: 'user',
			entityId: row.assignment.userId,
			editionId: row.assignment.editionId,
			data: { roleId: row.role.id, role: row.role.nameDe, areaId: row.assignment.areaId }
		});
	});
}

/** Role templates created during setup – a sensible starting point, fully editable afterwards. */
export const ROLE_TEMPLATES: RoleInput[] = [
	{
		nameDe: 'Gesamtleitung',
		nameEn: 'Festival lead',
		descriptionDe: 'Hat in ihrem Geltungsbereich alle Rechte.',
		descriptionEn: 'Has all permissions within their scope.',
		permissions: [
			'area.manage',
			'role.assign',
			'dashboard.view',
			'audit.view',
			'shift.manage',
			'assignment.manage',
			'assignment.override',
			'attendance.confirm',
			'qualification.review',
			'qualification.documents.view',
			'helper.contact.view',
			'mail.send',
			'goodie.manage',
			'goodie.issue',
			'points.adjust'
		]
	},
	{
		nameDe: 'Bereichsleitung',
		nameEn: 'Area lead',
		descriptionDe: 'Plant Schichten und betreut die Helfenden ihres Bereichs.',
		descriptionEn: 'Plans shifts and looks after the volunteers of their area.',
		permissions: [
			'area.manage',
			'role.assign',
			'dashboard.view',
			'shift.manage',
			'assignment.manage',
			'assignment.override',
			'attendance.confirm',
			'qualification.review',
			'helper.contact.view',
			'mail.send'
		]
	},
	{
		nameDe: 'Schichtleitung',
		nameEn: 'Shift lead',
		descriptionDe: 'Bestätigt vor Ort die Anwesenheit und erreicht die Helfenden.',
		descriptionEn: 'Confirms attendance on site and can contact volunteers.',
		permissions: ['attendance.confirm', 'helper.contact.view', 'dashboard.view']
	},
	{
		nameDe: 'Helferanmeldung',
		nameEn: 'Volunteer desk',
		descriptionDe: 'Zentrale Anlaufstelle: Check-in, Anfragen bestätigen, Goodies ausgeben.',
		descriptionEn: 'Central desk: check-in, approve requests, hand out goodies.',
		permissions: [
			'dashboard.view',
			'assignment.manage',
			'attendance.confirm',
			'qualification.review',
			'helper.contact.view',
			'goodie.issue'
		]
	},
	{
		nameDe: 'Goodie-Ausgabe',
		nameEn: 'Goodie desk',
		descriptionDe: 'Gibt Goodies aus.',
		descriptionEn: 'Hands out goodies.',
		permissions: ['goodie.issue']
	}
];
