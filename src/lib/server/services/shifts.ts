import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import {
	MAX_SERIES_SHIFTS,
	expandSeries,
	type Interval,
	type SeriesInput
} from '#lib/domain/booking.ts';
import type { DB, Tx } from '../db/client.ts';
import {
	areas,
	assignments,
	shiftPositions,
	shifts,
	type Shift,
	type ShiftPosition
} from '../db/schema.ts';
import { audit, diff, type Actor } from '../audit.ts';
import { DomainError } from '../errors.ts';
import { notifyShiftPeople } from '../notifications.ts';

export interface PositionInput {
	/** Existing position id when editing; absent for new positions. */
	id?: string;
	nameDe: string;
	nameEn: string;
	descriptionDe: string;
	descriptionEn: string;
	capacity: number;
	bookingMode: 'open' | 'request';
	pointsPerShift?: number | null;
	pointsPerHour?: number | null;
}

export interface ShiftDetailsInput {
	areaId: string;
	titleDe: string;
	titleEn: string;
	descriptionDe: string;
	descriptionEn: string;
	location: string;
	meetingPoint: string;
	contact: string;
	visibility: 'public' | 'internal';
	cancelDeadlineHours: number | null;
}

export interface ShiftInput extends ShiftDetailsInput, Interval {
	positions: PositionInput[];
}

export interface PositionWithCounts extends ShiftPosition {
	booked: number;
	requested: number;
}

export interface ShiftWithPositions extends Shift {
	positions: PositionWithCounts[];
}

const ACTIVE = ['requested', 'booked'] as const;

async function assertArea(tx: Tx, editionId: string, areaId: string) {
	const [area] = await tx
		.select({ id: areas.id })
		.from(areas)
		.where(and(eq(areas.id, areaId), eq(areas.editionId, editionId)));
	if (!area) throw new DomainError('notFound', 'areaId');
}

function assertInterval({ startsAt, endsAt }: Interval) {
	if (!(startsAt.getTime() < endsAt.getTime())) throw new DomainError('invalidTimeRange', 'end');
}

function assertPositions(positions: PositionInput[]) {
	if (positions.length === 0) throw new DomainError('positionsRequired', 'positions');
}

/** Loads shifts with their positions and booking counts. */
export async function listShifts(
	db: Tx,
	editionId: string,
	opts: { areaIds?: string[]; shiftIds?: string[] } = {}
): Promise<ShiftWithPositions[]> {
	const conditions = [eq(shifts.editionId, editionId)];
	if (opts.areaIds) {
		if (opts.areaIds.length === 0) return [];
		conditions.push(inArray(shifts.areaId, opts.areaIds));
	}
	if (opts.shiftIds) {
		if (opts.shiftIds.length === 0) return [];
		conditions.push(inArray(shifts.id, opts.shiftIds));
	}
	const shiftRows = await db
		.select()
		.from(shifts)
		.where(and(...conditions))
		.orderBy(asc(shifts.startsAt), asc(shifts.titleDe));
	if (shiftRows.length === 0) return [];

	const ids = shiftRows.map((s) => s.id);
	const [positionRows, counts] = await Promise.all([
		db
			.select()
			.from(shiftPositions)
			.where(inArray(shiftPositions.shiftId, ids))
			.orderBy(asc(shiftPositions.sortOrder)),
		db
			.select({
				positionId: assignments.positionId,
				status: assignments.status,
				count: sql<number>`count(*)::int`
			})
			.from(assignments)
			.where(and(inArray(assignments.shiftId, ids), inArray(assignments.status, [...ACTIVE])))
			.groupBy(assignments.positionId, assignments.status)
	]);

	const countMap = new Map<string, { booked: number; requested: number }>();
	for (const c of counts) {
		const entry = countMap.get(c.positionId) ?? { booked: 0, requested: 0 };
		entry[c.status as 'booked' | 'requested'] = c.count;
		countMap.set(c.positionId, entry);
	}
	const byShift = new Map<string, PositionWithCounts[]>();
	for (const p of positionRows) {
		const list = byShift.get(p.shiftId) ?? [];
		list.push({ ...p, ...(countMap.get(p.id) ?? { booked: 0, requested: 0 }) });
		byShift.set(p.shiftId, list);
	}
	return shiftRows.map((s) => ({ ...s, positions: byShift.get(s.id) ?? [] }));
}

export async function getShift(db: Tx, id: string): Promise<ShiftWithPositions | undefined> {
	const [row] = await db
		.select({ editionId: shifts.editionId })
		.from(shifts)
		.where(eq(shifts.id, id));
	if (!row) return undefined;
	const [shift] = await listShifts(db, row.editionId, { shiftIds: [id] });
	return shift;
}

function positionValues(p: PositionInput, index: number) {
	return {
		nameDe: p.nameDe,
		nameEn: p.nameEn,
		descriptionDe: p.descriptionDe,
		descriptionEn: p.descriptionEn,
		capacity: p.capacity,
		bookingMode: p.bookingMode,
		sortOrder: index,
		pointsPerShift: p.pointsPerShift ?? null,
		pointsPerHour: p.pointsPerHour ?? null
	};
}

export async function createShift(
	db: DB,
	actor: Actor,
	editionId: string,
	input: ShiftInput
): Promise<Shift> {
	assertInterval(input);
	assertPositions(input.positions);
	return db.transaction(async (tx) => {
		await assertArea(tx, editionId, input.areaId);
		const { positions, ...details } = input;
		const [shift] = await tx
			.insert(shifts)
			.values({ ...details, editionId })
			.returning();
		await tx
			.insert(shiftPositions)
			.values(positions.map((p, i) => ({ ...positionValues(p, i), shiftId: shift.id })));
		await audit(tx, actor, {
			action: 'shift.create',
			entityType: 'shift',
			entityId: shift.id,
			editionId,
			data: { after: { titleDe: input.titleDe, startsAt: input.startsAt, endsAt: input.endsAt } }
		});
		return shift;
	});
}

/**
 * Creates one shift per interval of the series, all with the same details and positions.
 * Returns the number of created shifts.
 */
export async function createSeries(
	db: DB,
	actor: Actor,
	editionId: string,
	details: ShiftDetailsInput,
	positions: PositionInput[],
	series: SeriesInput
): Promise<number> {
	assertPositions(positions);
	const intervals = expandSeries(series);
	if (intervals.length === 0) throw new DomainError('seriesEmpty');
	if (intervals.length > MAX_SERIES_SHIFTS) throw new DomainError('seriesTooLarge');
	return db.transaction(async (tx) => {
		await assertArea(tx, editionId, details.areaId);
		const seriesId = crypto.randomUUID();
		const created = await tx
			.insert(shifts)
			.values(intervals.map((iv) => ({ ...details, ...iv, editionId, seriesId })))
			.returning({ id: shifts.id });
		await tx
			.insert(shiftPositions)
			.values(
				created.flatMap((s) =>
					positions.map((p, i) => ({ ...positionValues(p, i), shiftId: s.id }))
				)
			);
		await audit(tx, actor, {
			action: 'shift.series_create',
			entityType: 'shift_series',
			entityId: seriesId,
			editionId,
			data: { titleDe: details.titleDe, count: created.length, from: series.from, to: series.to }
		});
		return created.length;
	});
}

export async function updateShift(
	db: DB,
	actor: Actor,
	id: string,
	input: ShiftInput
): Promise<void> {
	assertInterval(input);
	assertPositions(input.positions);
	await db.transaction(async (tx) => {
		const before = await getShift(tx, id);
		if (!before) throw new DomainError('notFound');
		await assertArea(tx, before.editionId, input.areaId);

		const { positions, ...details } = input;
		await tx.update(shifts).set(details).where(eq(shifts.id, id));

		const existing = new Map(before.positions.map((p) => [p.id, p]));
		const keep = new Set(positions.filter((p) => p.id && existing.has(p.id)).map((p) => p.id!));

		// Positions removed from the form must not have active bookings.
		for (const p of before.positions) {
			if (keep.has(p.id)) continue;
			if (p.booked + p.requested > 0) throw new DomainError('positionHasBookings', 'positions');
			await tx.delete(shiftPositions).where(eq(shiftPositions.id, p.id));
		}

		for (const [index, p] of positions.entries()) {
			const current = p.id ? existing.get(p.id) : undefined;
			if (current) {
				if (p.capacity < current.booked) throw new DomainError('capacityBelowBooked', 'positions');
				await tx
					.update(shiftPositions)
					.set(positionValues(p, index))
					.where(eq(shiftPositions.id, current.id));
			} else {
				await tx.insert(shiftPositions).values({ ...positionValues(p, index), shiftId: id });
			}
		}

		const changes = diff(before as unknown as Record<string, unknown>, details);

		// People who are on the shift hear about changes that affect them.
		const relevant =
			before.startsAt.getTime() !== input.startsAt.getTime() ||
			before.endsAt.getTime() !== input.endsAt.getTime() ||
			before.location !== input.location ||
			before.meetingPoint !== input.meetingPoint;
		if (relevant) {
			const people = await tx
				.select({ userId: assignments.userId })
				.from(assignments)
				.where(and(eq(assignments.shiftId, id), inArray(assignments.status, [...ACTIVE])));
			await notifyShiftPeople(
				tx,
				'shift_changed',
				{ ...before, ...details, startsAt: input.startsAt, endsAt: input.endsAt },
				people.map((p) => p.userId)
			);
		}
		await audit(tx, actor, {
			action: 'shift.update',
			entityType: 'shift',
			entityId: id,
			editionId: before.editionId,
			data: {
				...(changes ?? {}),
				positions: positions.map((p) => ({
					name: p.nameDe,
					capacity: p.capacity,
					mode: p.bookingMode
				}))
			}
		});
	});
}

/** Deletes a shift including all bookings. Returns the user ids of people who were booked. */
export async function deleteShift(db: DB, actor: Actor, id: string): Promise<string[]> {
	return db.transaction(async (tx) => {
		const [shift] = await tx.select().from(shifts).where(eq(shifts.id, id));
		if (!shift) throw new DomainError('notFound');
		const affected = await tx
			.select({ userId: assignments.userId })
			.from(assignments)
			.where(and(eq(assignments.shiftId, id), inArray(assignments.status, [...ACTIVE])));
		await notifyShiftPeople(
			tx,
			'shift_cancelled',
			shift,
			affected.map((a) => a.userId)
		);
		await tx.delete(shifts).where(eq(shifts.id, id));
		await audit(tx, actor, {
			action: 'shift.delete',
			entityType: 'shift',
			entityId: id,
			editionId: shift.editionId,
			data: {
				before: { titleDe: shift.titleDe, startsAt: shift.startsAt, endsAt: shift.endsAt },
				affectedBookings: affected.length
			}
		});
		return affected.map((a) => a.userId);
	});
}
