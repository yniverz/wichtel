import {
	DATABASE_URL,
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
import { building } from '$app/env';
import { connect, type Database, type DB } from './db/client.ts';
import { setPublicUrl } from './notifications.ts';
import { processOutbox, queueReminders } from './outbox.ts';
import { expireHolds } from './services/assignments.ts';
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
	uploadDir: UPLOAD_DIR
};

export async function initApp(): Promise<void> {
	if (state.database) return;
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
		: createConsoleMailer();

	const token = await prepareSetup(database.db, SETUP_TOKEN);
	if (token) {
		console.info(
			`\n  Wichtel is not set up yet. Open this link to create the first admin account:\n  ${PUBLIC_URL}/setup?token=${encodeURIComponent(token)}\n`
		);
	}
	await cleanupExpiredTokens(database.db);
	setPublicUrl(PUBLIC_URL);
	startWorkers(database.db, state.mailer);
}

/** Background jobs: sending queued e-mails and scheduling reminders. */
function startWorkers(database: DB, mailer: Mailer) {
	if (building || state.timers) return;
	const safely = (job: () => Promise<unknown>) => () => {
		job().catch((e) => console.error('[worker]', e));
	};
	state.timers = [
		setInterval(
			safely(() => processOutbox(database, mailer)),
			10_000
		),
		setInterval(
			safely(() => queueReminders(database)),
			5 * 60_000
		),
		setInterval(
			safely(() => expireHolds(database)),
			60_000
		)
	];
	safely(() => queueReminders(database))();
}

export function db(): DB {
	if (!state.database) throw new Error('Database not initialised');
	return state.database.db;
}

export function accountContext(): AccountContext {
	if (!state.mailer) throw new Error('Mailer not initialised');
	return { db: db(), mailer: state.mailer, baseUrl: PUBLIC_URL };
}
