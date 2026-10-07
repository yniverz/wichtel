import { and, asc, eq, gt, isNull, lt, lte, sql } from 'drizzle-orm';
import type { DB } from './db/client.ts';
import { assignments, emailOutbox, shifts, users } from './db/schema.ts';
import type { Mailer } from './mail.ts';
import { sendTemplate, shiftParams } from './notifications.ts';
import { getSettings } from './services/settings.ts';

const MAX_ATTEMPTS = 6;

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
			await sendTemplate(
				tx,
				'reminder',
				row.user,
				shiftParams(row.shift, row.user.locale, settings.timezone)
			);
		});
	}
	return due.length;
}

/** Small health summary for the admin overview. */
export async function outboxStatus(db: DB) {
	const [row] = await db
		.select({
			pending: sql<number>`count(*) filter (where ${emailOutbox.sentAt} is null and ${emailOutbox.attempts} < ${MAX_ATTEMPTS})::int`,
			failed: sql<number>`count(*) filter (where ${emailOutbox.sentAt} is null and ${emailOutbox.attempts} >= ${MAX_ATTEMPTS})::int`
		})
		.from(emailOutbox);
	return row;
}
