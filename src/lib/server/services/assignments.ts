import { and, asc, eq, gt, inArray, lt, ne, sql } from 'drizzle-orm';
import {
	canSelfCancel,
	checkInOpen,
	effectiveCancelHours,
	freeSpots
} from '#lib/domain/booking.ts';
import type { Authz } from '#lib/domain/permissions.ts';
import type { DB, Tx } from '../db/client.ts';
import {
	assignments,
	shiftPositions,
	shifts,
	users,
	type Assignment,
	type Shift
} from '../db/schema.ts';
import { audit, type Actor } from '../audit.ts';
import { DomainError } from '../errors.ts';
import { loadAreaTree } from './areas.ts';
import { applyMandatoryGoodies } from './goodies.ts';
import { syncAssignmentPoints } from './points.ts';
import { getSettings } from './settings.ts';

const ACTIVE = ['requested', 'booked'] as const;
const MINUTE = 60_000;

export interface BookingContext {
	db: DB;
	now: Date;
}

/** Rule violations a lead may knowingly override (with `assignment.override`). */
export type OverridableIssue = 'overlap' | 'full' | 'started';

async function lockPosition(tx: Tx, positionId: string) {
	const [row] = await tx
		.select({ position: shiftPositions, shift: shifts })
		.from(shiftPositions)
		.innerJoin(shifts, eq(shiftPositions.shiftId, shifts.id))
		.where(eq(shiftPositions.id, positionId))
		.for('update', { of: shiftPositions });
	if (!row) throw new DomainError('notFound');
	return row;
}

async function countActive(tx: Tx, positionId: string) {
	const rows = await tx
		.select({ status: assignments.status, count: sql<number>`count(*)::int` })
		.from(assignments)
		.where(and(eq(assignments.positionId, positionId), inArray(assignments.status, [...ACTIVE])))
		.groupBy(assignments.status);
	const get = (s: string) => rows.find((r) => r.status === s)?.count ?? 0;
	return { booked: get('booked'), requested: get('requested') };
}

/** Active assignments of the user that collide with the shift (including the required break). */
async function findOverlaps(tx: Tx, userId: string, shift: Shift, breakMinutes: number) {
	const gap = breakMinutes * MINUTE;
	return tx
		.select({ id: assignments.id, titleDe: shifts.titleDe, startsAt: shifts.startsAt })
		.from(assignments)
		.innerJoin(shifts, eq(assignments.shiftId, shifts.id))
		.where(
			and(
				eq(assignments.userId, userId),
				inArray(assignments.status, [...ACTIVE]),
				ne(assignments.shiftId, shift.id),
				lt(shifts.startsAt, new Date(shift.endsAt.getTime() + gap)),
				gt(shifts.endsAt, new Date(shift.startsAt.getTime() - gap))
			)
		);
}

async function hasActiveInShift(tx: Tx, userId: string, shiftId: string) {
	const [row] = await tx
		.select({ id: assignments.id })
		.from(assignments)
		.where(
			and(
				eq(assignments.userId, userId),
				eq(assignments.shiftId, shiftId),
				inArray(assignments.status, [...ACTIVE])
			)
		);
	return Boolean(row);
}

/** Serialises bookings per person so two parallel requests cannot create an overlap. */
async function lockUser(tx: Tx, userId: string) {
	await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');
}

/**
 * A helper books a place (or requests one, depending on the position's booking mode).
 * `canSee` decides whether the shift is visible to this person (internal shifts).
 */
export async function bookPosition(
	ctx: BookingContext,
	userId: string,
	positionId: string,
	opts: { editionId: string; canSee: (shift: Shift) => boolean }
): Promise<Assignment> {
	const settings = await getSettings(ctx.db);
	return ctx.db.transaction(async (tx) => {
		await lockUser(tx, userId);
		const { position, shift } = await lockPosition(tx, positionId);
		if (shift.editionId !== opts.editionId || !opts.canSee(shift))
			throw new DomainError('notFound');
		if (shift.startsAt.getTime() <= ctx.now.getTime()) throw new DomainError('shiftStarted');
		if (await hasActiveInShift(tx, userId, shift.id)) throw new DomainError('alreadyBooked');

		const { booked } = await countActive(tx, position.id);
		if (freeSpots(position.capacity, booked) === 0) throw new DomainError('positionFull');

		const overlaps = await findOverlaps(tx, userId, shift, settings.minBreakMinutes);
		if (overlaps.length > 0) throw new DomainError('overlap');

		const [assignment] = await tx
			.insert(assignments)
			.values({
				positionId,
				shiftId: shift.id,
				userId,
				status: position.bookingMode === 'request' ? 'requested' : 'booked',
				createdBy: userId
			})
			.returning();
		return assignment;
	});
}

async function cancelHoursFor(tx: Tx, shift: Shift, instanceHours: number) {
	const tree = await loadAreaTree(tx, shift.editionId);
	const lineage = tree.lineage(shift.areaId).map((id) => tree.get(id)?.cancelDeadlineHours ?? null);
	return effectiveCancelHours(shift.cancelDeadlineHours, lineage, instanceHours);
}

/** A helper withdraws their own request or cancels a booking before the deadline. */
export async function cancelOwnAssignment(
	ctx: BookingContext,
	userId: string,
	assignmentId: string
): Promise<void> {
	const settings = await getSettings(ctx.db);
	await ctx.db.transaction(async (tx) => {
		const [row] = await tx
			.select({ assignment: assignments, shift: shifts })
			.from(assignments)
			.innerJoin(shifts, eq(assignments.shiftId, shifts.id))
			.where(and(eq(assignments.id, assignmentId), eq(assignments.userId, userId)));
		if (!row || !ACTIVE.includes(row.assignment.status as (typeof ACTIVE)[number])) {
			throw new DomainError('notFound');
		}
		if (row.shift.startsAt.getTime() <= ctx.now.getTime()) throw new DomainError('shiftStarted');
		if (row.assignment.status === 'booked') {
			const hours = await cancelHoursFor(tx, row.shift, settings.cancelDeadlineHours);
			if (!canSelfCancel(ctx.now, row.shift.startsAt, hours))
				throw new DomainError('cancelDeadlinePassed');
		}
		await tx
			.update(assignments)
			.set({ status: 'cancelled' })
			.where(eq(assignments.id, assignmentId));
	});
}

// ---------------------------------------------------------------------------
// Lead actions
// ---------------------------------------------------------------------------

async function loadAssignmentForLead(tx: Tx, assignmentId: string) {
	const [row] = await tx
		.select({ assignment: assignments, shift: shifts })
		.from(assignments)
		.innerJoin(shifts, eq(assignments.shiftId, shifts.id))
		.where(eq(assignments.id, assignmentId));
	if (!row) throw new DomainError('notFound');
	return row;
}

function requireLead(
	authz: Authz,
	permission: 'assignment.manage' | 'attendance.confirm',
	shift: Shift
) {
	if (!authz.can(permission, shift.areaId)) throw new DomainError('forbidden');
}

/**
 * A lead puts a person on a position. Rule violations are reported as `issues`; they only pass
 * with `override` and the `assignment.override` permission.
 */
export async function leadAssign(
	ctx: BookingContext,
	actor: Actor,
	authz: Authz,
	input: { positionId: string; userId: string; override: boolean }
): Promise<{ issues: OverridableIssue[]; assignment?: Assignment }> {
	const settings = await getSettings(ctx.db);
	return ctx.db.transaction(async (tx) => {
		await lockUser(tx, input.userId);
		const { position, shift } = await lockPosition(tx, input.positionId);
		requireLead(authz, 'assignment.manage', shift);
		const [user] = await tx.select({ id: users.id }).from(users).where(eq(users.id, input.userId));
		if (!user) throw new DomainError('notFound');
		if (await hasActiveInShift(tx, input.userId, shift.id)) throw new DomainError('alreadyBooked');

		const issues: OverridableIssue[] = [];
		const { booked } = await countActive(tx, position.id);
		if (freeSpots(position.capacity, booked) === 0) issues.push('full');
		if ((await findOverlaps(tx, input.userId, shift, settings.minBreakMinutes)).length)
			issues.push('overlap');
		if (shift.startsAt.getTime() <= ctx.now.getTime()) issues.push('started');

		if (issues.length > 0) {
			if (!input.override) return { issues };
			if (!authz.can('assignment.override', shift.areaId)) throw new DomainError('forbidden');
		}

		const [assignment] = await tx
			.insert(assignments)
			.values({
				positionId: position.id,
				shiftId: shift.id,
				userId: input.userId,
				status: 'booked',
				createdBy: actor.userId
			})
			.returning();
		await audit(tx, actor, {
			action: 'assignment.lead_add',
			entityType: 'shift',
			entityId: shift.id,
			editionId: shift.editionId,
			data: { userId: input.userId, positionId: position.id, overridden: issues }
		});
		return { issues, assignment };
	});
}

export async function leadRemove(
	ctx: BookingContext,
	actor: Actor,
	authz: Authz,
	assignmentId: string
): Promise<void> {
	await ctx.db.transaction(async (tx) => {
		const { assignment, shift } = await loadAssignmentForLead(tx, assignmentId);
		requireLead(authz, 'assignment.manage', shift);
		const [updated] = await tx
			.update(assignments)
			.set({ status: 'cancelled' })
			.where(eq(assignments.id, assignmentId))
			.returning();
		await syncAssignmentPoints(tx, actor, updated);
		await audit(tx, actor, {
			action: 'assignment.lead_remove',
			entityType: 'shift',
			entityId: shift.id,
			editionId: shift.editionId,
			data: { userId: assignment.userId, previousStatus: assignment.status }
		});
	});
}

export async function decideRequest(
	ctx: BookingContext,
	actor: Actor,
	authz: Authz,
	assignmentId: string,
	approve: boolean
): Promise<void> {
	await ctx.db.transaction(async (tx) => {
		const { assignment, shift } = await loadAssignmentForLead(tx, assignmentId);
		requireLead(authz, 'assignment.manage', shift);
		if (assignment.status !== 'requested') throw new DomainError('notFound');
		if (approve) {
			const { position } = await lockPosition(tx, assignment.positionId);
			const { booked } = await countActive(tx, position.id);
			if (freeSpots(position.capacity, booked) === 0) throw new DomainError('positionFull');
		}
		await tx
			.update(assignments)
			.set({ status: approve ? 'booked' : 'rejected' })
			.where(eq(assignments.id, assignmentId));
		await audit(tx, actor, {
			action: approve ? 'assignment.approve' : 'assignment.reject',
			entityType: 'shift',
			entityId: shift.id,
			editionId: shift.editionId,
			data: { userId: assignment.userId }
		});
	});
}

/** Marks attendance. Possible from the start of the shift's day; corrections are always possible. */
export async function setAttendance(
	ctx: BookingContext,
	actor: Actor,
	authz: Authz,
	assignmentId: string,
	attendance: 'attended' | 'no_show' | 'unknown',
	timeZone: string
): Promise<void> {
	await ctx.db.transaction(async (tx) => {
		const { assignment, shift } = await loadAssignmentForLead(tx, assignmentId);
		requireLead(authz, 'attendance.confirm', shift);
		if (assignment.status !== 'booked') throw new DomainError('notFound');
		if (!checkInOpen(ctx.now, shift.startsAt, timeZone)) throw new DomainError('checkInTooEarly');
		const [updated] = await tx
			.update(assignments)
			.set({
				attendance,
				attendanceAt: attendance === 'unknown' ? null : ctx.now,
				attendanceBy: attendance === 'unknown' ? null : actor.userId
			})
			.where(eq(assignments.id, assignmentId))
			.returning();
		// Points follow attendance; mandatory goodies are redeemed as soon as points allow.
		const pointsDiff = await syncAssignmentPoints(tx, actor, updated);
		if (pointsDiff > 0) await applyMandatoryGoodies(tx, actor, updated.userId, shift.editionId);
		await audit(tx, actor, {
			action: 'attendance.set',
			entityType: 'shift',
			entityId: shift.id,
			editionId: shift.editionId,
			data: { userId: assignment.userId, before: assignment.attendance, after: attendance }
		});
	});
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** All of a person's assignments in an edition (any status), with shift and position. */
export async function listUserAssignments(db: Tx, userId: string, editionId: string) {
	return db
		.select({
			id: assignments.id,
			status: assignments.status,
			attendance: assignments.attendance,
			shiftId: shifts.id,
			positionId: shiftPositions.id
		})
		.from(assignments)
		.innerJoin(shifts, eq(assignments.shiftId, shifts.id))
		.innerJoin(shiftPositions, eq(assignments.positionId, shiftPositions.id))
		.where(and(eq(assignments.userId, userId), eq(shifts.editionId, editionId)))
		.orderBy(asc(shifts.startsAt));
}

/** People on a shift, for leads. Contact data is included; callers decide whether to show it. */
export async function shiftRoster(db: Tx, shiftId: string) {
	return db
		.select({
			id: assignments.id,
			positionId: assignments.positionId,
			status: assignments.status,
			attendance: assignments.attendance,
			createdAt: assignments.createdAt,
			userId: users.id,
			firstName: users.firstName,
			lastName: users.lastName,
			email: users.email,
			phone: users.phone
		})
		.from(assignments)
		.innerJoin(users, eq(assignments.userId, users.id))
		.where(and(eq(assignments.shiftId, shiftId), inArray(assignments.status, [...ACTIVE])))
		.orderBy(asc(assignments.createdAt));
}

/** Effective cancel deadline (hours) per shift, for display. */
export async function cancelHoursForShifts(db: Tx, editionId: string, list: Shift[]) {
	const settings = await getSettings(db);
	const tree = await loadAreaTree(db, editionId);
	const result = new Map<string, number>();
	for (const shift of list) {
		const lineage = tree
			.lineage(shift.areaId)
			.map((id) => tree.get(id)?.cancelDeadlineHours ?? null);
		result.set(
			shift.id,
			effectiveCancelHours(shift.cancelDeadlineHours, lineage, settings.cancelDeadlineHours)
		);
	}
	return result;
}
