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
import { connect, type Database, type DB } from './db/client.ts';
import { createConsoleMailer, createSmtpMailer, type Mailer } from './mail.ts';
import { prepareSetup } from './services/setup.ts';
import { cleanupExpiredTokens } from './services/accounts.ts';
import type { AccountContext } from './services/accounts.ts';

/**
 * Process-wide singletons. Initialised once by the `init` server hook; route code accesses them via
 * the getters below.
 */
let database: Database | undefined;
let mailer: Mailer | undefined;

export const config = {
	publicUrl: PUBLIC_URL,
	uploadDir: UPLOAD_DIR
};

export async function initApp(): Promise<void> {
	if (database) return;
	database = await connect(DATABASE_URL);
	await database.migrate();

	mailer = SMTP_HOST
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
}

export function db(): DB {
	if (!database) throw new Error('Database not initialised');
	return database.db;
}

export function accountContext(): AccountContext {
	if (!mailer) throw new Error('Mailer not initialised');
	return { db: db(), mailer, baseUrl: PUBLIC_URL };
}
