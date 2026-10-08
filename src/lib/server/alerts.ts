import { randomBytes } from 'node:crypto';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import type { DB } from './db/client.ts';
import { users } from './db/schema.ts';
import { log, type LogFields } from './log.ts';
import { appUrl, enqueueMail } from './notifications.ts';
import { getSettings } from './services/settings.ts';

const HOUR = 3_600_000;

/**
 * Keeps error mails rare: the same error at most once an hour, and at most `max` mails an hour in
 * total. Everything is still logged.
 */
export class AlertThrottle {
	private seen = new Map<string, number>();
	private sent: number[] = [];

	constructor(
		private readonly max = 10,
		private readonly window = HOUR
	) {}

	allow(signature: string, now = Date.now()): boolean {
		this.sent = this.sent.filter((t) => now - t < this.window);
		const last = this.seen.get(signature);
		if (last !== undefined && now - last < this.window) return false;
		if (this.sent.length >= this.max) return false;
		this.seen.set(signature, now);
		this.sent.push(now);
		if (this.seen.size > 500) {
			for (const [key, t] of this.seen) if (now - t >= this.window) this.seen.delete(key);
		}
		return true;
	}
}

/** Same error at the same place = same signature (message and first stack frame). */
export function errorSignature(error: unknown): string {
	if (!(error instanceof Error)) return String(error).slice(0, 200);
	const frame = error.stack?.split('\n').find((l) => l.trim().startsWith('at ')) ?? '';
	return `${error.name}: ${error.message}`.slice(0, 200) + frame.trim();
}

export const newErrorId = () => randomBytes(4).toString('hex');

const throttle = new AlertThrottle();

/**
 * Logs an unexpected error and, if enabled, mails the admins about it. Never throws: reporting an
 * error must not cause another one.
 */
export async function reportError(
	db: DB | null,
	error: unknown,
	context: LogFields & { errorId?: string } = {}
): Promise<void> {
	const errorId = context.errorId ?? newErrorId();
	log.error('unexpected error', { ...context, errorId, err: error });
	if (!db) return;
	try {
		const settings = await getSettings(db);
		if (!settings.errorAlerts || !throttle.allow(errorSignature(error))) return;
		const admins = await db
			.select({ email: users.email })
			.from(users)
			.where(
				and(eq(users.isAdmin, true), isNull(users.deletedAt), isNotNull(users.emailVerifiedAt))
			);
		const where = Object.entries(context)
			.filter(([k, v]) => k !== 'errorId' && v !== undefined)
			.map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
		const detail =
			error instanceof Error ? (error.stack ?? `${error.name}: ${error.message}`) : String(error);
		const text = [
			`In ${settings.festivalName} (${appUrl('')}) ist ein unerwarteter Fehler aufgetreten.`,
			`An unexpected error occurred.`,
			'',
			`Fehler-ID / Error ID: ${errorId}`,
			`Zeit / Time: ${new Date().toISOString()}`,
			...where,
			'',
			detail.slice(0, 4000),
			'',
			'Gleiche Fehler werden höchstens einmal pro Stunde gemeldet. Abschalten: Verwaltung → Einstellungen → Betrieb.',
			'The same error is reported at most once an hour. Turn off in Admin → Settings → Operations.'
		].join('\n');
		for (const admin of admins) {
			await enqueueMail(db, {
				to: admin.email,
				subject: `[${settings.festivalName}] Fehler ${errorId}`,
				text
			});
		}
	} catch (e) {
		log.error('error report failed', { err: e });
	}
}
