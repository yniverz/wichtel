import { aliasedTable, and, asc, eq, gt, inArray, or } from 'drizzle-orm';
import { inheritedFlag, swapNeedsApproval } from '#lib/domain/collaboration.ts';
import type { Authz } from '#lib/domain/permissions.ts';
import type { Tx } from '../db/client.ts';
import {
	assignments,
	shiftPositions,
	shifts,
	swapOffers,
	users,
	type Assignment,
	type Shift,
	type ShiftPosition,
	type SwapOffer,
	type User
} from '../db/schema.ts';
import { audit, type Actor } from '../audit.ts';
import { DomainError } from '../errors.ts';
import { appUrl, notifyAssignment, placesOf, sendTemplate, shiftParams } from '../notifications.ts';
import { loadAreaTree } from './areas.ts';
import {
	cancelHoursFor,
	closeOffersFor,
	findOverlaps,
	lacksQualifications,
	lockPosition,
	lockUser,
	type BookingContext
} from './assignments.ts';
import { loadAuthz } from './roles.ts';
import { getSettings } from './settings.ts';

const RUNNING = ['open', 'proposed', 'pending_approval'] as const;

type Booking = { assignment: Assignment; shift: Shift; position: ShiftPosition };

async function loadBooking(tx: Tx, assignmentId: string): Promise<Booking | undefined> {
	const [row] = await tx
		.select({ assignment: assignments, shift: shifts, position: shiftPositions })
		.from(assignments)
		.innerJoin(shifts, eq(assignments.shiftId, shifts.id))
		.innerJoin(shiftPositions, eq(assignments.positionId, shiftPositions.id))
		.where(eq(assignments.id, assignmentId));
	return row;
}

/** A booking that can still be handed over: booked, not started, not checked in. */
function assertTransferable(booking: Booking | undefined, now: Date): asserts booking is Booking {
	if (!booking || booking.assignment.status !== 'booked') throw new DomainError('notFound');
	if (booking.shift.startsAt.getTime() <= now.getTime()) throw new DomainError('shiftStarted');
	if (booking.assignment.attendance !== 'unknown') throw new DomainError('notFound');
}

async function loadOffer(tx: Tx, offerId: string): Promise<SwapOffer> {
	const [offer] = await tx
		.select()
		.from(swapOffers)
		.where(eq(swapOffers.id, offerId))
		.for('update');
	if (!offer) throw new DomainError('notFound');
	return offer;
}

/** Visibility of internal shifts for a person other than the current user. */
async function canSeeFor(tx: Tx, user: Pick<User, 'id' | 'isAdmin'>, editionId: string) {
	const authz = await loadAuthz(tx, user, editionId);
	return (shift: Shift) => shift.visibility === 'public' || authz.hasRoleCovering(shift.areaId);
}

async function userById(tx: Tx, id: string): Promise<User> {
	const [user] = await tx.select().from(users).where(eq(users.id, id));
	if (!user) throw new DomainError('notFound');
	return user;
}

/**
 * Checks that `userId` may take over a place, ignoring the bookings in `giving` (handed over in
 * the same step). Returns waiting-list entries of that person in the shift, which are dropped.
 */
async function assertCanTake(
	tx: Tx,
	userId: string,
	target: Booking,
	giving: string[],
	canSee: ((shift: Shift) => boolean) | null,
	now: Date
): Promise<string[]> {
	if (canSee && !canSee(target.shift)) throw new DomainError('notFound');
	if (target.shift.startsAt.getTime() <= now.getTime()) throw new DomainError('shiftStarted');
	const inShift = await tx
		.select({ id: assignments.id, status: assignments.status })
		.from(assignments)
		.where(
			and(
				eq(assignments.userId, userId),
				eq(assignments.shiftId, target.shift.id),
				inArray(assignments.status, ['booked', 'requested', 'held', 'waitlisted'])
			)
		);
	const others = inShift.filter((a) => !giving.includes(a.id));
	if (others.some((a) => a.status !== 'waitlisted')) throw new DomainError('alreadyBooked');
	if (await lacksQualifications(tx, userId, target.position.requiredQualificationIds, now))
		throw new DomainError('qualificationMissing');
	const settings = await getSettings(tx);
	if ((await findOverlaps(tx, userId, target.shift, settings.minBreakMinutes, giving)).length)
		throw new DomainError('overlap');
	return others.map((a) => a.id);
}

/** Whether handing over this booking needs a lead (request positions, late handovers). */
async function needsApproval(tx: Tx, booking: Booking, now: Date): Promise<boolean> {
	const settings = await getSettings(tx);
	const tree = await loadAreaTree(tx, booking.shift.editionId);
	const flags = tree
		.lineage(booking.shift.areaId)
		.map((id) => tree.get(id)?.swapNeedsApproval ?? null);
	return swapNeedsApproval({
		bookingMode: booking.position.bookingMode,
		now,
		startsAt: booking.shift.startsAt,
		cancelHours: await cancelHoursFor(tx, booking.shift, settings.cancelDeadlineHours),
		approvalAfterDeadline: inheritedFlag(flags, settings.swapNeedsApproval)
	});
}

/** Sends a swap template about `booking` to one person; `person` is the other side's first name. */
async function notifySwap(
	tx: Tx,
	key: 'swap_offered' | 'swap_proposed' | 'swap_pending' | 'swap_completed' | 'swap_declined',
	recipient: User,
	booking: Booking,
	person: string,
	extra: Record<string, string> = {}
) {
	const settings = await getSettings(tx);
	await sendTemplate(tx, key, recipient, {
		...shiftParams(
			booking.shift,
			recipient.locale,
			settings.timezone,
			await placesOf(tx, booking.shift)
		),
		person,
		link: appUrl('/app'),
		...extra
	});
}

// ---------------------------------------------------------------------------
// Helper actions
// ---------------------------------------------------------------------------

/** Offers one's own booking on the shift market, or directly to one person (by e-mail). */
export async function createOffer(
	ctx: BookingContext,
	userId: string,
	input: { assignmentId: string; toEmail: string | null }
): Promise<SwapOffer> {
	const settings = await getSettings(ctx.db);
	if (!settings.swapEnabled) throw new DomainError('notFound');
	return ctx.db.transaction(async (tx) => {
		const booking = await loadBooking(tx, input.assignmentId);
		if (booking?.assignment.userId !== userId) throw new DomainError('notFound');
		assertTransferable(booking, ctx.now);
		const [running] = await tx
			.select({ id: swapOffers.id })
			.from(swapOffers)
			.where(
				and(
					eq(swapOffers.assignmentId, booking.assignment.id),
					inArray(swapOffers.status, [...RUNNING])
				)
			);
		if (running) throw new DomainError('swapAlreadyOffered');

		let to: User | undefined;
		if (input.toEmail) {
			[to] = await tx
				.select()
				.from(users)
				.where(eq(users.email, input.toEmail.trim().toLowerCase()));
			if (!to || !to.emailVerifiedAt) throw new DomainError('swapUnknownPerson', 'email');
			if (to.id === userId) throw new DomainError('swapSelf', 'email');
		}
		const [offer] = await tx
			.insert(swapOffers)
			.values({
				editionId: booking.shift.editionId,
				assignmentId: booking.assignment.id,
				fromUserId: userId,
				toUserId: to?.id ?? null
			})
			.returning();
		const from = await userById(tx, userId);
		if (to) await notifySwap(tx, 'swap_offered', to, booking, from.firstName);
		await audit(
			tx,
			{ userId },
			{
				action: 'swap.offer',
				entityType: 'shift',
				entityId: booking.shift.id,
				editionId: booking.shift.editionId,
				data: { offerId: offer.id, direct: Boolean(to), toUserId: to?.id ?? null }
			}
		);
		return offer;
	});
}

/** The offerer takes their offer back (possible until it is completed). */
export async function withdrawOffer(ctx: BookingContext, userId: string, offerId: string) {
	await ctx.db.transaction(async (tx) => {
		const offer = await loadOffer(tx, offerId);
		if (offer.fromUserId !== userId || !RUNNING.includes(offer.status as never))
			throw new DomainError('notFound');
		await tx.update(swapOffers).set({ status: 'withdrawn' }).where(eq(swapOffers.id, offerId));
		await audit(
			tx,
			{ userId },
			{
				action: 'swap.withdraw',
				entityType: 'swap',
				entityId: offerId,
				editionId: offer.editionId
			}
		);
	});
}

export type TakeResult = 'completed' | 'proposed' | 'pending_approval';

/**
 * Someone takes an offer: from the market, or – for a direct offer – the addressed person, who may
 * give one of their own bookings in return (then the offerer decides).
 */
export async function takeOffer(
	ctx: BookingContext,
	takerId: string,
	offerId: string,
	opts: { canSee: (shift: Shift) => boolean; counterAssignmentId?: string | null }
): Promise<TakeResult> {
	return ctx.db.transaction(async (tx) => {
		const offer = await loadOffer(tx, offerId);
		if (offer.status !== 'open' || offer.fromUserId === takerId) throw new DomainError('notFound');
		if (offer.toUserId && offer.toUserId !== takerId) throw new DomainError('notFound');
		if (!offer.toUserId && opts.counterAssignmentId) throw new DomainError('notFound');
		for (const id of [offer.fromUserId, takerId].sort()) await lockUser(tx, id);

		const given = await loadBooking(tx, offer.assignmentId);
		assertTransferable(given, ctx.now);
		await lockPosition(tx, given.position.id);
		const giver = await userById(tx, offer.fromUserId);
		const taker = await userById(tx, takerId);

		if (opts.counterAssignmentId) {
			const counter = await loadBooking(tx, opts.counterAssignmentId);
			if (counter?.assignment.userId !== takerId) throw new DomainError('notFound');
			assertTransferable(counter, ctx.now);
			await assertCanTake(tx, takerId, given, [counter.assignment.id], opts.canSee, ctx.now);
			await assertCanTake(
				tx,
				giver.id,
				counter,
				[given.assignment.id],
				await canSeeFor(tx, giver, offer.editionId),
				ctx.now
			);
			await tx
				.update(swapOffers)
				.set({ status: 'proposed', takerId, counterAssignmentId: counter.assignment.id })
				.where(eq(swapOffers.id, offer.id));
			await notifySwap(tx, 'swap_proposed', giver, counter, taker.firstName, {
				given: shiftParams(given.shift, giver.locale, (await getSettings(tx)).timezone).shift
			});
			return 'proposed';
		}

		await assertCanTake(tx, takerId, given, [], opts.canSee, ctx.now);
		if (await needsApproval(tx, given, ctx.now)) {
			await tx
				.update(swapOffers)
				.set({ status: 'pending_approval', takerId })
				.where(eq(swapOffers.id, offer.id));
			await notifySwap(tx, 'swap_pending', giver, given, taker.firstName);
			await notifySwap(tx, 'swap_pending', taker, given, giver.firstName);
			return 'pending_approval';
		}
		await execute(tx, { userId: takerId }, { ...offer, takerId }, given, null, ctx.now);
		return 'completed';
	});
}

/** The addressed person turns a direct offer down. */
export async function declineOffer(ctx: BookingContext, userId: string, offerId: string) {
	await ctx.db.transaction(async (tx) => {
		const offer = await loadOffer(tx, offerId);
		if (offer.status !== 'open' || offer.toUserId !== userId) throw new DomainError('notFound');
		await tx
			.update(swapOffers)
			.set({ status: 'declined', decidedBy: userId })
			.where(eq(swapOffers.id, offerId));
		const booking = await loadBooking(tx, offer.assignmentId);
		const decliner = await userById(tx, userId);
		if (booking)
			await notifySwap(
				tx,
				'swap_declined',
				await userById(tx, offer.fromUserId),
				booking,
				decliner.firstName
			);
	});
}

/** The offerer accepts or refuses the shift offered in return. */
export async function answerProposal(
	ctx: BookingContext,
	userId: string,
	offerId: string,
	accept: boolean
): Promise<TakeResult | 'declined'> {
	return ctx.db.transaction(async (tx) => {
		const offer = await loadOffer(tx, offerId);
		if (offer.status !== 'proposed' || offer.fromUserId !== userId || !offer.takerId)
			throw new DomainError('notFound');
		for (const id of [offer.fromUserId, offer.takerId].sort()) await lockUser(tx, id);
		const given = await loadBooking(tx, offer.assignmentId);
		const counter = offer.counterAssignmentId
			? await loadBooking(tx, offer.counterAssignmentId)
			: undefined;
		const giver = await userById(tx, offer.fromUserId);
		const taker = await userById(tx, offer.takerId);

		if (!accept) {
			await tx
				.update(swapOffers)
				.set({ status: 'declined', decidedBy: userId })
				.where(eq(swapOffers.id, offerId));
			if (given) await notifySwap(tx, 'swap_declined', taker, given, giver.firstName);
			return 'declined';
		}
		assertTransferable(given, ctx.now);
		assertTransferable(counter, ctx.now);
		await assertCanTake(
			tx,
			taker.id,
			given,
			[counter.assignment.id],
			await canSeeFor(tx, taker, offer.editionId),
			ctx.now
		);
		await assertCanTake(
			tx,
			giver.id,
			counter,
			[given.assignment.id],
			await canSeeFor(tx, giver, offer.editionId),
			ctx.now
		);
		if ((await needsApproval(tx, given, ctx.now)) || (await needsApproval(tx, counter, ctx.now))) {
			await tx
				.update(swapOffers)
				.set({ status: 'pending_approval' })
				.where(eq(swapOffers.id, offerId));
			await notifySwap(tx, 'swap_pending', giver, given, taker.firstName);
			await notifySwap(tx, 'swap_pending', taker, counter, giver.firstName);
			return 'pending_approval';
		}
		await execute(tx, { userId }, offer, given, counter, ctx.now);
		return 'completed';
	});
}

// ---------------------------------------------------------------------------
// Lead approval
// ---------------------------------------------------------------------------

export async function decideSwap(
	ctx: BookingContext,
	actor: Actor,
	authz: Authz,
	offerId: string,
	approve: boolean
): Promise<void> {
	await ctx.db.transaction(async (tx) => {
		const offer = await loadOffer(tx, offerId);
		if (offer.status !== 'pending_approval' || !offer.takerId) throw new DomainError('notFound');
		const given = await loadBooking(tx, offer.assignmentId);
		const counter = offer.counterAssignmentId
			? ((await loadBooking(tx, offer.counterAssignmentId)) ?? null)
			: null;
		if (!given) throw new DomainError('notFound');
		if (offer.counterAssignmentId && !counter) throw new DomainError('notFound');
		for (const b of [given, counter]) {
			if (b && !authz.can('assignment.manage', b.shift.areaId)) throw new DomainError('forbidden');
		}
		const giver = await userById(tx, offer.fromUserId);
		const taker = await userById(tx, offer.takerId);

		if (!approve) {
			await tx
				.update(swapOffers)
				.set({ status: 'declined', decidedBy: actor.userId })
				.where(eq(swapOffers.id, offerId));
			await notifySwap(tx, 'swap_declined', giver, given, taker.firstName);
			await notifySwap(tx, 'swap_declined', taker, counter ?? given, giver.firstName);
			await audit(tx, actor, {
				action: 'swap.reject',
				entityType: 'shift',
				entityId: given.shift.id,
				editionId: offer.editionId,
				data: { offerId, from: giver.id, to: taker.id }
			});
			return;
		}
		for (const id of [giver.id, taker.id].sort()) await lockUser(tx, id);
		assertTransferable(given, ctx.now);
		if (counter !== null) assertTransferable(counter, ctx.now);
		// Leads decide about visibility themselves; qualifications and overlaps still apply.
		await assertCanTake(tx, taker.id, given, counter ? [counter.assignment.id] : [], null, ctx.now);
		if (counter) await assertCanTake(tx, giver.id, counter, [given.assignment.id], null, ctx.now);
		await tx.update(swapOffers).set({ decidedBy: actor.userId }).where(eq(swapOffers.id, offerId));
		await execute(tx, actor, offer, given, counter, ctx.now);
	});
}

// ---------------------------------------------------------------------------
// Transfer
// ---------------------------------------------------------------------------

/** Moves one booking to another person: the old one is cancelled, a new one is created. */
async function transfer(tx: Tx, booking: Booking, toUserId: string, createdBy: string | null) {
	await tx
		.update(assignments)
		.set({ status: 'cancelled' })
		.where(eq(assignments.id, booking.assignment.id));
	// A waiting-list entry for the same shift is no longer needed.
	await tx
		.update(assignments)
		.set({ status: 'cancelled' })
		.where(
			and(
				eq(assignments.userId, toUserId),
				eq(assignments.shiftId, booking.shift.id),
				eq(assignments.status, 'waitlisted')
			)
		);
	const [created] = await tx
		.insert(assignments)
		.values({
			positionId: booking.position.id,
			shiftId: booking.shift.id,
			userId: toUserId,
			status: 'booked',
			createdBy
		})
		.returning();
	await notifyAssignment(tx, 'booking_confirmed', created.id);
	return created;
}

async function execute(
	tx: Tx,
	actor: Actor,
	offer: SwapOffer,
	given: Booking,
	counter: Booking | null,
	now: Date
) {
	const takerId = offer.takerId!;
	await closeOffersFor(tx, [given.assignment.id, ...(counter ? [counter.assignment.id] : [])]);
	await tx
		.update(swapOffers)
		.set({ status: 'completed', takerId, updatedAt: now })
		.where(eq(swapOffers.id, offer.id));
	await transfer(tx, given, takerId, actor.userId);
	if (counter) await transfer(tx, counter, offer.fromUserId, actor.userId);

	const giver = await userById(tx, offer.fromUserId);
	const taker = await userById(tx, takerId);
	await notifySwap(tx, 'swap_completed', giver, given, taker.firstName);
	if (counter) await notifySwap(tx, 'swap_completed', taker, counter, giver.firstName);
	await audit(tx, actor, {
		action: counter ? 'swap.exchange' : 'swap.handover',
		entityType: 'shift',
		entityId: given.shift.id,
		editionId: offer.editionId,
		data: {
			offerId: offer.id,
			from: giver.id,
			to: taker.id,
			counterShiftId: counter?.shift.id ?? null
		}
	});
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Open market offers of an edition for shifts that have not started: position → offer ids. */
export async function marketOffers(db: Tx, editionId: string, now: Date) {
	return db
		.select({
			id: swapOffers.id,
			fromUserId: swapOffers.fromUserId,
			positionId: assignments.positionId,
			shiftId: assignments.shiftId
		})
		.from(swapOffers)
		.innerJoin(assignments, eq(swapOffers.assignmentId, assignments.id))
		.innerJoin(shifts, eq(assignments.shiftId, shifts.id))
		.where(
			and(
				eq(swapOffers.editionId, editionId),
				eq(swapOffers.status, 'open'),
				eq(assignments.status, 'booked'),
				gt(shifts.startsAt, now)
			)
		)
		.orderBy(asc(swapOffers.createdAt));
}

const fromUser = aliasedTable(users, 'from_user');
const takerUser = aliasedTable(users, 'taker_user');

/** The shifts offered in return (direct swaps), keyed by the counter booking. */
async function counterShifts(db: Tx, assignmentIds: (string | null)[]) {
	const ids = assignmentIds.filter((id): id is string => id !== null);
	if (ids.length === 0) return new Map<string, Shift>();
	const rows = await db
		.select({ assignmentId: assignments.id, shift: shifts })
		.from(assignments)
		.innerJoin(shifts, eq(assignments.shiftId, shifts.id))
		.where(inArray(assignments.id, ids));
	return new Map(rows.map((r) => [r.assignmentId, r.shift]));
}

/** First and last names of some people, by id. */
async function namesOf(db: Tx, ids: (string | null)[]) {
	const unique = [...new Set(ids.filter((id): id is string => id !== null))];
	if (unique.length === 0) return new Map<string, { firstName: string; lastName: string }>();
	const rows = await db
		.select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
		.from(users)
		.where(inArray(users.id, unique));
	return new Map(rows.map((r) => [r.id, { firstName: r.firstName, lastName: r.lastName }]));
}

/** Running offers that involve the person (made by them, addressed to them, or taken by them). */
export async function offersInvolving(db: Tx, userId: string, editionId: string, now: Date) {
	const rows = await db
		.select({ offer: swapOffers, shift: shifts })
		.from(swapOffers)
		.innerJoin(assignments, eq(swapOffers.assignmentId, assignments.id))
		.innerJoin(shifts, eq(assignments.shiftId, shifts.id))
		.where(
			and(
				eq(swapOffers.editionId, editionId),
				inArray(swapOffers.status, [...RUNNING]),
				eq(assignments.status, 'booked'),
				gt(shifts.startsAt, now),
				or(
					eq(swapOffers.fromUserId, userId),
					eq(swapOffers.toUserId, userId),
					eq(swapOffers.takerId, userId)
				)
			)
		)
		.orderBy(asc(shifts.startsAt));
	const [counters, names] = await Promise.all([
		counterShifts(
			db,
			rows.map((r) => r.offer.counterAssignmentId)
		),
		namesOf(
			db,
			rows.flatMap((r) => [r.offer.fromUserId, r.offer.toUserId, r.offer.takerId])
		)
	]);
	return rows.map(({ offer, shift }) => ({
		...offer,
		shift,
		from: names.get(offer.fromUserId) ?? null,
		to: offer.toUserId ? (names.get(offer.toUserId) ?? null) : null,
		taker: offer.takerId ? (names.get(offer.takerId) ?? null) : null,
		counter: offer.counterAssignmentId ? (counters.get(offer.counterAssignmentId) ?? null) : null
	}));
}

/** Swaps waiting for a lead, for the areas `authz` manages. */
export async function pendingSwaps(db: Tx, authz: Authz, editionId: string) {
	const rows = await db
		.select({
			id: swapOffers.id,
			counterAssignmentId: swapOffers.counterAssignmentId,
			createdAt: swapOffers.updatedAt,
			fromName: fromUser.firstName,
			fromLastName: fromUser.lastName,
			fromUserId: fromUser.id,
			takerName: takerUser.firstName,
			takerLastName: takerUser.lastName,
			takerId: takerUser.id,
			shift: {
				id: shifts.id,
				areaId: shifts.areaId,
				titleDe: shifts.titleDe,
				titleEn: shifts.titleEn,
				startsAt: shifts.startsAt,
				endsAt: shifts.endsAt
			},
			positionNameDe: shiftPositions.nameDe,
			positionNameEn: shiftPositions.nameEn
		})
		.from(swapOffers)
		.innerJoin(assignments, eq(swapOffers.assignmentId, assignments.id))
		.innerJoin(shifts, eq(assignments.shiftId, shifts.id))
		.innerJoin(shiftPositions, eq(assignments.positionId, shiftPositions.id))
		.innerJoin(fromUser, eq(swapOffers.fromUserId, fromUser.id))
		.innerJoin(takerUser, eq(swapOffers.takerId, takerUser.id))
		.where(and(eq(swapOffers.editionId, editionId), eq(swapOffers.status, 'pending_approval')))
		.orderBy(asc(shifts.startsAt));
	const counters = await counterShifts(
		db,
		rows.map((r) => r.counterAssignmentId)
	);
	return rows
		.map((r) => ({
			...r,
			counter: r.counterAssignmentId ? (counters.get(r.counterAssignmentId) ?? null) : null
		}))
		.filter(
			(r) =>
				authz.can('assignment.manage', r.shift.areaId) &&
				(!r.counter || authz.can('assignment.manage', r.counter.areaId))
		);
}
