import { eq } from 'drizzle-orm';
import type { DB } from './db/client.ts';
import { sessions, users, type User } from './db/schema.ts';
import { randomToken, sha256 } from './crypto.ts';

const DAY = 24 * 60 * 60 * 1000;
export const SESSION_LIFETIME = 30 * DAY;
const RENEW_THRESHOLD = 15 * DAY;

export const SESSION_COOKIE = 'wichtel_session';

export interface SessionInfo {
	id: string;
	expiresAt: Date;
}

export async function createSession(
	db: DB,
	userId: string
): Promise<{ token: string; expiresAt: Date }> {
	const token = randomToken();
	const expiresAt = new Date(Date.now() + SESSION_LIFETIME);
	await db.insert(sessions).values({ id: sha256(token), userId, expiresAt });
	return { token, expiresAt };
}

/**
 * Resolves a session token to its user. Expired sessions are deleted; sessions in the second half
 * of their lifetime are extended (sliding expiry).
 */
export async function validateSession(
	db: DB,
	token: string
): Promise<{ session: SessionInfo; user: User } | null> {
	const id = sha256(token);
	const [row] = await db
		.select({ session: sessions, user: users })
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.id, id))
		.limit(1);
	if (!row) return null;

	const now = Date.now();
	if (row.session.expiresAt.getTime() <= now) {
		await db.delete(sessions).where(eq(sessions.id, id));
		return null;
	}

	let expiresAt = row.session.expiresAt;
	if (expiresAt.getTime() - now < RENEW_THRESHOLD) {
		expiresAt = new Date(now + SESSION_LIFETIME);
		await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id));
	}
	return { session: { id, expiresAt }, user: row.user };
}

export async function invalidateSession(db: DB, sessionId: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function invalidateUserSessions(db: DB, userId: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.userId, userId));
}
