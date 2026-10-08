import { and, asc, desc, eq, gt, gte, inArray, isNotNull, isNull, lt, lte, sql } from 'drizzle-orm';
import type { DB } from './db/client.ts';
import { assignments, emailOutbox, shifts, users } from './db/schema.ts';
import type { Mailer } from './mail.ts';
import { log } from './log.ts';
import { audit, type Actor } from './audit.ts';
import { placesOf, sendTemplate, shiftParams } from './notifications.ts';
import { getSettings } from './services/settings.ts';

export const MAX_ATTEMPTS = 6;
const DAY = 24 * 3_600_000;

/**
 * Sends queued e-mails. Failed mails are retried with growing delays (1, 4, 9 … minutes).
 * Returns the number of mails sent.
 */
export async function processOutbox(
	db: DB,
	mailer: Mailer,
	now = new Date(),
	batch = 20
): Promise<number> {
	const due = await db
		.select()
		.from(emailOutbox)
		.where(
			and(
				isNull(emailOutbox.sentAt),
				lte(emailOutbox.sendAfter, now),
				lt(emailOutbox.attempts, MAX_ATTEMPTS)
			)
		)
		.orderBy(asc(emailOutbox.createdAt))
		.limit(batch);
	let sent = 0;
	for (const mail of due) {
		try {
			await mailer.send({ to: mail.to, subject: mail.subject, text: mail.text, html: mail.html });
			await db
				.update(emailOutbox)
				.set({ sentAt: new Date(), lastError: null })
				.where(eq(emailOutbox.id, mail.id));
			sent++;
		} catch (e) {
			const attempts = mail.attempts + 1;
			// No address in the log: the mail id is enough to find it in the admin view.
			(attempts >= MAX_ATTEMPTS ? log.error : log.warn)(
				attempts >= MAX_ATTEMPTS ? 'mail failed for good' : 'mail failed, will retry',
				{ mailId: mail.id, attempts, err: e instanceof Error ? e.message : String(e) }
			);
			await db
				.update(emailOutbox)
				.set({
					attempts,
					lastError: e instanceof Error ? e.message.slice(0, 500) : String(e),
					sendAfter: new Date(now.getTime() + attempts * attempts * 60_000)
				})
				.where(eq(emailOutbox.id, mail.id));
		}
	}
	return sent;
}

/** Queues reminder mails for booked shifts that start within the configured window. */
export async function queueReminders(db: DB, now = new Date()): Promise<number> {
	const settings = await getSettings(db);
	if (settings.reminderHours <= 0) return 0;
	const until = new Date(now.getTime() + settings.reminderHours * 3_600_000);
	const due = await db
		.select({ assignmentId: assignments.id, user: users, shift: shifts })
		.from(assignments)
		.innerJoin(shifts, eq(assignments.shiftId, shifts.id))
		.innerJoin(users, eq(assignments.userId, users.id))
		.where(
			and(
				eq(assignments.status, 'booked'),
				isNull(assignments.reminderSentAt),
				gt(shifts.startsAt, now),
				lte(shifts.startsAt, until)
			)
		);
	for (const row of due) {
		await db.transaction(async (tx) => {
			// Claim the reminder first so that parallel runs cannot send it twice.
			const claimed = await tx
				.update(assignments)
				.set({ reminderSentAt: now })
				.where(and(eq(assignments.id, row.assignmentId), isNull(assignments.reminderSentAt)))
				.returning({ id: assignments.id });
			if (claimed.length === 0) return;
			const shiftPlaces = await placesOf(tx, row.shift);
			await sendTemplate(
				tx,
				'reminder',
				row.user,
				shiftParams(row.shift, row.user.locale, settings.timezone, shiftPlaces)
			);
		});
	}
	return due.length;
}

/** Mails that failed for good, and mails still waiting after at least one failed attempt. */
export async function outboxProblems(db: DB, limit = 100) {
	return db
		.select({
			id: emailOutbox.id,
			to: emailOutbox.to,
			subject: emailOutbox.subject,
			createdAt: emailOutbox.createdAt,
			sendAfter: emailOutbox.sendAfter,
			attempts: emailOutbox.attempts,
			lastError: emailOutbox.lastError
		})
		.from(emailOutbox)
		.where(and(isNull(emailOutbox.sentAt), gt(emailOutbox.attempts, 0)))
		.orderBy(desc(emailOutbox.attempts), desc(emailOutbox.createdAt))
		.limit(limit);
}

/** Puts failed mails back into the queue (attempts start again). */
export async function retryMails(db: DB, actor: Actor, ids: string[], now = new Date()) {
	if (ids.length === 0) return 0;
	return db.transaction(async (tx) => {
		const rows = await tx
			.update(emailOutbox)
			.set({ attempts: 0, sendAfter: now })
			.where(and(inArray(emailOutbox.id, ids), isNull(emailOutbox.sentAt)))
			.returning({ id: emailOutbox.id });
		await audit(tx, actor, {
			action: 'mail.retry',
			entityType: 'mail',
			data: { count: rows.length }
		});
		return rows.length;
	});
}

/** Removes mails from the queue without sending them. */
export async function discardMails(db: DB, actor: Actor, ids: string[]) {
	if (ids.length === 0) return 0;
	return db.transaction(async (tx) => {
		const rows = await tx
			.delete(emailOutbox)
			.where(and(inArray(emailOutbox.id, ids), isNull(emailOutbox.sentAt)))
			.returning({ id: emailOutbox.id });
		await audit(tx, actor, {
			action: 'mail.discard',
			entityType: 'mail',
			data: { count: rows.length }
		});
		return rows.length;
	});
}

/**
 * Sent mails are kept for 30 days (to answer "did I get a mail?"), mails that failed for good for
 * 90 days. Their content is personal data, so nothing stays forever.
 */
export async function pruneOutbox(db: DB, now = new Date()) {
	await db
		.delete(emailOutbox)
		.where(
			and(isNotNull(emailOutbox.sentAt), lt(emailOutbox.sentAt, new Date(now.getTime() - 30 * DAY)))
		);
	await db
		.delete(emailOutbox)
		.where(
			and(
				isNull(emailOutbox.sentAt),
				gte(emailOutbox.attempts, MAX_ATTEMPTS),
				lt(emailOutbox.createdAt, new Date(now.getTime() - 90 * DAY))
			)
		);
}

/** Small health summary for the admin overview. */
export async function outboxStatus(db: DB) {
	const [row] = await db
		.select({
			pending: sql<number>`count(*) filter (where ${emailOutbox.sentAt} is null and ${emailOutbox.attempts} < ${MAX_ATTEMPTS})::int`,
			failed: sql<number>`count(*) filter (where ${emailOutbox.sentAt} is null and ${emailOutbox.attempts} >= ${MAX_ATTEMPTS})::int`,
			retrying: sql<number>`count(*) filter (where ${emailOutbox.sentAt} is null and ${emailOutbox.attempts} > 0 and ${emailOutbox.attempts} < ${MAX_ATTEMPTS})::int`
		})
		.from(emailOutbox);
	return row;
}
