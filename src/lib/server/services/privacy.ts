import { and, asc, eq, gte, inArray, isNotNull, isNull, lt, or, sql } from 'drizzle-orm';
import { formatDayLong, translator } from '#lib/i18n/index.ts';
import { utcToZoned } from '#lib/domain/time.ts';
import type { DB, Tx } from '../db/client.ts';
import {
	areas,
	assignments,
	auditLog,
	buddyGroups,
	buddyMembers,
	editions,
	emailOutbox,
	emailTokens,
	goodieClaims,
	goodies,
	oauthClients,
	oauthCodes,
	oauthGrants,
	pointsLedger,
	profileFields,
	profileValues,
	qualifications,
	roleAssignments,
	roles,
	sessions,
	shiftPositions,
	shifts,
	swapOffers,
	userQualifications,
	users,
	waveInvites,
	type User
} from '../db/schema.ts';
import { audit, type Actor } from '../audit.ts';
import { DomainError } from '../errors.ts';
import { log } from '../log.ts';
import { appUrl, deletedAddress, sendTemplate } from '../notifications.ts';
import { deletePrivateDocument } from '../private-files.ts';
import { verifyPassword } from '../crypto.ts';
import { closeOffersFor, promoteWaitlist } from './assignments.ts';
import { getSettings } from './settings.ts';

const DAY = 24 * 3_600_000;
/** How long before anonymising an inactive account the person is told. */
export const RETENTION_NOTICE_DAYS = 14;

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

/** Remembers that the person used Wichtel; written at most once a day. */
export async function touchLastSeen(db: DB, user: User, now = new Date()) {
	if (user.lastSeenAt && now.getTime() - user.lastSeenAt.getTime() < DAY) return;
	await db
		.update(users)
		.set({ lastSeenAt: now, retentionNoticeAt: null })
		.where(eq(users.id, user.id));
}

// ---------------------------------------------------------------------------
// Data export (Art. 15 / 20 GDPR)
// ---------------------------------------------------------------------------

/**
 * Everything Wichtel stores about a person, as plain JSON. Secrets (password hash, tokens) are
 * left out; that they exist is stated instead.
 */
export async function exportPersonalData(db: Tx, userId: string, now = new Date()) {
	const [user] = await db.select().from(users).where(eq(users.id, userId));
	if (!user) throw new DomainError('notFound');

	const [
		fieldValues,
		quals,
		shiftRows,
		points,
		claims,
		groups,
		offers,
		roleRows,
		connections,
		sessionRows,
		invites,
		activity
	] = await Promise.all([
		db
			.select({ field: profileFields.labelDe, value: profileValues.value })
			.from(profileValues)
			.innerJoin(profileFields, eq(profileValues.fieldId, profileFields.id))
			.where(eq(profileValues.userId, userId)),
		db
			.select({
				qualification: qualifications.nameDe,
				status: userQualifications.status,
				note: userQualifications.note,
				reviewNote: userQualifications.reviewNote,
				document: userQualifications.documentName,
				reviewedAt: userQualifications.reviewedAt,
				expiresAt: userQualifications.expiresAt,
				createdAt: userQualifications.createdAt
			})
			.from(userQualifications)
			.innerJoin(qualifications, eq(userQualifications.qualificationId, qualifications.id))
			.where(eq(userQualifications.userId, userId)),
		db
			.select({
				edition: editions.name,
				shift: shifts.titleDe,
				position: shiftPositions.nameDe,
				startsAt: shifts.startsAt,
				endsAt: shifts.endsAt,
				status: assignments.status,
				attendance: assignments.attendance,
				bonusPoints: assignments.bonusPoints,
				createdAt: assignments.createdAt
			})
			.from(assignments)
			.innerJoin(shifts, eq(assignments.shiftId, shifts.id))
			.innerJoin(shiftPositions, eq(assignments.positionId, shiftPositions.id))
			.innerJoin(editions, eq(shifts.editionId, editions.id))
			.where(eq(assignments.userId, userId))
			.orderBy(asc(shifts.startsAt)),
		db
			.select({
				edition: editions.name,
				amount: pointsLedger.amount,
				kind: pointsLedger.kind,
				reason: pointsLedger.reason,
				createdAt: pointsLedger.createdAt
			})
			.from(pointsLedger)
			.innerJoin(editions, eq(pointsLedger.editionId, editions.id))
			.where(eq(pointsLedger.userId, userId))
			.orderBy(asc(pointsLedger.createdAt)),
		db
			.select({
				edition: editions.name,
				goodie: goodies.nameDe,
				variant: goodieClaims.variant,
				status: goodieClaims.status,
				points: goodieClaims.points,
				issuedAt: goodieClaims.issuedAt,
				createdAt: goodieClaims.createdAt
			})
			.from(goodieClaims)
			.innerJoin(goodies, eq(goodieClaims.goodieId, goodies.id))
			.innerJoin(editions, eq(goodieClaims.editionId, editions.id))
			.where(eq(goodieClaims.userId, userId)),
		db
			.select({ edition: editions.name, group: buddyGroups.name, joinedAt: buddyMembers.joinedAt })
			.from(buddyMembers)
			.innerJoin(buddyGroups, eq(buddyMembers.groupId, buddyGroups.id))
			.innerJoin(editions, eq(buddyMembers.editionId, editions.id))
			.where(eq(buddyMembers.userId, userId)),
		db
			.select({
				status: swapOffers.status,
				direct: sql<boolean>`${swapOffers.toUserId} is not null`,
				givenAway: sql<boolean>`${swapOffers.fromUserId} = ${userId}`,
				createdAt: swapOffers.createdAt
			})
			.from(swapOffers)
			.where(
				or(
					eq(swapOffers.fromUserId, userId),
					eq(swapOffers.toUserId, userId),
					eq(swapOffers.takerId, userId)
				)
			),
		db
			.select({ edition: editions.name, role: roles.nameDe, area: areas.nameDe })
			.from(roleAssignments)
			.innerJoin(roles, eq(roleAssignments.roleId, roles.id))
			.innerJoin(editions, eq(roleAssignments.editionId, editions.id))
			.leftJoin(areas, eq(roleAssignments.areaId, areas.id))
			.where(eq(roleAssignments.userId, userId)),
		db
			.select({
				app: oauthClients.name,
				scope: oauthGrants.scope,
				createdAt: oauthGrants.createdAt,
				lastUsedAt: oauthGrants.lastUsedAt,
				expiresAt: oauthGrants.expiresAt,
				revokedAt: oauthGrants.revokedAt
			})
			.from(oauthGrants)
			.innerJoin(oauthClients, eq(oauthGrants.clientId, oauthClients.id))
			.where(eq(oauthGrants.userId, userId)),
		db
			.select({ createdAt: sessions.createdAt, expiresAt: sessions.expiresAt })
			.from(sessions)
			.where(eq(sessions.userId, userId)),
		db
			.select({ createdAt: waveInvites.createdAt })
			.from(waveInvites)
			.where(eq(waveInvites.userId, userId)),
		db
			.select({
				time: auditLog.createdAt,
				action: auditLog.action,
				entityType: auditLog.entityType,
				byYou: sql<boolean>`${auditLog.actorId} = ${userId}`,
				// Only the person's own addresses; entries about them made by others keep their IPs.
				ip: sql<string | null>`case when ${auditLog.actorId} = ${userId} then ${auditLog.ip} end`
			})
			.from(auditLog)
			.where(
				or(
					eq(auditLog.actorId, userId),
					and(eq(auditLog.entityType, 'user'), eq(auditLog.entityId, userId))
				)
			)
			.orderBy(asc(auditLog.createdAt))
	]);

	return {
		exportedAt: now.toISOString(),
		account: {
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email,
			phone: user.phone,
			language: user.locale,
			isAdmin: user.isAdmin,
			emailConfirmedAt: user.emailVerifiedAt,
			createdAt: user.createdAt,
			lastSeenAt: user.lastSeenAt,
			passwordSet: user.passwordHash !== null,
			note: 'Password (only as a hash), QR code and calendar tokens are stored but not exported.'
		},
		profileFields: fieldValues,
		qualifications: quals,
		shifts: shiftRows,
		points,
		goodies: claims,
		buddyGroups: groups,
		handovers: offers,
		roles: roleRows,
		waveInvites: invites,
		aiConnections: connections,
		logins: sessionRows,
		activityLog: activity
	};
}

// ---------------------------------------------------------------------------
// Deleting an account
// ---------------------------------------------------------------------------

export interface DeletionContext {
	db: DB;
	uploadDir: string;
	now?: Date;
}

/**
 * Deletes a person's account. Personal data is removed; bookings, attendance and points stay with
 * an anonymous placeholder, so shift statistics and the points ledger remain consistent. Upcoming
 * bookings are cancelled (and waiting lists move up).
 */
export async function deleteAccount(
	ctx: DeletionContext,
	actor: Actor,
	userId: string,
	reason: 'self' | 'admin' | 'retention'
): Promise<void> {
	const now = ctx.now ?? new Date();
	const settings = await getSettings(ctx.db);
	const documents = await ctx.db.transaction(async (tx) => {
		const [user] = await tx.select().from(users).where(eq(users.id, userId)).for('update');
		if (!user || user.deletedAt) throw new DomainError('notFound');
		if (user.isAdmin) {
			const [{ n }] = await tx
				.select({ n: sql<number>`count(*)::int` })
				.from(users)
				.where(and(eq(users.isAdmin, true), isNull(users.deletedAt)));
			if (n <= 1) throw new DomainError('lastAdmin');
		}

		// Upcoming places are given back.
		const upcoming = await tx
			.select({
				id: assignments.id,
				positionId: assignments.positionId,
				status: assignments.status
			})
			.from(assignments)
			.innerJoin(shifts, eq(assignments.shiftId, shifts.id))
			.where(
				and(
					eq(assignments.userId, userId),
					inArray(assignments.status, ['requested', 'booked', 'held', 'waitlisted']),
					gte(shifts.startsAt, now)
				)
			);
		if (upcoming.length) {
			await tx
				.update(assignments)
				.set({ status: 'cancelled' })
				.where(
					inArray(
						assignments.id,
						upcoming.map((a) => a.id)
					)
				);
			await closeOffersFor(
				tx,
				upcoming.map((a) => a.id)
			);
		}
		await tx
			.update(swapOffers)
			.set({ status: 'withdrawn' })
			.where(
				and(
					inArray(swapOffers.status, ['open', 'proposed', 'pending_approval']),
					or(eq(swapOffers.fromUserId, userId), eq(swapOffers.toUserId, userId))
				)
			);
		for (const positionId of new Set(
			upcoming.filter((a) => a.status === 'booked' || a.status === 'held').map((a) => a.positionId)
		)) {
			await promoteWaitlist(tx, actor, positionId, now);
		}

		// Goodies not handed out yet are cancelled; issued ones stay (stock and points).
		await tx
			.update(goodieClaims)
			.set({ status: 'cancelled' })
			.where(and(eq(goodieClaims.userId, userId), eq(goodieClaims.status, 'selected')));

		const docs = await tx
			.select({ documentId: userQualifications.documentId })
			.from(userQualifications)
			.where(and(eq(userQualifications.userId, userId), isNotNull(userQualifications.documentId)));

		await tx.delete(userQualifications).where(eq(userQualifications.userId, userId));
		await tx.delete(profileValues).where(eq(profileValues.userId, userId));
		await tx.delete(roleAssignments).where(eq(roleAssignments.userId, userId));
		await tx.delete(waveInvites).where(eq(waveInvites.userId, userId));
		await tx.delete(sessions).where(eq(sessions.userId, userId));
		await tx.delete(emailTokens).where(eq(emailTokens.userId, userId));
		await tx.delete(oauthCodes).where(eq(oauthCodes.userId, userId));
		await tx.delete(oauthGrants).where(eq(oauthGrants.userId, userId));
		await tx
			.delete(emailOutbox)
			.where(and(eq(emailOutbox.to, user.email), isNull(emailOutbox.sentAt)));

		// Buddy groups: leave, and dissolve groups that become empty.
		const memberships = await tx
			.delete(buddyMembers)
			.where(eq(buddyMembers.userId, userId))
			.returning({ groupId: buddyMembers.groupId });
		for (const { groupId } of memberships) {
			const [{ n }] = await tx
				.select({ n: sql<number>`count(*)::int` })
				.from(buddyMembers)
				.where(eq(buddyMembers.groupId, groupId));
			if (n === 0) await tx.delete(buddyGroups).where(eq(buddyGroups.id, groupId));
		}

		// The audit log keeps what happened, but no longer who it was or from where.
		await tx
			.update(auditLog)
			.set({ data: {}, ip: null })
			.where(and(eq(auditLog.entityType, 'user'), eq(auditLog.entityId, userId)));
		await tx.update(auditLog).set({ ip: null }).where(eq(auditLog.actorId, userId));

		const t = translator(settings.defaultLocale);
		await tx
			.update(users)
			.set({
				email: deletedAddress(userId),
				passwordHash: null,
				firstName: t('account.deleted.name'),
				lastName: '',
				phone: '',
				isAdmin: false,
				emailVerifiedAt: null,
				qrToken: sql`replace(gen_random_uuid()::text, '-', '')`,
				calendarToken: sql`replace(gen_random_uuid()::text, '-', '')`,
				lastSeenAt: null,
				retentionNoticeAt: null,
				deletedAt: now
			})
			.where(eq(users.id, userId));

		await audit(tx, actor, {
			action: 'user.delete',
			entityType: 'user',
			entityId: userId,
			data: { reason, cancelledBookings: upcoming.length }
		});
		return docs;
	});
	for (const doc of documents) {
		if (doc.documentId) await deletePrivateDocument(ctx.uploadDir, doc.documentId);
	}
}

/** A person deletes their own account; the password confirms it. */
export async function deleteOwnAccount(ctx: DeletionContext, user: User, password: string) {
	if (!user.passwordHash || !(await verifyPassword(user.passwordHash, password))) {
		throw new DomainError('wrongPassword', 'password');
	}
	await deleteAccount(ctx, { userId: user.id }, user.id, 'self');
}

// ---------------------------------------------------------------------------
// Retention
// ---------------------------------------------------------------------------

/**
 * The moment of a person's last activity: last visit, account creation, or the end of their
 * latest shift – whichever is latest.
 */
function lastActivity() {
	// Written with explicit table names: Drizzle drops them for single-table selects, which would
	// make the subquery ambiguous.
	return sql<string>`greatest(
		coalesce("users"."last_seen_at", "users"."created_at"),
		coalesce((select max(s."ends_at") from "assignments" a
			inner join "shifts" s on s."id" = a."shift_id"
			where a."user_id" = "users"."id"
			and a."status" not in ('cancelled', 'rejected')), "users"."created_at")
	)`;
}

function monthsBefore(now: Date, months: number) {
	const d = new Date(now);
	d.setUTCMonth(d.getUTCMonth() - months);
	return d;
}

/**
 * Daily housekeeping for data protection:
 * - accounts without activity for `retentionMonths` are told, and anonymised 14 days later
 *   (admins are never removed automatically);
 * - IP addresses in the audit log are removed after `auditIpDays`.
 */
export async function runRetention(ctx: DeletionContext) {
	const now = ctx.now ?? new Date();
	const settings = await getSettings(ctx.db);
	let noticed = 0;
	let deleted = 0;

	if (settings.retentionMonths > 0) {
		const cutoff = monthsBefore(now, settings.retentionMonths);
		const noticeCutoff = new Date(cutoff.getTime() + RETENTION_NOTICE_DAYS * DAY);
		const activity = lastActivity();
		const candidates = await ctx.db
			.select({ user: users, activity })
			.from(users)
			.where(and(isNull(users.deletedAt), eq(users.isAdmin, false), lt(activity, noticeCutoff)));
		for (const { user, activity: last } of candidates) {
			const lastAt = new Date(last);
			if (!user.retentionNoticeAt) {
				// Told first; the account then stays for at least 14 more days.
				const deleteOn = new Date(
					Math.max(
						monthsBefore(lastAt, -settings.retentionMonths).getTime(),
						now.getTime() + RETENTION_NOTICE_DAYS * DAY
					)
				);
				await ctx.db.transaction(async (tx) => {
					await tx.update(users).set({ retentionNoticeAt: now }).where(eq(users.id, user.id));
					if (user.emailVerifiedAt) {
						await sendTemplate(tx, 'account_retention', user, {
							date: formatDayLong(utcToZoned(deleteOn, settings.timezone).date, user.locale),
							months: String(settings.retentionMonths),
							link: appUrl('/login')
						});
					}
				});
				noticed++;
			} else if (
				lastAt < cutoff &&
				now.getTime() - user.retentionNoticeAt.getTime() >= RETENTION_NOTICE_DAYS * DAY
			) {
				try {
					await deleteAccount({ ...ctx, now }, { userId: null }, user.id, 'retention');
					deleted++;
				} catch (e) {
					log.warn('retention: could not anonymise account', { userId: user.id, err: e });
				}
			}
		}
	}

	if (settings.auditIpDays > 0) {
		await ctx.db
			.update(auditLog)
			.set({ ip: null })
			.where(
				and(
					isNotNull(auditLog.ip),
					lt(auditLog.createdAt, new Date(now.getTime() - settings.auditIpDays * DAY))
				)
			);
	}
	if (noticed || deleted) log.info('retention run', { noticed, deleted });
	return { noticed, deleted };
}
