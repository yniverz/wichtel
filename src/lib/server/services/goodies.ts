import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm';
import { goodieAvailability, isEligible, type GoodieAvailability } from '#lib/domain/points.ts';
import type { DB, Tx } from '../db/client.ts';
import {
	assignments,
	goodieClaims,
	goodies,
	pointsLedger,
	shifts,
	users,
	type Goodie,
	type GoodieClaim
} from '../db/schema.ts';
import { audit, diff, type Actor } from '../audit.ts';
import { DomainError } from '../errors.ts';
import { loadAreaTree } from './areas.ts';
import { pendingPoints, pointsBalance } from './points.ts';

/** Claims that still count (for limits, contingents and "who has what"). */
const LIVE: GoodieClaim['status'][] = ['selected', 'issued', 'refund_pending', 'refunded'];

export interface GoodieInput {
	nameDe: string;
	nameEn: string;
	descriptionDe: string;
	descriptionEn: string;
	price: number;
	maxPerPerson: number;
	selfServiceLimit: number | null;
	stock: number | null;
	variants: string[];
	requiredAreaIds: string[];
	mandatory: boolean;
	mandatoryPriority: number;
	refundable: boolean;
	advance: boolean;
	active: boolean;
	sortOrder: number;
}

export function listGoodies(db: Tx, editionId: string): Promise<Goodie[]> {
	return db
		.select()
		.from(goodies)
		.where(eq(goodies.editionId, editionId))
		.orderBy(asc(goodies.sortOrder), asc(goodies.nameDe));
}

export async function getGoodie(db: Tx, id: string): Promise<Goodie | undefined> {
	const [row] = await db.select().from(goodies).where(eq(goodies.id, id));
	return row;
}

export async function createGoodie(
	db: DB,
	actor: Actor,
	editionId: string,
	input: GoodieInput
): Promise<Goodie> {
	return db.transaction(async (tx) => {
		const [goodie] = await tx
			.insert(goodies)
			.values({ ...input, editionId })
			.returning();
		await audit(tx, actor, {
			action: 'goodie.create',
			entityType: 'goodie',
			entityId: goodie.id,
			editionId,
			data: { after: { nameDe: input.nameDe, price: input.price } }
		});
		return goodie;
	});
}

export async function updateGoodie(
	db: DB,
	actor: Actor,
	id: string,
	input: GoodieInput
): Promise<void> {
	await db.transaction(async (tx) => {
		const before = await getGoodie(tx, id);
		if (!before) throw new DomainError('notFound');
		await tx.update(goodies).set(input).where(eq(goodies.id, id));
		const changes = diff(
			before as unknown as Record<string, unknown>,
			input as unknown as Record<string, unknown>
		);
		if (changes) {
			await audit(tx, actor, {
				action: 'goodie.update',
				entityType: 'goodie',
				entityId: id,
				editionId: before.editionId,
				data: changes
			});
		}
	});
}

/** Deleting is only possible while nobody has claimed the goodie; otherwise deactivate it. */
export async function deleteGoodie(db: DB, actor: Actor, id: string): Promise<void> {
	await db.transaction(async (tx) => {
		const goodie = await getGoodie(tx, id);
		if (!goodie) throw new DomainError('notFound');
		const [claim] = await tx
			.select({ id: goodieClaims.id })
			.from(goodieClaims)
			.where(eq(goodieClaims.goodieId, id))
			.limit(1);
		if (claim) throw new DomainError('goodieHasClaims');
		await tx.delete(goodies).where(eq(goodies.id, id));
		await audit(tx, actor, {
			action: 'goodie.delete',
			entityType: 'goodie',
			entityId: id,
			editionId: goodie.editionId,
			data: { before: { nameDe: goodie.nameDe } }
		});
	});
}

// ---------------------------------------------------------------------------
// Facts per person
// ---------------------------------------------------------------------------

async function attendedAreaIds(db: Tx, userId: string, editionId: string): Promise<string[]> {
	const rows = await db
		.selectDistinct({ areaId: shifts.areaId })
		.from(assignments)
		.innerJoin(shifts, eq(assignments.shiftId, shifts.id))
		.where(
			and(
				eq(assignments.userId, userId),
				eq(shifts.editionId, editionId),
				eq(assignments.status, 'booked'),
				eq(assignments.attendance, 'attended')
			)
		);
	return rows.map((r) => r.areaId);
}

async function claimCounts(db: Tx, editionId: string) {
	const rows = await db
		.select({
			goodieId: goodieClaims.goodieId,
			selfService: goodieClaims.selfService,
			count: sql<number>`count(*)::int`
		})
		.from(goodieClaims)
		.where(and(eq(goodieClaims.editionId, editionId), inArray(goodieClaims.status, LIVE)))
		.groupBy(goodieClaims.goodieId, goodieClaims.selfService);
	const result = new Map<string, { total: number; selfService: number }>();
	for (const r of rows) {
		const entry = result.get(r.goodieId) ?? { total: 0, selfService: 0 };
		entry.total += r.count;
		if (r.selfService) entry.selfService += r.count;
		result.set(r.goodieId, entry);
	}
	return result;
}

export function listClaimsForUser(db: Tx, userId: string, editionId: string) {
	return db
		.select({ claim: goodieClaims, goodie: goodies })
		.from(goodieClaims)
		.innerJoin(goodies, eq(goodieClaims.goodieId, goodies.id))
		.where(
			and(
				eq(goodieClaims.userId, userId),
				eq(goodieClaims.editionId, editionId),
				ne(goodieClaims.status, 'cancelled')
			)
		)
		.orderBy(asc(goodieClaims.createdAt));
}

export interface GoodieOverview {
	balance: number;
	pending: number;
	/** Points held back for mandatory goodies that are not redeemed yet. */
	reserved: number;
	goodies: (Goodie & {
		availability: GoodieAvailability;
		myCount: number;
		remaining: number | null;
	})[];
	claims: Awaited<ReturnType<typeof listClaimsForUser>>;
}

/** Everything a volunteer (or the desk) needs to know about a person's goodies. */
export async function goodieOverview(
	db: Tx,
	userId: string,
	editionId: string
): Promise<GoodieOverview> {
	const [list, balance, pending, attended, tree, counts, claims] = await Promise.all([
		listGoodies(db, editionId),
		pointsBalance(db, userId, editionId),
		pendingPoints(db, userId, editionId),
		attendedAreaIds(db, userId, editionId),
		loadAreaTree(db, editionId),
		claimCounts(db, editionId),
		listClaimsForUser(db, userId, editionId)
	]);
	const eligible = (g: Goodie) =>
		isEligible(g.requiredAreaIds, attended, (a, b) => tree.isWithin(a, b));
	// Points for mandatory goodies that are still open are reserved: "the first points go to the
	// ticket". Other goodies can only use what is left.
	const reserved = list
		.filter(
			(g) => g.mandatory && g.active && eligible(g) && !claims.some((c) => c.goodie.id === g.id)
		)
		.reduce((sum, g) => sum + g.price, 0);
	return {
		balance,
		pending,
		reserved,
		claims,
		goodies: list.map((g) => {
			const myCount = claims.filter((c) => c.goodie.id === g.id).length;
			const selfServiceUsed = counts.get(g.id)?.selfService ?? 0;
			return {
				...g,
				myCount,
				remaining:
					g.selfServiceLimit === null ? null : Math.max(0, g.selfServiceLimit - selfServiceUsed),
				availability: goodieAvailability({
					...g,
					eligible: eligible(g),
					myCount,
					selfServiceUsed,
					balance: g.mandatory ? balance : balance - reserved,
					pending
				})
			};
		})
	};
}

// ---------------------------------------------------------------------------
// Claiming, issuing, refunds
// ---------------------------------------------------------------------------

async function lockUser(tx: Tx, userId: string) {
	await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');
}

async function insertClaim(
	tx: Tx,
	actor: Actor,
	goodie: Goodie,
	userId: string,
	variant: string | null,
	opts: { selfService: boolean; status?: GoodieClaim['status'] }
): Promise<GoodieClaim> {
	const [claim] = await tx
		.insert(goodieClaims)
		.values({
			goodieId: goodie.id,
			editionId: goodie.editionId,
			userId,
			variant,
			points: goodie.price,
			selfService: opts.selfService,
			status: opts.status ?? 'selected',
			createdBy: actor.userId
		})
		.returning();
	if (goodie.price !== 0) {
		await tx.insert(pointsLedger).values({
			editionId: goodie.editionId,
			userId,
			amount: -goodie.price,
			kind: 'goodie',
			claimId: claim.id,
			createdBy: actor.userId
		});
	}
	return claim;
}

function checkVariant(goodie: Goodie, variant: string | null): string | null {
	if (goodie.variants.length === 0) return null;
	if (!variant || !goodie.variants.includes(variant))
		throw new DomainError('variantRequired', 'variant');
	return variant;
}

/** A volunteer picks a goodie. Points are deducted immediately; pickup happens at the desk. */
export async function claimGoodie(
	db: DB,
	actor: Actor,
	userId: string,
	goodieId: string,
	variant: string | null,
	/** Only goodies of this edition (the current one) can be picked. */
	editionId: string
): Promise<GoodieClaim> {
	return db.transaction(async (tx) => {
		await lockUser(tx, userId);
		const goodie = await getGoodie(tx, goodieId);
		if (!goodie || goodie.editionId !== editionId) throw new DomainError('notFound');
		const overview = await goodieOverview(tx, userId, goodie.editionId);
		const state = overview.goodies.find((g) => g.id === goodieId)!;
		if (state.availability !== 'available') throw new DomainError(`goodie.${state.availability}`);
		return insertClaim(tx, actor, goodie, userId, checkVariant(goodie, variant), {
			selfService: true
		});
	});
}

/**
 * The desk hands out a goodie directly. Not limited by the self-service contingent, but by
 * eligibility, the per-person limit and the points (advance goodies may go negative).
 */
export async function issueDirectly(
	db: DB,
	actor: Actor,
	userId: string,
	goodieId: string,
	variant: string | null,
	now: Date
): Promise<GoodieClaim> {
	return db.transaction(async (tx) => {
		await lockUser(tx, userId);
		const goodie = await getGoodie(tx, goodieId);
		if (!goodie || !goodie.active) throw new DomainError('notFound');
		const overview = await goodieOverview(tx, userId, goodie.editionId);
		const state = overview.goodies.find((g) => g.id === goodieId)!;
		if (state.availability === 'notEligible' || state.availability === 'limitReached') {
			throw new DomainError(`goodie.${state.availability}`);
		}
		const own = goodie.mandatory ? overview.balance : overview.balance - overview.reserved;
		const spendable = goodie.advance ? own + overview.pending : own;
		if (spendable < goodie.price) throw new DomainError('goodie.notEnoughPoints');
		const claim = await insertClaim(tx, actor, goodie, userId, checkVariant(goodie, variant), {
			selfService: false,
			status: 'issued'
		});
		await tx
			.update(goodieClaims)
			.set({ issuedAt: now, issuedBy: actor.userId })
			.where(eq(goodieClaims.id, claim.id));
		await audit(tx, actor, {
			action: 'goodie.issue',
			entityType: 'user',
			entityId: userId,
			editionId: goodie.editionId,
			data: { goodie: goodie.nameDe, variant, direct: true }
		});
		return claim;
	});
}

/** Where a claim must belong: the edition being worked on and the person on the page. */
export interface ClaimScope {
	editionId: string;
	userId: string;
}

async function loadClaim(tx: Tx, claimId: string, scope: ClaimScope) {
	const [row] = await tx
		.select({ claim: goodieClaims, goodie: goodies })
		.from(goodieClaims)
		.innerJoin(goodies, eq(goodieClaims.goodieId, goodies.id))
		.where(
			and(
				eq(goodieClaims.id, claimId),
				eq(goodieClaims.editionId, scope.editionId),
				eq(goodieClaims.userId, scope.userId)
			)
		)
		.for('update', { of: goodieClaims });
	if (!row) throw new DomainError('notFound');
	return row;
}

/**
 * Cancels a not yet issued claim and returns the points. `bySelf`: the person cancels their own
 * claim (mandatory goodies cannot be returned that way).
 */
export async function cancelClaim(
	db: DB,
	actor: Actor,
	claimId: string,
	scope: ClaimScope,
	bySelf = false
): Promise<void> {
	await db.transaction(async (tx) => {
		const { claim, goodie } = await loadClaim(tx, claimId, scope);
		const ownerId = bySelf ? scope.userId : undefined;
		if (claim.status !== 'selected') throw new DomainError('claimNotOpen');
		// Mandatory goodies cannot be returned for points – only refunded.
		if (goodie.mandatory && ownerId) throw new DomainError('claimNotOpen');
		await tx.update(goodieClaims).set({ status: 'cancelled' }).where(eq(goodieClaims.id, claimId));
		if (claim.points !== 0) {
			await tx.insert(pointsLedger).values({
				editionId: claim.editionId,
				userId: claim.userId,
				amount: claim.points,
				kind: 'goodie',
				claimId,
				createdBy: actor.userId
			});
		}
		if (!ownerId) {
			await audit(tx, actor, {
				action: 'goodie.cancel',
				entityType: 'user',
				entityId: claim.userId,
				editionId: claim.editionId,
				data: { goodie: goodie.nameDe }
			});
		}
	});
}

/** "I already have one": the claim becomes a pending refund. Points stay used. */
export async function requestRefund(db: DB, scope: ClaimScope, claimId: string): Promise<void> {
	await db.transaction(async (tx) => {
		const { claim, goodie } = await loadClaim(tx, claimId, scope);
		if (!goodie.refundable) throw new DomainError('notFound');
		if (claim.status !== 'selected') throw new DomainError('claimNotOpen');
		await tx
			.update(goodieClaims)
			.set({ status: 'refund_pending' })
			.where(eq(goodieClaims.id, claimId));
	});
}

export async function issueClaim(
	db: DB,
	actor: Actor,
	claimId: string,
	scope: ClaimScope,
	now: Date
): Promise<void> {
	await db.transaction(async (tx) => {
		const { claim, goodie } = await loadClaim(tx, claimId, scope);
		if (claim.status !== 'selected') throw new DomainError('claimNotOpen');
		await tx
			.update(goodieClaims)
			.set({ status: 'issued', issuedAt: now, issuedBy: actor.userId })
			.where(eq(goodieClaims.id, claimId));
		await audit(tx, actor, {
			action: 'goodie.issue',
			entityType: 'user',
			entityId: claim.userId,
			editionId: claim.editionId,
			data: { goodie: goodie.nameDe, variant: claim.variant }
		});
	});
}

export async function markRefunded(
	db: DB,
	actor: Actor,
	claimId: string,
	scope: ClaimScope,
	now: Date
): Promise<void> {
	await db.transaction(async (tx) => {
		const { claim, goodie } = await loadClaim(tx, claimId, scope);
		if (claim.status !== 'refund_pending') throw new DomainError('claimNotOpen');
		await tx
			.update(goodieClaims)
			.set({ status: 'refunded', issuedAt: now, issuedBy: actor.userId })
			.where(eq(goodieClaims.id, claimId));
		await audit(tx, actor, {
			action: 'goodie.refunded',
			entityType: 'user',
			entityId: claim.userId,
			editionId: claim.editionId,
			data: { goodie: goodie.nameDe }
		});
	});
}

/**
 * Redeems mandatory goodies (e.g. the free ticket) in priority order as soon as the person has
 * enough confirmed points. Called after every points change from attendance.
 */
export async function applyMandatoryGoodies(
	tx: Tx,
	actor: Actor,
	userId: string,
	editionId: string
): Promise<number> {
	const mandatory = (await listGoodies(tx, editionId))
		.filter((g) => g.mandatory && g.active)
		.sort((a, b) => a.mandatoryPriority - b.mandatoryPriority);
	if (mandatory.length === 0) return 0;
	await lockUser(tx, userId);
	let created = 0;
	for (const goodie of mandatory) {
		const overview = await goodieOverview(tx, userId, editionId);
		const state = overview.goodies.find((g) => g.id === goodie.id)!;
		if (state.myCount > 0 || !['available', 'soldOut'].includes(state.availability)) continue;
		if (overview.balance < goodie.price) break; // keep the priority order strict
		await insertClaim(tx, actor, goodie, userId, goodie.variants[0] ?? null, {
			selfService: false
		});
		created++;
	}
	return created;
}

// ---------------------------------------------------------------------------
// Admin overview
// ---------------------------------------------------------------------------

export async function claimStats(db: Tx, editionId: string) {
	const rows = await db
		.select({
			goodieId: goodieClaims.goodieId,
			status: goodieClaims.status,
			count: sql<number>`count(*)::int`
		})
		.from(goodieClaims)
		.where(eq(goodieClaims.editionId, editionId))
		.groupBy(goodieClaims.goodieId, goodieClaims.status);
	const result = new Map<string, Partial<Record<GoodieClaim['status'], number>>>();
	for (const r of rows)
		result.set(r.goodieId, { ...(result.get(r.goodieId) ?? {}), [r.status]: r.count });
	return result;
}

export function claimsForGoodie(db: Tx, goodieId: string) {
	return db
		.select({
			id: goodieClaims.id,
			status: goodieClaims.status,
			variant: goodieClaims.variant,
			createdAt: goodieClaims.createdAt,
			issuedAt: goodieClaims.issuedAt,
			userId: users.id,
			firstName: users.firstName,
			lastName: users.lastName
		})
		.from(goodieClaims)
		.innerJoin(users, eq(goodieClaims.userId, users.id))
		.where(and(eq(goodieClaims.goodieId, goodieId), ne(goodieClaims.status, 'cancelled')))
		.orderBy(asc(users.lastName), asc(users.firstName));
}
