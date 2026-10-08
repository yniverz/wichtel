import { and, eq, gt, lt } from 'drizzle-orm';
import type { Locale } from '#lib/i18n/index.ts';
import type { DB } from '../db/client.ts';
import { emailTokens, users, type User } from '../db/schema.ts';
import { getDummyHash, hashPassword, randomToken, sha256, verifyPassword } from '../crypto.ts';
import { DomainError } from '../errors.ts';
import { linkMail, type Mailer } from '../mail.ts';
import { enqueueMail } from '../notifications.ts';
import { invalidateUserSessions } from '../sessions.ts';
import { audit, type Actor } from '../audit.ts';
import { getSettings } from './settings.ts';
import { revokeAllConnections } from './oauth.ts';

const HOUR = 60 * 60 * 1000;
const VERIFY_TTL = 48 * HOUR;
const RESET_TTL = 1 * HOUR;

export interface AccountContext {
	db: DB;
	mailer: Mailer;
	/** Public base URL for links in e-mails, without trailing slash. */
	baseUrl: string;
	/**
	 * Without a mail server nobody could confirm their address, so new accounts count as confirmed
	 * right away.
	 */
	skipEmailVerification?: boolean;
}

export interface RegisterInput {
	email: string;
	password: string;
	firstName: string;
	lastName: string;
	phone: string;
	locale: Locale;
}

/**
 * Registration that does not reveal whether an address already has an account: if it has, the
 * owner gets an e-mail with a link to reset their password instead, and the caller shows the
 * same "check your inbox" message. Returns the new user, or null for an existing address.
 * Without a mail server this is impossible, so the address is reported as taken.
 */
export async function registerOrNotify(
	ctx: AccountContext,
	input: RegisterInput
): Promise<User | null> {
	try {
		return await register(ctx, input);
	} catch (e) {
		if (ctx.skipEmailVerification || !(e instanceof DomainError) || e.code !== 'emailTaken')
			throw e;
		const user = await findUserByEmail(ctx.db, input.email);
		if (!user || user.deletedAt) return null;
		const settings = await getSettings(ctx.db);
		const token = await issueToken(ctx.db, user.id, 'reset_password', RESET_TTL);
		await enqueueMail(
			ctx.db,
			linkMail({
				locale: user.locale,
				to: user.email,
				name: user.firstName,
				festival: settings.festivalName,
				primaryColor: settings.primaryColor,
				subject: 'mail.exists.subject',
				body: 'mail.exists.body',
				expiry: 'mail.reset.expiry',
				link: `${ctx.baseUrl}/reset-password?token=${encodeURIComponent(token)}`
			})
		);
		return null;
	}
}

export async function findUserByEmail(db: DB, email: string): Promise<User | undefined> {
	const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
	return user;
}

export async function register(ctx: AccountContext, input: RegisterInput): Promise<User> {
	const settings = await getSettings(ctx.db);
	if (!settings.registrationOpen) throw new DomainError('registrationClosed');

	const email = input.email.toLowerCase();
	if (await findUserByEmail(ctx.db, email)) throw new DomainError('emailTaken', 'email');

	const passwordHash = await hashPassword(input.password);
	const [user] = await ctx.db
		.insert(users)
		.values({
			...input,
			email,
			passwordHash,
			emailVerifiedAt: ctx.skipEmailVerification ? new Date() : null
		})
		.onConflictDoNothing({ target: users.email })
		.returning();
	if (!user) throw new DomainError('emailTaken', 'email');

	if (!ctx.skipEmailVerification) await sendVerificationEmail(ctx, user);
	return user;
}

async function issueToken(
	db: DB,
	userId: string,
	purpose: 'verify_email' | 'reset_password',
	ttl: number
): Promise<string> {
	// Only the newest token of a kind stays valid.
	await db
		.delete(emailTokens)
		.where(and(eq(emailTokens.userId, userId), eq(emailTokens.purpose, purpose)));
	const token = randomToken();
	await db.insert(emailTokens).values({
		id: sha256(token),
		userId,
		purpose,
		expiresAt: new Date(Date.now() + ttl)
	});
	return token;
}

/** Validates and consumes a token. Returns the user id or null. */
async function consumeToken(
	db: DB,
	token: string,
	purpose: 'verify_email' | 'reset_password'
): Promise<string | null> {
	const [row] = await db
		.delete(emailTokens)
		.where(
			and(
				eq(emailTokens.id, sha256(token)),
				eq(emailTokens.purpose, purpose),
				gt(emailTokens.expiresAt, new Date())
			)
		)
		.returning();
	return row?.userId ?? null;
}

export async function sendVerificationEmail(ctx: AccountContext, user: User): Promise<void> {
	if (user.emailVerifiedAt) return;
	const settings = await getSettings(ctx.db);
	const token = await issueToken(ctx.db, user.id, 'verify_email', VERIFY_TTL);
	// Through the outbox like all mails: same response time, retries on failure.
	await enqueueMail(
		ctx.db,
		linkMail({
			locale: user.locale,
			to: user.email,
			name: user.firstName,
			festival: settings.festivalName,
			primaryColor: settings.primaryColor,
			subject: 'mail.verify.subject',
			body: 'mail.verify.body',
			expiry: 'mail.verify.expiry',
			link: `${ctx.baseUrl}/verify-email?token=${encodeURIComponent(token)}`
		})
	);
}

/**
 * Marks the e-mail address as verified. Returns the user, or null if the token is invalid.
 *
 * The token is deliberately *not* consumed: mail security scanners often open links before the
 * recipient does, and the person clicking afterwards should still see a success page. The token
 * only expires.
 */
export async function verifyEmail(db: DB, token: string): Promise<User | null> {
	const [row] = await db
		.select({ userId: emailTokens.userId })
		.from(emailTokens)
		.where(
			and(
				eq(emailTokens.id, sha256(token)),
				eq(emailTokens.purpose, 'verify_email'),
				gt(emailTokens.expiresAt, new Date())
			)
		);
	if (!row) return null;
	const [user] = await db.select().from(users).where(eq(users.id, row.userId));
	if (!user) return null;
	if (user.emailVerifiedAt) return user;
	const [updated] = await db
		.update(users)
		.set({ emailVerifiedAt: new Date() })
		.where(eq(users.id, row.userId))
		.returning();
	return updated;
}

/** Whether a password-reset token is currently valid (without consuming it). */
export async function isResetTokenValid(db: DB, token: string): Promise<boolean> {
	const [row] = await db
		.select({ id: emailTokens.id })
		.from(emailTokens)
		.where(
			and(
				eq(emailTokens.id, sha256(token)),
				eq(emailTokens.purpose, 'reset_password'),
				gt(emailTokens.expiresAt, new Date())
			)
		);
	return Boolean(row);
}

/** Checks credentials. Always takes roughly the same time, whether the user exists or not. */
export async function authenticate(db: DB, email: string, password: string): Promise<User> {
	const user = await findUserByEmail(db, email);
	const ok = await verifyPassword(user?.passwordHash ?? (await getDummyHash()), password);
	if (!user || !user.passwordHash || !ok) throw new DomainError('invalidCredentials');
	return user;
}

/** Sends a reset link if the account exists. Never reveals whether it does. */
export async function requestPasswordReset(ctx: AccountContext, email: string): Promise<void> {
	const user = await findUserByEmail(ctx.db, email);
	if (!user) return;
	const settings = await getSettings(ctx.db);
	const token = await issueToken(ctx.db, user.id, 'reset_password', RESET_TTL);
	await enqueueMail(
		ctx.db,
		linkMail({
			locale: user.locale,
			to: user.email,
			name: user.firstName,
			festival: settings.festivalName,
			primaryColor: settings.primaryColor,
			subject: 'mail.reset.subject',
			body: 'mail.reset.body',
			expiry: 'mail.reset.expiry',
			link: `${ctx.baseUrl}/reset-password?token=${encodeURIComponent(token)}`
		})
	);
}

/**
 * An admin creates a password-reset link for someone (no mail server, or the mail did not arrive)
 * and hands it over personally. Valid for one hour, logged; an older link stops working.
 */
export async function createResetLink(
	ctx: Pick<AccountContext, 'db' | 'baseUrl'>,
	actor: Actor,
	userId: string
): Promise<{ link: string; expiresAt: Date }> {
	const [user] = await ctx.db.select().from(users).where(eq(users.id, userId));
	if (!user || user.deletedAt) throw new DomainError('notFound');
	const token = await issueToken(ctx.db, user.id, 'reset_password', RESET_TTL);
	await ctx.db.transaction((tx) =>
		audit(tx, actor, { action: 'user.reset_link', entityType: 'user', entityId: user.id })
	);
	return {
		link: `${ctx.baseUrl}/reset-password?token=${encodeURIComponent(token)}`,
		expiresAt: new Date(Date.now() + RESET_TTL)
	};
}

export async function resetPassword(db: DB, token: string, newPassword: string): Promise<User> {
	const userId = await consumeToken(db, token, 'reset_password');
	if (!userId) throw new DomainError('invalidToken');
	const passwordHash = await hashPassword(newPassword);
	// Opening the reset link proves control over the mailbox, so the address counts as verified.
	const [user] = await db
		.update(users)
		.set({ passwordHash, emailVerifiedAt: new Date() })
		.where(eq(users.id, userId))
		.returning();
	// Whoever knew the old password may have connected an AI assistant: end those connections too.
	await invalidateUserSessions(db, userId);
	await revokeAllConnections(db, userId);
	await db.transaction((tx) =>
		audit(tx, { userId }, { action: 'user.password_reset', entityType: 'user', entityId: userId })
	);
	return user;
}

export async function changePassword(
	db: DB,
	user: User,
	currentPassword: string,
	newPassword: string
): Promise<void> {
	if (!user.passwordHash || !(await verifyPassword(user.passwordHash, currentPassword))) {
		throw new DomainError('wrongPassword', 'currentPassword');
	}
	const passwordHash = await hashPassword(newPassword);
	await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));
	await invalidateUserSessions(db, user.id);
	await revokeAllConnections(db, user.id);
}

export interface ProfileUpdate {
	firstName: string;
	lastName: string;
	phone: string;
	locale: Locale;
}

export async function updateProfile(db: DB, userId: string, update: ProfileUpdate): Promise<User> {
	const [user] = await db.update(users).set(update).where(eq(users.id, userId)).returning();
	return user;
}

export async function setLocale(db: DB, userId: string, locale: Locale): Promise<void> {
	await db.update(users).set({ locale }).where(eq(users.id, userId));
}

export async function setAdmin(
	db: DB,
	actor: Actor,
	userId: string,
	isAdmin: boolean
): Promise<void> {
	await db.transaction(async (tx) => {
		if (!isAdmin) {
			const admins = await tx.select({ id: users.id }).from(users).where(eq(users.isAdmin, true));
			if (admins.length <= 1 && admins[0]?.id === userId) throw new DomainError('lastAdmin');
		}
		const [user] = await tx.update(users).set({ isAdmin }).where(eq(users.id, userId)).returning();
		if (!user) throw new DomainError('notFound');
		await audit(tx, actor, {
			action: isAdmin ? 'user.admin_grant' : 'user.admin_revoke',
			entityType: 'user',
			entityId: userId,
			data: { email: user.email }
		});
	});
}

/** Removes expired tokens. Cheap; called opportunistically. */
export async function cleanupExpiredTokens(db: DB): Promise<void> {
	await db.delete(emailTokens).where(lt(emailTokens.expiresAt, new Date()));
}
