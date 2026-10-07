import { and, desc, eq, sql } from 'drizzle-orm';
import { resolveRule, shiftPoints, type PointsBreakdown } from '#lib/domain/points.ts';
import type { AreaTree } from '#lib/domain/area-tree.ts';
import type { DB, Tx } from '../db/client.ts';
import {
	assignments,
	goodieClaims,
	goodies,
	pointsLedger,
	shiftPositions,
	shifts,
	type Area,
	type Assignment,
	type InstanceSettings,
	type Shift,
	type ShiftPosition
} from '../db/schema.ts';
import { audit, type Actor } from '../audit.ts';
import { DomainError } from '../errors.ts';
import { loadAreaTree } from './areas.ts';
import { getSettings } from './settings.ts';

export async function pointsBalance(db: Tx, userId: string, editionId: string): Promise<number> {
	const [row] = await db
		.select({ total: sql<number>`coalesce(sum(${pointsLedger.amount}), 0)::int` })
		.from(pointsLedger)
		.where(and(eq(pointsLedger.userId, userId), eq(pointsLedger.editionId, editionId)));
	return row?.total ?? 0;
}

/** Points a position of a shift is worth (without the last-minute bonus unless `bookedAt` is given). */
export function pointsFor(
	shift: Shift,
	position: Pick<ShiftPosition, 'pointsPerShift' | 'pointsPerHour'>,
	tree: AreaTree<Area>,
	settings: InstanceSettings,
	bookedAt: Date | null = null
): PointsBreakdown {
	const lineage = tree.lineage(shift.areaId).map((id) => tree.get(id)!);
	const rule = resolveRule(position, lineage, {
		perShift: settings.pointsPerShift,
		perHour: settings.pointsPerHour
	});
	return shiftPoints(shift, bookedAt, rule, settings, settings.timezone);
}

/**
 * Brings the points for one assignment in line with its state: the full amount when the person
 * is booked and marked present, otherwise nothing. Differences are booked as new ledger entries,
 * so corrections stay traceable.
 */
export async function syncAssignmentPoints(
	tx: Tx,
	actor: Actor,
	assignment: Assignment
): Promise<number> {
	const [row] = await tx
		.select({ shift: shifts, position: shiftPositions })
		.from(shifts)
		.innerJoin(shiftPositions, eq(shiftPositions.id, assignment.positionId))
		.where(eq(shifts.id, assignment.shiftId));
	if (!row) return 0;
	const settings = await getSettings(tx);
	const tree = await loadAreaTree(tx, row.shift.editionId);
	const target =
		assignment.status === 'booked' && assignment.attendance === 'attended'
			? pointsFor(row.shift, row.position, tree, settings, assignment.createdAt).total
			: 0;
	const [current] = await tx
		.select({ total: sql<number>`coalesce(sum(${pointsLedger.amount}), 0)::int` })
		.from(pointsLedger)
		.where(and(eq(pointsLedger.assignmentId, assignment.id), eq(pointsLedger.kind, 'shift')));
	const diff = target - (current?.total ?? 0);
	if (diff !== 0) {
		await tx.insert(pointsLedger).values({
			editionId: row.shift.editionId,
			userId: assignment.userId,
			amount: diff,
			kind: 'shift',
			assignmentId: assignment.id,
			createdBy: actor.userId
		});
	}
	return diff;
}

export async function adjustPoints(
	db: DB,
	actor: Actor,
	input: { userId: string; editionId: string; amount: number; reason: string }
): Promise<void> {
	if (!Number.isInteger(input.amount) || input.amount === 0)
		throw new DomainError('invalidNumber', 'amount');
	if (!input.reason.trim()) throw new DomainError('required', 'reason');
	await db.transaction(async (tx) => {
		await tx.insert(pointsLedger).values({
			editionId: input.editionId,
			userId: input.userId,
			amount: input.amount,
			kind: 'adjustment',
			reason: input.reason,
			createdBy: actor.userId
		});
		await audit(tx, actor, {
			action: 'points.adjust',
			entityType: 'user',
			entityId: input.userId,
			editionId: input.editionId,
			data: { amount: input.amount },
			reason: input.reason
		});
	});
}

/** Ledger entries of a person with a human-readable reference (shift or goodie). */
export async function pointsHistory(db: Tx, userId: string, editionId: string) {
	return db
		.select({
			id: pointsLedger.id,
			amount: pointsLedger.amount,
			kind: pointsLedger.kind,
			reason: pointsLedger.reason,
			createdAt: pointsLedger.createdAt,
			shiftTitleDe: shifts.titleDe,
			shiftTitleEn: shifts.titleEn,
			shiftStartsAt: shifts.startsAt,
			goodieNameDe: goodies.nameDe,
			goodieNameEn: goodies.nameEn
		})
		.from(pointsLedger)
		.leftJoin(assignments, eq(pointsLedger.assignmentId, assignments.id))
		.leftJoin(shifts, eq(assignments.shiftId, shifts.id))
		.leftJoin(goodieClaims, eq(pointsLedger.claimId, goodieClaims.id))
		.leftJoin(goodies, eq(goodieClaims.goodieId, goodies.id))
		.where(and(eq(pointsLedger.userId, userId), eq(pointsLedger.editionId, editionId)))
		.orderBy(desc(pointsLedger.createdAt));
}

/** Points the person would earn from booked shifts that are not confirmed yet. */
export async function pendingPoints(db: Tx, userId: string, editionId: string): Promise<number> {
	const rows = await db
		.select({ shift: shifts, position: shiftPositions, createdAt: assignments.createdAt })
		.from(assignments)
		.innerJoin(shifts, eq(assignments.shiftId, shifts.id))
		.innerJoin(shiftPositions, eq(assignments.positionId, shiftPositions.id))
		.where(
			and(
				eq(assignments.userId, userId),
				eq(shifts.editionId, editionId),
				eq(assignments.status, 'booked'),
				eq(assignments.attendance, 'unknown')
			)
		);
	if (rows.length === 0) return 0;
	const settings = await getSettings(db);
	const tree = await loadAreaTree(db, editionId);
	return rows.reduce(
		(sum, r) => sum + pointsFor(r.shift, r.position, tree, settings, r.createdAt).total,
		0
	);
}
