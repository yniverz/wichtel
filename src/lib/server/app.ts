import {
	DATABASE_URL,
	LOG_FORMAT,
	LOG_LEVEL,
	LOG_MAIL_BODIES,
	PUBLIC_URL,
	SETUP_TOKEN,
	SMTP_FROM,
	SMTP_HOST,
	SMTP_PASSWORD,
	SMTP_PORT,
	SMTP_SECURE,
	SMTP_USER,
	UPLOAD_DIR
} from '$app/env/private';
import { building, dev } from '$app/env';
import { connect, type Database, type DB } from './db/client.ts';
import { setPublicUrl } from './notifications.ts';
import { setHttpsOnly } from './cookies.ts';
import { processOutbox, pruneOutbox, queueReminders } from './outbox.ts';
import { expireHolds } from './services/assignments.ts';
import { cleanupOAuth } from './services/oauth.ts';
import { runRetention } from './services/privacy.ts';
import { configureLog, log } from './log.ts';
import { reportError } from './alerts.ts';
import { createConsoleMailer, createSmtpMailer, type Mailer } from './mail.ts';
import { prepareSetup } from './services/setup.ts';
import { cleanupExpiredTokens } from './services/accounts.ts';
import type { AccountContext } from './services/accounts.ts';

/**
 * Process-wide singletons. Initialised once by the `init` server hook; route code accesses them via
 * the getters below. Kept on `globalThis` so that hot module reloading in development (which
 * re-evaluates this module) does not lose the open database.
 */
const state = ((
	globalThis as {
		__wichtel?: {
			database?: Database;
			mailer?: Mailer;
			timers?: ReturnType<typeof setInterval>[];
		};
	}
).__wichtel ??= {});

export const config = {
	publicUrl: PUBLIC_URL,
	uploadDir: UPLOAD_DIR,
	/** Whether e-mails are really sent (otherwise they are only logged). */
	mailServer: Boolean(SMTP_HOST)
};

export async function initApp(): Promise<void> {
	if (state.database) return;
	configureLog({ level: LOG_LEVEL, format: LOG_FORMAT ?? (dev ? 'text' : 'json') });
	const database = await connect(DATABASE_URL);
	await database.migrate();
	state.database = database;

	state.mailer = SMTP_HOST
		? createSmtpMailer({
				host: SMTP_HOST,
				port: SMTP_PORT,
				secure: SMTP_SECURE,
				user: SMTP_USER,
				password: SMTP_PASSWORD,
				from: SMTP_FROM
			})
		: createConsoleMailer(LOG_MAIL_BODIES ?? dev);
	if (!SMTP_HOST && !dev) {
		log.warn(
			'No mail server (SMTP_HOST): e-mails are not sent, addresses are not confirmed and people cannot reset their password themselves.'
		);
	}

	const token = await prepareSetup(database.db, SETUP_TOKEN);
	if (token) {
		log.info('Wichtel is not set up yet. Open this link to create the first admin account.', {
			url: `${PUBLIC_URL}/setup?token=${encodeURIComponent(token)}`
		});
	}
	await cleanupExpiredTokens(database.db);
	setPublicUrl(PUBLIC_URL);
	setHttpsOnly(PUBLIC_URL.startsWith('https://'));
	startWorkers(database.db, state.mailer);
}

/** Background jobs: e-mails, reminders, expiring holds and data protection housekeeping. */
function startWorkers(database: DB, mailer: Mailer) {
	if (building || state.timers) return;
	const safely = (job: () => Promise<unknown>, name: string) => () => {
		job().catch((e) => reportError(database, e, { worker: name }));
	};
	const housekeeping = async () => {
		await runRetention({ db: database, uploadDir: UPLOAD_DIR });
		await pruneOutbox(database);
	};
	state.timers = [
		setInterval(
			safely(() => processOutbox(database, mailer), 'outbox'),
			10_000
		),
		setInterval(
			safely(() => queueReminders(database), 'reminders'),
			5 * 60_000
		),
		setInterval(
			safely(() => expireHolds(database), 'holds'),
			60_000
		),
		setInterval(
			safely(() => cleanupOAuth(database), 'oauth'),
			60 * 60_000
		),
		setInterval(safely(housekeeping, 'retention'), 6 * 60 * 60_000)
	];
	safely(() => queueReminders(database), 'reminders')();
	safely(housekeeping, 'retention')();
}

/** The database if it is ready (for error reporting, which must work at any time). */
export function maybeDb(): DB | null {
	return state.database?.db ?? null;
}

export function db(): DB {
	if (!state.database) throw new Error('Database not initialised');
	return state.database.db;
}

export function accountContext(): AccountContext {
	if (!state.mailer) throw new Error('Mailer not initialised');
	return { db: db(), mailer: state.mailer, baseUrl: PUBLIC_URL, skipEmailVerification: !SMTP_HOST };
}
