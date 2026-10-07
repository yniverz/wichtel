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
import { heldQualificationIds } from './qualifications.ts';
import { notifyAssignment } from '../notifications.ts';
import { getSettings } from './settings.ts';

const ACTIVE = ['requested', 'booked'] as const;
const MINUTE = 60_000;

export interface BookingContext {
	db: DB;
	now: Date;
}

/** Rule violations a lead may knowingly override (with `assignment.override`). */
export type OverridableIssue = 'overlap' | 'full' | 'started' | 'qualification';

async function lacksQualifications(tx: Tx, userId: string, required: string[], now: Date) {
	if (required.length === 0) return false;
	const held = new Set(await heldQualificationIds(tx, userId, now));
	return required.some((id) => !held.has(id));
}

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
				inArray(assignments.status, [...ACTIVE, 'waitlisted'])
			)
		);
	return Boolean(row);
}

/** Serialises bookings per person so two parallel requests cannot create an overlap. */
async function lockUser(tx: Tx, userId: string) {
	await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');
}

export interface BookingOptions {
	editionId: string;
	/** Whether the shift is visible to this person (internal shifts). */
	canSee: (shift: Shift) => boolean;
	/** Whether booking is open for this person and shift (waves); omitted = open. */
	isOpen?: (shift: Shift) => boolean;
}

/**
 * A helper books a place (or requests one, depending on the position's booking mode).
 * `canSee` decides whether the shift is visible to this person (internal shifts).
 */
export async function bookPosition(
	ctx: BookingContext,
	userId: string,
	positionId: string,
	opts: BookingOptions
): Promise<Assignment> {
	const settings = await getSettings(ctx.db);
	return ctx.db.transaction(async (tx) => {
		await lockUser(tx, userId);
		const { position, shift } = await lockPosition(tx, positionId);
		if (shift.editionId !== opts.editionId || !opts.canSee(shift))
			throw new DomainError('notFound');
		if (opts.isOpen && !opts.isOpen(shift)) throw new DomainError('bookingClosed');
		if (shift.startsAt.getTime() <= ctx.now.getTime()) throw new DomainError('shiftStarted');
		if (await hasActiveInShift(tx, userId, shift.id)) throw new DomainError('alreadyBooked');

		const { booked } = await countActive(tx, position.id);
		if (freeSpots(position.capacity, booked) === 0) throw new DomainError('positionFull');
		if (await lacksQualifications(tx, userId, position.requiredQualificationIds, ctx.now)) {
			throw new DomainError('qualificationMissing');
		}

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
		await notifyAssignment(
			tx,
			assignment.status === 'requested' ? 'booking_requested' : 'booking_confirmed',
			assignment.id
		);
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
		const status = row?.assignment.status;
		if (!row || (status !== 'booked' && status !== 'requested' && status !== 'waitlisted')) {
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
		if (status === 'booked')
			await promoteWaitlist(tx, { userId }, row.assignment.positionId, ctx.now);
	});
}

/** Joins the waiting list of a full position. */
export async function joinWaitlist(
	ctx: BookingContext,
	userId: string,
	positionId: string,
	opts: BookingOptions
): Promise<Assignment> {
	const settings = await getSettings(ctx.db);
	if (!settings.waitlistEnabled) throw new DomainError('notFound');
	return ctx.db.transaction(async (tx) => {
		await lockUser(tx, userId);
		const { position, shift } = await lockPosition(tx, positionId);
		if (shift.editionId !== opts.editionId || !opts.canSee(shift))
			throw new DomainError('notFound');
		if (opts.isOpen && !opts.isOpen(shift)) throw new DomainError('bookingClosed');
		if (shift.startsAt.getTime() <= ctx.now.getTime()) throw new DomainError('shiftStarted');
		if (await hasActiveInShift(tx, userId, shift.id)) throw new DomainError('alreadyBooked');
		const { booked } = await countActive(tx, position.id);
		if (freeSpots(position.capacity, booked) > 0) throw new DomainError('positionNotFull');
		if (await lacksQualifications(tx, userId, position.requiredQualificationIds, ctx.now)) {
			throw new DomainError('qualificationMissing');
		}
		const [entry] = await tx
			.insert(assignments)
			.values({ positionId, shiftId: shift.id, userId, status: 'waitlisted', createdBy: userId })
			.returning();
		return entry;
	});
}

/**
 * Fills free places of a position from its waiting list, in order. People who meanwhile have an
 * overlapping shift are skipped (and stay on the list). Returns the number of people moved up.
 */
export async function promoteWaitlist(
	tx: Tx,
	actor: Actor,
	positionId: string,
	now: Date
): Promise<number> {
	const settings = await getSettings(tx);
	const { position, shift } = await lockPosition(tx, positionId);
	if (shift.startsAt.getTime() <= now.getTime()) return 0;
	let { booked } = await countActive(tx, position.id);
	const waiting = await tx
		.select()
		.from(assignments)
		.where(and(eq(assignments.positionId, positionId), eq(assignments.status, 'waitlisted')))
		.orderBy(asc(assignments.createdAt));
	let promoted = 0;
	for (const entry of waiting) {
		if (freeSpots(position.capacity, booked) === 0) break;
		await lockUser(tx, entry.userId);
		if ((await findOverlaps(tx, entry.userId, shift, settings.minBreakMinutes)).length > 0)
			continue;
		const status = position.bookingMode === 'request' ? 'requested' : 'booked';
		await tx.update(assignments).set({ status }).where(eq(assignments.id, entry.id));
		await notifyAssignment(
			tx,
			status === 'booked' ? 'waitlist_promoted' : 'booking_requested',
			entry.id
		);
		if (status === 'booked') booked++;
		promoted++;
	}
	if (promoted > 0) {
		await audit(tx, actor, {
			action: 'waitlist.promote',
			entityType: 'shift',
			entityId: shift.id,
			editionId: shift.editionId,
			data: { positionId, promoted }
		});
	}
	return promoted;
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
		if (await lacksQualifications(tx, input.userId, position.requiredQualificationIds, ctx.now)) {
			issues.push('qualification');
		}

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
		await notifyAssignment(tx, 'added_by_lead', assignment.id);
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
		if (assignment.status === 'booked' || assignment.status === 'requested') {
			await notifyAssignment(tx, 'removed_by_lead', assignmentId);
		}
		if (assignment.status === 'booked') {
			await promoteWaitlist(tx, actor, assignment.positionId, ctx.now);
		}
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
		await notifyAssignment(tx, approve ? 'request_approved' : 'request_rejected', assignmentId);
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
		.where(
			and(eq(assignments.shiftId, shiftId), inArray(assignments.status, [...ACTIVE, 'waitlisted']))
		)
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

/** Waiting lists of an edition: position id → user ids in order. */
export async function waitlistQueue(db: Tx, editionId: string): Promise<Map<string, string[]>> {
	const rows = await db
		.select({ positionId: assignments.positionId, userId: assignments.userId })
		.from(assignments)
		.innerJoin(shifts, eq(assignments.shiftId, shifts.id))
		.where(and(eq(shifts.editionId, editionId), eq(assignments.status, 'waitlisted')))
		.orderBy(asc(assignments.createdAt));
	const queue = new Map<string, string[]>();
	for (const r of rows) queue.set(r.positionId, [...(queue.get(r.positionId) ?? []), r.userId]);
	return queue;
}
