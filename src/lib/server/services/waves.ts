import { and, asc, eq, ne } from 'drizzle-orm';
import { bookingWindow, type BookingWindow, type WaveAudience } from '#lib/domain/waves.ts';
import type { DB, Tx } from '../db/client.ts';
import {
	assignments,
	bookingWaves,
	roleAssignments,
	shifts,
	waveInvites,
	type BookingWave
} from '../db/schema.ts';
import { audit, type Actor } from '../audit.ts';
import { DomainError } from '../errors.ts';
import { loadAreaTree } from './areas.ts';

export interface WaveInput {
	name: string;
	opensAt: Date;
	closesAt: Date | null;
	areaIds: string[];
	audience: WaveAudience;
}

export function listWaves(db: Tx, editionId: string): Promise<BookingWave[]> {
	return db
		.select()
		.from(bookingWaves)
		.where(eq(bookingWaves.editionId, editionId))
		.orderBy(asc(bookingWaves.opensAt));
}

function check(input: WaveInput) {
	if (input.closesAt && input.closesAt <= input.opensAt)
		throw new DomainError('invalidTimeRange', 'closesAt');
}

export async function createWave(db: DB, actor: Actor, editionId: string, input: WaveInput) {
	check(input);
	return db.transaction(async (tx) => {
		const [wave] = await tx
			.insert(bookingWaves)
			.values({ ...input, editionId })
			.returning();
		await audit(tx, actor, {
			action: 'wave.create',
			entityType: 'wave',
			entityId: wave.id,
			editionId,
			data: { after: { name: wave.name } }
		});
		return wave;
	});
}

export async function updateWave(
	db: DB,
	actor: Actor,
	editionId: string,
	id: string,
	input: WaveInput
) {
	check(input);
	await db.transaction(async (tx) => {
		const [wave] = await tx
			.update(bookingWaves)
			.set(input)
			.where(and(eq(bookingWaves.id, id), eq(bookingWaves.editionId, editionId)))
			.returning();
		if (!wave) throw new DomainError('notFound');
		await audit(tx, actor, {
			action: 'wave.update',
			entityType: 'wave',
			entityId: id,
			editionId: wave.editionId,
			data: { after: { name: wave.name } }
		});
	});
}

export async function deleteWave(db: DB, actor: Actor, editionId: string, id: string) {
	await db.transaction(async (tx) => {
		const [wave] = await tx
			.delete(bookingWaves)
			.where(and(eq(bookingWaves.id, id), eq(bookingWaves.editionId, editionId)))
			.returning();
		if (!wave) throw new DomainError('notFound');
		await audit(tx, actor, {
			action: 'wave.delete',
			entityType: 'wave',
			entityId: id,
			editionId: wave.editionId,
			data: { before: { name: wave.name } }
		});
	});
}

/** Redeems an invitation link. Returns the wave, or null if the code is unknown. */
export async function redeemInvite(
	db: DB,
	userId: string,
	code: string
): Promise<BookingWave | null> {
	const [wave] = await db.select().from(bookingWaves).where(eq(bookingWaves.inviteCode, code));
	if (!wave) return null;
	await db.insert(waveInvites).values({ waveId: wave.id, userId }).onConflictDoNothing();
	return wave;
}

/**
 * Prepares the booking-window check for one person in one edition. The returned function answers
 * for a given area.
 */
export async function bookingAccess(
	db: Tx,
	user: { id: string; isAdmin: boolean },
	editionId: string,
	now: Date
): Promise<(areaId: string) => BookingWindow> {
	const waves = await listWaves(db, editionId);
	if (waves.length === 0) return () => ({ open: true, opensAt: null });
	const [tree, roles, earlier, invites] = await Promise.all([
		loadAreaTree(db, editionId),
		db
			.select({ id: roleAssignments.id })
			.from(roleAssignments)
			.where(and(eq(roleAssignments.userId, user.id), eq(roleAssignments.editionId, editionId)))
			.limit(1),
		db
			.select({ id: assignments.id })
			.from(assignments)
			.innerJoin(shifts, eq(assignments.shiftId, shifts.id))
			.where(
				and(
					eq(assignments.userId, user.id),
					ne(shifts.editionId, editionId),
					eq(assignments.attendance, 'attended')
				)
			)
			.limit(1),
		db
			.select({ waveId: waveInvites.waveId })
			.from(waveInvites)
			.where(eq(waveInvites.userId, user.id))
	]);
	const person = {
		crew: user.isAdmin || roles.length > 0,
		returning: earlier.length > 0,
		invitedWaveIds: new Set(invites.map((i) => i.waveId))
	};
	return (areaId) => bookingWindow(waves, tree.lineage(areaId), person, now);
}
