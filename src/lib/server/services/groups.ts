import { randomBytes } from 'node:crypto';
import { and, asc, count, eq, inArray } from 'drizzle-orm';
import { freeSpots } from '#lib/domain/booking.ts';
import { holdEnd, inviteCodeFrom, normaliseCode } from '#lib/domain/collaboration.ts';
import { formatDateTime } from '#lib/i18n/index.ts';
import type { DB, Tx } from '../db/client.ts';
import {
	assignments,
	buddyGroups,
	buddyMembers,
	shifts,
	users,
	type BuddyGroup,
	type User
} from '../db/schema.ts';
import { audit } from '../audit.ts';
import { DomainError } from '../errors.ts';
import { appUrl, notifyAssignment, placesOf, sendTemplate, shiftParams } from '../notifications.ts';
import {
	countActive,
	findOverlaps,
	hasActiveInShift,
	lacksQualifications,
	lockPosition,
	lockUser,
	type BookingContext,
	type BookingOptions
} from './assignments.ts';
import { loadAuthz } from './roles.ts';
import { getSettings } from './settings.ts';
import { bookingAccess } from './waves.ts';

export interface GroupView {
	id: string;
	editionId: string;
	name: string;
	inviteCode: string;
	members: { userId: string; firstName: string; lastName: string }[];
}

function newCode() {
	return inviteCodeFrom(randomBytes(8));
}

async function membershipOf(db: Tx, userId: string, editionId: string) {
	const [row] = await db
		.select({ group: buddyGroups })
		.from(buddyMembers)
		.innerJoin(buddyGroups, eq(buddyMembers.groupId, buddyGroups.id))
		.where(and(eq(buddyMembers.userId, userId), eq(buddyMembers.editionId, editionId)));
	return row?.group;
}

/** The person's group in this edition with its members, or null. */
export async function getGroup(
	db: Tx,
	userId: string,
	editionId: string
): Promise<GroupView | null> {
	const group = await membershipOf(db, userId, editionId);
	if (!group) return null;
	const members = await db
		.select({ userId: users.id, firstName: users.firstName, lastName: users.lastName })
		.from(buddyMembers)
		.innerJoin(users, eq(buddyMembers.userId, users.id))
		.where(eq(buddyMembers.groupId, group.id))
		.orderBy(asc(buddyMembers.joinedAt));
	return {
		id: group.id,
		editionId: group.editionId,
		name: group.name,
		inviteCode: group.inviteCode,
		members
	};
}

async function requireEnabled(db: Tx) {
	const settings = await getSettings(db);
	if (!settings.buddyGroupsEnabled) throw new DomainError('notFound');
	return settings;
}

export async function createGroup(
	db: DB,
	userId: string,
	editionId: string,
	name: string
): Promise<BuddyGroup> {
	await requireEnabled(db);
	return db.transaction(async (tx) => {
		await lockUser(tx, userId);
		if (await membershipOf(tx, userId, editionId)) throw new DomainError('groupAlreadyMember');
		const [group] = await tx
			.insert(buddyGroups)
			.values({ editionId, name, inviteCode: newCode(), createdBy: userId })
			.returning();
		await tx.insert(buddyMembers).values({ groupId: group.id, editionId, userId });
		await audit(
			tx,
			{ userId },
			{
				action: 'group.create',
				entityType: 'group',
				entityId: group.id,
				editionId
			}
		);
		return group;
	});
}

export async function joinGroup(
	db: DB,
	userId: string,
	editionId: string,
	code: string
): Promise<BuddyGroup> {
	const settings = await requireEnabled(db);
	return db.transaction(async (tx) => {
		await lockUser(tx, userId);
		const [group] = await tx
			.select()
			.from(buddyGroups)
			.where(
				and(eq(buddyGroups.inviteCode, normaliseCode(code)), eq(buddyGroups.editionId, editionId))
			)
			.for('update');
		if (!group) throw new DomainError('groupUnknownCode', 'code');
		const current = await membershipOf(tx, userId, editionId);
		if (current?.id === group.id) return group;
		if (current) throw new DomainError('groupAlreadyMember', 'code');
		const [{ size }] = await tx
			.select({ size: count() })
			.from(buddyMembers)
			.where(eq(buddyMembers.groupId, group.id));
		if (size >= settings.buddyGroupMaxSize) throw new DomainError('groupFull', 'code');
		await tx.insert(buddyMembers).values({ groupId: group.id, editionId, userId });
		await audit(
			tx,
			{ userId },
			{
				action: 'group.join',
				entityType: 'group',
				entityId: group.id,
				editionId
			}
		);
		return group;
	});
}

/** Leaves the group; the last one to leave dissolves it. */
export async function leaveGroup(db: DB, userId: string, editionId: string): Promise<void> {
	await db.transaction(async (tx) => {
		const group = await membershipOf(tx, userId, editionId);
		if (!group) return;
		await tx
			.delete(buddyMembers)
			.where(and(eq(buddyMembers.groupId, group.id), eq(buddyMembers.userId, userId)));
		const [{ size }] = await tx
			.select({ size: count() })
			.from(buddyMembers)
			.where(eq(buddyMembers.groupId, group.id));
		if (size === 0) await tx.delete(buddyGroups).where(eq(buddyGroups.id, group.id));
		await audit(
			tx,
			{ userId },
			{
				action: 'group.leave',
				entityType: 'group',
				entityId: group.id,
				editionId
			}
		);
	});
}

/** A fresh invite code; the old link stops working. */
export async function rotateGroupCode(db: DB, userId: string, editionId: string): Promise<void> {
	const group = await membershipOf(db, userId, editionId);
	if (!group) throw new DomainError('notFound');
	await db.update(buddyGroups).set({ inviteCode: newCode() }).where(eq(buddyGroups.id, group.id));
}

/** Active bookings of the other group members: shift id → first names. */
export async function buddiesByShift(
	db: Tx,
	group: GroupView | null,
	userId: string
): Promise<Map<string, string[]>> {
	const others = group?.members.filter((m) => m.userId !== userId) ?? [];
	const result = new Map<string, string[]>();
	if (others.length === 0) return result;
	const rows = await db
		.select({ shiftId: assignments.shiftId, userId: assignments.userId })
		.from(assignments)
		.where(
			and(
				inArray(
					assignments.userId,
					others.map((m) => m.userId)
				),
				inArray(assignments.status, ['booked', 'held', 'requested'])
			)
		);
	const names = new Map(others.map((m) => [m.userId, m.firstName]));
	for (const r of rows)
		result.set(r.shiftId, [...(result.get(r.shiftId) ?? []), names.get(r.userId)!]);
	return result;
}

export type GroupProblem =
	'notVisible' | 'bookingClosed' | 'alreadyBooked' | 'qualificationMissing' | 'overlap';

export type GroupBookingResult =
	| { ok: true; reserved: number }
	| { ok: false; problems: { name: string; problem: GroupProblem }[] };

/**
 * Books a place for the initiator (unless they are already on the shift) and reserves places for
 * the chosen group members, who then accept or decline. All-or-nothing: if anyone cannot take a
 * place, nothing is booked and the problems are returned.
 */
export async function bookForGroup(
	ctx: BookingContext,
	initiator: Pick<User, 'id' | 'isAdmin' | 'firstName'>,
	positionId: string,
	memberIds: string[],
	opts: BookingOptions
): Promise<GroupBookingResult> {
	const settings = await requireEnabled(ctx.db);
	return ctx.db.transaction(async (tx) => {
		const group = await getGroup(tx, initiator.id, opts.editionId);
		const chosen = (group?.members ?? []).filter(
			(m) => m.userId !== initiator.id && memberIds.includes(m.userId)
		);
		if (!group || chosen.length === 0) throw new DomainError('groupNoMembers');
		for (const id of [initiator.id, ...chosen.map((m) => m.userId)].sort()) await lockUser(tx, id);

		const { position, shift } = await lockPosition(tx, positionId);
		if (shift.editionId !== opts.editionId || !opts.canSee(shift))
			throw new DomainError('notFound');
		if (position.bookingMode === 'request') throw new DomainError('groupRequestMode');
		if (shift.startsAt.getTime() <= ctx.now.getTime()) throw new DomainError('shiftStarted');
		const urgent = position.urgentAt !== null;
		if (!urgent && opts.isOpen && !opts.isOpen(shift)) throw new DomainError('bookingClosed');

		const problems: { name: string; problem: GroupProblem }[] = [];
		const check = async (userId: string, name: string, canSee: boolean, open: boolean) => {
			if (!canSee) return problems.push({ name, problem: 'notVisible' });
			if (!open) return problems.push({ name, problem: 'bookingClosed' });
			if (await hasActiveInShift(tx, userId, shift.id))
				return problems.push({ name, problem: 'alreadyBooked' });
			if (await lacksQualifications(tx, userId, position.requiredQualificationIds, ctx.now))
				return problems.push({ name, problem: 'qualificationMissing' });
			if ((await findOverlaps(tx, userId, shift, settings.minBreakMinutes)).length)
				return problems.push({ name, problem: 'overlap' });
		};

		const selfBooked = await hasActiveInShift(tx, initiator.id, shift.id);
		if (!selfBooked) await check(initiator.id, initiator.firstName, true, true);
		for (const member of chosen) {
			const [user] = await tx.select().from(users).where(eq(users.id, member.userId));
			const authz = await loadAuthz(tx, user, opts.editionId);
			const access = await bookingAccess(tx, user, opts.editionId, ctx.now);
			await check(
				member.userId,
				member.firstName,
				shift.visibility === 'public' || authz.hasRoleCovering(shift.areaId),
				urgent || access(shift.areaId).open
			);
		}
		if (problems.length > 0) return { ok: false, problems };

		const needed = chosen.length + (selfBooked ? 0 : 1);
		const { booked } = await countActive(tx, position.id);
		if (freeSpots(position.capacity, booked) < needed)
			throw new DomainError('groupNotEnoughPlaces');

		if (!selfBooked) {
			const [own] = await tx
				.insert(assignments)
				.values({
					positionId,
					shiftId: shift.id,
					userId: initiator.id,
					status: 'booked',
					bonusPoints: urgent ? position.urgentBonus : 0,
					createdBy: initiator.id
				})
				.returning();
			await notifyAssignment(tx, 'booking_confirmed', own.id);
		}
		const until = holdEnd(ctx.now, shift.startsAt, settings.groupHoldHours);
		const shiftPlaces = await placesOf(tx, shift);
		for (const member of chosen) {
			await tx.insert(assignments).values({
				positionId,
				shiftId: shift.id,
				userId: member.userId,
				status: 'held',
				holdUntil: until,
				bonusPoints: urgent ? position.urgentBonus : 0,
				createdBy: initiator.id
			});
			const [user] = await tx.select().from(users).where(eq(users.id, member.userId));
			await sendTemplate(tx, 'group_hold', user, {
				...shiftParams(shift, user.locale, settings.timezone, shiftPlaces),
				person: initiator.firstName,
				until: formatDateTime(until, user.locale, settings.timezone),
				link: appUrl('/app')
			});
		}
		await audit(
			tx,
			{ userId: initiator.id },
			{
				action: 'group.book',
				entityType: 'shift',
				entityId: shift.id,
				editionId: shift.editionId,
				data: { positionId, members: chosen.map((m) => m.userId) }
			}
		);
		return { ok: true, reserved: chosen.length };
	});
}

/** Shifts of the group members that have not ended, for the group page. */
export async function groupSchedule(db: Tx, group: GroupView, now: Date) {
	const ids = group.members.map((m) => m.userId);
	return db
		.select({
			userId: assignments.userId,
			status: assignments.status,
			shiftId: shifts.id,
			titleDe: shifts.titleDe,
			titleEn: shifts.titleEn,
			startsAt: shifts.startsAt,
			endsAt: shifts.endsAt
		})
		.from(assignments)
		.innerJoin(shifts, eq(assignments.shiftId, shifts.id))
		.where(
			and(
				eq(shifts.editionId, group.editionId),
				inArray(assignments.userId, ids),
				inArray(assignments.status, ['booked', 'held', 'requested'])
			)
		)
		.orderBy(asc(shifts.startsAt))
		.then((rows) => rows.filter((r) => r.endsAt.getTime() > now.getTime()));
}
