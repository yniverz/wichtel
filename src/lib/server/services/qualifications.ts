import { and, asc, desc, eq, gt, isNull, or } from 'drizzle-orm';
import type { DB, Tx } from '../db/client.ts';
import { qualifications, userQualifications, users, type Qualification } from '../db/schema.ts';
import { audit, diff, type Actor } from '../audit.ts';
import { DomainError } from '../errors.ts';
import { deletePrivateDocument, savePrivateDocument } from '../private-files.ts';

export interface QualificationInput {
	nameDe: string;
	nameEn: string;
	descriptionDe: string;
	descriptionEn: string;
	proof: 'confirm' | 'upload' | 'either';
	documentRetention: 'keep' | 'delete_after_review';
	validityDays: number | null;
	active: boolean;
	sortOrder: number;
}

export function listQualifications(db: Tx): Promise<Qualification[]> {
	return db
		.select()
		.from(qualifications)
		.orderBy(asc(qualifications.sortOrder), asc(qualifications.nameDe));
}

export async function createQualification(db: DB, actor: Actor, input: QualificationInput) {
	return db.transaction(async (tx) => {
		const [q] = await tx.insert(qualifications).values(input).returning();
		await audit(tx, actor, {
			action: 'qualification.create',
			entityType: 'qualification',
			entityId: q.id,
			data: { after: { nameDe: q.nameDe } }
		});
		return q;
	});
}

export async function updateQualification(
	db: DB,
	actor: Actor,
	id: string,
	input: QualificationInput
) {
	await db.transaction(async (tx) => {
		const [before] = await tx.select().from(qualifications).where(eq(qualifications.id, id));
		if (!before) throw new DomainError('notFound');
		await tx.update(qualifications).set(input).where(eq(qualifications.id, id));
		const changes = diff(
			before as unknown as Record<string, unknown>,
			input as unknown as Record<string, unknown>
		);
		if (changes)
			await audit(tx, actor, {
				action: 'qualification.update',
				entityType: 'qualification',
				entityId: id,
				data: changes
			});
	});
}

/** Ids of qualifications the person currently holds (approved and not expired). */
export async function heldQualificationIds(db: Tx, userId: string, now: Date): Promise<string[]> {
	const rows = await db
		.select({ id: userQualifications.qualificationId })
		.from(userQualifications)
		.where(
			and(
				eq(userQualifications.userId, userId),
				eq(userQualifications.status, 'approved'),
				or(isNull(userQualifications.expiresAt), gt(userQualifications.expiresAt, now))
			)
		);
	return rows.map((r) => r.id);
}

export function listUserQualifications(db: Tx, userId: string) {
	return db
		.select({ entry: userQualifications, qualification: qualifications })
		.from(userQualifications)
		.innerJoin(qualifications, eq(userQualifications.qualificationId, qualifications.id))
		.where(eq(userQualifications.userId, userId));
}

/**
 * A volunteer applies for a qualification: by confirming ("I have it") and/or uploading proof,
 * depending on the qualification. Re-applying replaces a previous rejected or pending request.
 */
export async function applyForQualification(
	db: DB,
	uploadDir: string,
	userId: string,
	input: { qualificationId: string; confirmed: boolean; document: File | null; note: string }
) {
	const [q] = await db
		.select()
		.from(qualifications)
		.where(eq(qualifications.id, input.qualificationId));
	if (!q || !q.active) throw new DomainError('notFound');
	const hasFile = input.document !== null && input.document.size > 0;
	if (q.proof === 'upload' && !hasFile) throw new DomainError('documentRequired', 'document');
	if (q.proof === 'confirm' && !input.confirmed)
		throw new DomainError('confirmRequired', 'confirmed');
	if (q.proof === 'either' && !hasFile && !input.confirmed)
		throw new DomainError('confirmRequired', 'confirmed');

	const doc = hasFile ? await savePrivateDocument(uploadDir, input.document!) : null;
	const [existing] = await db
		.select()
		.from(userQualifications)
		.where(
			and(eq(userQualifications.userId, userId), eq(userQualifications.qualificationId, q.id))
		);
	if (existing?.status === 'approved' && (!existing.expiresAt || existing.expiresAt > new Date())) {
		if (doc) await deletePrivateDocument(uploadDir, doc.id);
		throw new DomainError('qualificationHeld');
	}
	const values = {
		status: 'pending' as const,
		note: input.note,
		reviewNote: '',
		reviewedAt: null,
		reviewedBy: null,
		documentId: doc?.id ?? null,
		documentName: doc?.name ?? null,
		documentType: doc?.type ?? null
	};
	if (existing) {
		if (existing.documentId) await deletePrivateDocument(uploadDir, existing.documentId);
		await db.update(userQualifications).set(values).where(eq(userQualifications.id, existing.id));
	} else {
		await db.insert(userQualifications).values({ ...values, userId, qualificationId: q.id });
	}
}

/** Approves or rejects a request. Documents are deleted afterwards if the qualification says so. */
export async function reviewQualification(
	db: DB,
	uploadDir: string,
	actor: Actor,
	input: { id: string; approve: boolean; reviewNote: string; now: Date }
) {
	const documentToDelete = await db.transaction(async (tx) => {
		const [row] = await tx
			.select({ entry: userQualifications, qualification: qualifications })
			.from(userQualifications)
			.innerJoin(qualifications, eq(userQualifications.qualificationId, qualifications.id))
			.where(eq(userQualifications.id, input.id));
		if (!row) throw new DomainError('notFound');
		const { entry, qualification } = row;
		const dropDocument =
			qualification.documentRetention === 'delete_after_review' && entry.documentId;
		await tx
			.update(userQualifications)
			.set({
				status: input.approve ? 'approved' : 'rejected',
				reviewNote: input.reviewNote,
				reviewedAt: input.now,
				reviewedBy: actor.userId,
				expiresAt:
					input.approve && qualification.validityDays
						? new Date(input.now.getTime() + qualification.validityDays * 86_400_000)
						: null,
				...(dropDocument ? { documentId: null, documentName: null, documentType: null } : {})
			})
			.where(eq(userQualifications.id, entry.id));
		await audit(tx, actor, {
			action: input.approve ? 'qualification.approve' : 'qualification.reject',
			entityType: 'user',
			entityId: entry.userId,
			data: { qualification: qualification.nameDe, hadDocument: Boolean(entry.documentId) },
			reason: input.reviewNote || null
		});
		return dropDocument ? entry.documentId : null;
	});
	if (documentToDelete) await deletePrivateDocument(uploadDir, documentToDelete);
}

/** A lead grants a qualification directly (no request needed). */
export async function grantQualification(
	db: DB,
	actor: Actor,
	input: { userId: string; qualificationId: string; now: Date }
) {
	await db.transaction(async (tx) => {
		const [q] = await tx
			.select()
			.from(qualifications)
			.where(eq(qualifications.id, input.qualificationId));
		const [user] = await tx.select({ id: users.id }).from(users).where(eq(users.id, input.userId));
		if (!q || !user) throw new DomainError('notFound');
		const values = {
			status: 'approved' as const,
			reviewedAt: input.now,
			reviewedBy: actor.userId,
			reviewNote: '',
			expiresAt: q.validityDays ? new Date(input.now.getTime() + q.validityDays * 86_400_000) : null
		};
		await tx
			.insert(userQualifications)
			.values({ ...values, userId: input.userId, qualificationId: q.id })
			.onConflictDoUpdate({
				target: [userQualifications.userId, userQualifications.qualificationId],
				set: values
			});
		await audit(tx, actor, {
			action: 'qualification.grant',
			entityType: 'user',
			entityId: input.userId,
			data: { qualification: q.nameDe }
		});
	});
}

export async function revokeQualification(
	db: DB,
	actor: Actor,
	id: string,
	reason: string,
	now: Date
) {
	await db.transaction(async (tx) => {
		const [row] = await tx
			.select({ entry: userQualifications, qualification: qualifications })
			.from(userQualifications)
			.innerJoin(qualifications, eq(userQualifications.qualificationId, qualifications.id))
			.where(eq(userQualifications.id, id));
		if (!row) throw new DomainError('notFound');
		await tx
			.update(userQualifications)
			.set({
				status: 'rejected',
				reviewNote: reason,
				reviewedAt: now,
				reviewedBy: actor.userId,
				expiresAt: null
			})
			.where(eq(userQualifications.id, id));
		await audit(tx, actor, {
			action: 'qualification.revoke',
			entityType: 'user',
			entityId: row.entry.userId,
			data: { qualification: row.qualification.nameDe },
			reason: reason || null
		});
	});
}

/** Requests waiting for review, oldest first. */
export function pendingRequests(db: Tx) {
	return db
		.select({
			id: userQualifications.id,
			note: userQualifications.note,
			documentId: userQualifications.documentId,
			documentName: userQualifications.documentName,
			createdAt: userQualifications.updatedAt,
			userId: users.id,
			firstName: users.firstName,
			lastName: users.lastName,
			qualificationNameDe: qualifications.nameDe,
			qualificationNameEn: qualifications.nameEn
		})
		.from(userQualifications)
		.innerJoin(users, eq(userQualifications.userId, users.id))
		.innerJoin(qualifications, eq(userQualifications.qualificationId, qualifications.id))
		.where(eq(userQualifications.status, 'pending'))
		.orderBy(asc(userQualifications.updatedAt));
}

export async function recentDecisions(db: Tx, limit = 30) {
	return db
		.select({
			id: userQualifications.id,
			status: userQualifications.status,
			reviewedAt: userQualifications.reviewedAt,
			userId: users.id,
			firstName: users.firstName,
			lastName: users.lastName,
			qualificationNameDe: qualifications.nameDe,
			qualificationNameEn: qualifications.nameEn
		})
		.from(userQualifications)
		.innerJoin(users, eq(userQualifications.userId, users.id))
		.innerJoin(qualifications, eq(userQualifications.qualificationId, qualifications.id))
		.where(or(eq(userQualifications.status, 'approved'), eq(userQualifications.status, 'rejected')))
		.orderBy(desc(userQualifications.reviewedAt))
		.limit(limit);
}

export async function documentOf(db: Tx, userQualificationId: string) {
	const [row] = await db
		.select({
			userId: userQualifications.userId,
			documentId: userQualifications.documentId,
			documentName: userQualifications.documentName,
			documentType: userQualifications.documentType
		})
		.from(userQualifications)
		.where(eq(userQualifications.id, userQualificationId));
	return row;
}

/** Active qualifications for selects. */
export async function qualificationOptions(db: Tx) {
	return (await listQualifications(db))
		.filter((q) => q.active)
		.map((q) => ({ id: q.id, nameDe: q.nameDe, nameEn: q.nameEn }));
}
