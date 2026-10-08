import { createHash } from 'node:crypto';
import { and, desc, eq, gt, isNull, lt, notExists, or } from 'drizzle-orm';
import type { DB, Tx } from '../db/client.ts';
import {
	oauthClients,
	oauthCodes,
	oauthGrants,
	oauthTokens,
	users,
	type OAuthGrant,
	type User
} from '../db/schema.ts';
import { audit, SYSTEM as SYSTEM_ACTOR } from '../audit.ts';
import { randomToken, sha256 } from '../crypto.ts';
import { getSettings } from './settings.ts';

/**
 * A small OAuth 2.1 authorization server for AI assistants (MCP clients such as Claude):
 * dynamic client registration, authorization code with PKCE (S256), rotating refresh tokens.
 * Every connection ("grant") belongs to one person and acts with that person's permissions.
 */

const MINUTE = 60_000;
export const ACCESS_TOKEN_TTL = 60 * MINUTE;
export const CODE_TTL = 10 * MINUTE;
/** A connection has to be renewed after this time. */
export const GRANT_TTL = 90 * 24 * 60 * MINUTE;

export type Scope = 'read' | 'write';

export class OAuthError extends Error {
	constructor(
		readonly error: string,
		readonly description: string,
		readonly status = 400
	) {
		super(description);
	}
}

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

/** Normalises the admin's list of allowed hosts ("https://Claude.ai/" → "claude.ai"). */
export function normaliseHosts(input: string[]): string[] {
	const hosts = input
		.map((h) =>
			h
				.trim()
				.toLowerCase()
				.replace(/^https?:\/\//, '')
				.replace(/[/:].*$/, '')
				.replace(/^\*?\./, '')
		)
		.filter((h) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(h));
	return [...new Set(hosts)];
}

/**
 * Where an assistant may send people back to: https on an allowed host (or one of its
 * sub-domains), or an app on the same machine (e.g. Claude Code on localhost). Without this list,
 * anyone could register an app called "Claude" that sends the authorization code elsewhere.
 */
export function isAllowedRedirect(uri: string, allowedHosts: readonly string[]): boolean {
	try {
		const url = new URL(uri);
		if (url.hash || url.username || url.password) return false;
		if (LOCAL_HOSTS.includes(url.hostname))
			return url.protocol === 'http:' || url.protocol === 'https:';
		if (url.protocol !== 'https:') return false;
		const host = url.hostname.toLowerCase();
		return allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
	} catch {
		return false;
	}
}

export function pkceChallenge(verifier: string): string {
	return createHash('sha256').update(verifier).digest('base64url');
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export async function registerClient(db: DB, input: { name: string; redirectUris: string[] }) {
	const uris = input.redirectUris;
	const { oauthRedirectHosts } = await getSettings(db);
	if (
		uris.length === 0 ||
		uris.length > 10 ||
		!uris.every((uri) => isAllowedRedirect(uri, oauthRedirectHosts))
	) {
		throw new OAuthError(
			'invalid_redirect_uri',
			'This redirect URI is not allowed. An admin can allow its host in the settings.'
		);
	}
	const [client] = await db
		.insert(oauthClients)
		.values({
			id: randomToken(),
			name: input.name.trim().slice(0, 100) || 'MCP client',
			redirectUris: uris
		})
		.returning();
	return client;
}

export async function getClient(db: Tx, clientId: string) {
	const [client] = await db.select().from(oauthClients).where(eq(oauthClients.id, clientId));
	return client;
}

/** Checks the parameters of an authorization request; throws with a message for the person. */
export async function validateAuthorization(
	db: Tx,
	params: URLSearchParams
): Promise<{
	client: typeof oauthClients.$inferSelect;
	redirectUri: string;
	state: string;
	codeChallenge: string;
}> {
	const clientId = params.get('client_id') ?? '';
	const redirectUri = params.get('redirect_uri') ?? '';
	const client = clientId ? await getClient(db, clientId) : undefined;
	if (!client) throw new OAuthError('invalid_client', 'Unknown client.');
	if (!client.redirectUris.includes(redirectUri))
		throw new OAuthError('invalid_request', 'Redirect URI is not registered.');
	// Checked again: the admin may have narrowed the list since the app registered.
	if (!isAllowedRedirect(redirectUri, (await getSettings(db)).oauthRedirectHosts))
		throw new OAuthError('invalid_request', 'Redirect URI is not allowed.');
	if (params.get('response_type') !== 'code')
		throw new OAuthError('unsupported_response_type', 'Only the code flow is supported.');
	const codeChallenge = params.get('code_challenge') ?? '';
	if (params.get('code_challenge_method') !== 'S256' || !/^[\w-]{43,128}$/.test(codeChallenge))
		throw new OAuthError('invalid_request', 'PKCE with S256 is required.');
	return { client, redirectUri, state: params.get('state') ?? '', codeChallenge };
}

// ---------------------------------------------------------------------------
// Codes and tokens
// ---------------------------------------------------------------------------

export async function createCode(
	db: DB,
	input: {
		clientId: string;
		userId: string;
		redirectUri: string;
		codeChallenge: string;
		scope: Scope;
	},
	now = new Date()
): Promise<string> {
	const code = randomToken();
	await db.insert(oauthCodes).values({
		...input,
		codeHash: sha256(code),
		expiresAt: new Date(now.getTime() + CODE_TTL)
	});
	return code;
}

export interface TokenResponse {
	access_token: string;
	token_type: 'Bearer';
	expires_in: number;
	refresh_token: string;
	scope: Scope;
}

async function issueTokens(tx: Tx, grant: OAuthGrant, now: Date): Promise<TokenResponse> {
	const access = randomToken();
	const refresh = randomToken();
	const accessExpiry = Math.min(now.getTime() + ACCESS_TOKEN_TTL, grant.expiresAt.getTime());
	await tx.insert(oauthTokens).values([
		{
			tokenHash: sha256(access),
			grantId: grant.id,
			kind: 'access',
			expiresAt: new Date(accessExpiry)
		},
		{ tokenHash: sha256(refresh), grantId: grant.id, kind: 'refresh', expiresAt: grant.expiresAt }
	]);
	return {
		access_token: access,
		token_type: 'Bearer',
		expires_in: Math.max(1, Math.floor((accessExpiry - now.getTime()) / 1000)),
		refresh_token: refresh,
		scope: grant.scope as Scope
	};
}

/** Exchanges an authorization code (once) for tokens and creates the connection. */
export async function exchangeCode(
	db: DB,
	input: { code: string; clientId: string; redirectUri: string; codeVerifier: string },
	now = new Date()
): Promise<TokenResponse> {
	return db.transaction(async (tx) => {
		const [code] = await tx
			.delete(oauthCodes)
			.where(eq(oauthCodes.codeHash, sha256(input.code)))
			.returning();
		if (
			!code ||
			code.expiresAt.getTime() < now.getTime() ||
			code.clientId !== input.clientId ||
			code.redirectUri !== input.redirectUri ||
			pkceChallenge(input.codeVerifier) !== code.codeChallenge
		) {
			throw new OAuthError('invalid_grant', 'The code is invalid or expired.');
		}
		const [grant] = await tx
			.insert(oauthGrants)
			.values({
				userId: code.userId,
				clientId: code.clientId,
				scope: code.scope,
				expiresAt: new Date(now.getTime() + GRANT_TTL)
			})
			.returning();
		const client = await getClient(tx, code.clientId);
		await audit(
			tx,
			{ userId: code.userId },
			{
				action: 'mcp.connect',
				entityType: 'user',
				entityId: code.userId,
				data: { client: client?.name ?? code.clientId, scope: code.scope }
			}
		);
		return issueTokens(tx, grant, now);
	});
}

/**
 * Rotates a refresh token: the old one stops working. A refresh token that is presented a second
 * time was copied – the whole connection is then revoked (RFC 9700, refresh token reuse).
 */
export async function refreshTokens(
	db: DB,
	input: { refreshToken: string; clientId: string },
	now = new Date()
): Promise<TokenResponse> {
	const reused = await db.transaction(async (tx) => {
		const hash = sha256(input.refreshToken);
		const [token] = await tx
			.update(oauthTokens)
			.set({ usedAt: now })
			.where(
				and(
					eq(oauthTokens.tokenHash, hash),
					eq(oauthTokens.kind, 'refresh'),
					isNull(oauthTokens.usedAt)
				)
			)
			.returning();
		if (!token) {
			const [used] = await tx
				.select({ grantId: oauthTokens.grantId })
				.from(oauthTokens)
				.where(and(eq(oauthTokens.tokenHash, hash), eq(oauthTokens.kind, 'refresh')));
			return used?.grantId ?? 'invalid';
		}
		const [grant] = await tx.select().from(oauthGrants).where(eq(oauthGrants.id, token.grantId));
		if (
			!token ||
			!grant ||
			grant.clientId !== input.clientId ||
			grant.revokedAt ||
			token.expiresAt.getTime() < now.getTime() ||
			grant.expiresAt.getTime() < now.getTime()
		) {
			throw new OAuthError('invalid_grant', 'The refresh token is invalid or expired.');
		}
		return issueTokens(tx, grant, now);
	});
	if (typeof reused !== 'string') return reused;
	if (reused !== 'invalid') await revokeGrant(db, reused, now, 'mcp.token_reuse');
	throw new OAuthError('invalid_grant', 'The refresh token is invalid or expired.');
}

async function revokeGrant(db: DB, grantId: string, now: Date, action: string) {
	await db.transaction(async (tx) => {
		const [grant] = await tx
			.update(oauthGrants)
			.set({ revokedAt: now })
			.where(and(eq(oauthGrants.id, grantId), isNull(oauthGrants.revokedAt)))
			.returning();
		await tx.delete(oauthTokens).where(eq(oauthTokens.grantId, grantId));
		if (grant)
			await audit(tx, SYSTEM_ACTOR, {
				action,
				entityType: 'user',
				entityId: grant.userId,
				data: { grantId }
			});
	});
}

/** Ends all AI connections of a person, e.g. after a password change. */
export async function revokeAllConnections(db: DB, userId: string, now = new Date()) {
	await db.transaction(async (tx) => {
		const grants = await tx
			.update(oauthGrants)
			.set({ revokedAt: now })
			.where(and(eq(oauthGrants.userId, userId), isNull(oauthGrants.revokedAt)))
			.returning({ id: oauthGrants.id });
		for (const g of grants) await tx.delete(oauthTokens).where(eq(oauthTokens.grantId, g.id));
	});
}

/** Resolves an access token to its connection and person, or null. */
export async function authenticateAccessToken(
	db: DB,
	accessToken: string,
	now = new Date()
): Promise<{ grant: OAuthGrant; user: User } | null> {
	const [row] = await db
		.select({ grant: oauthGrants, user: users, expiresAt: oauthTokens.expiresAt })
		.from(oauthTokens)
		.innerJoin(oauthGrants, eq(oauthTokens.grantId, oauthGrants.id))
		.innerJoin(users, eq(oauthGrants.userId, users.id))
		.where(and(eq(oauthTokens.tokenHash, sha256(accessToken)), eq(oauthTokens.kind, 'access')));
	if (!row || row.grant.revokedAt || row.expiresAt.getTime() < now.getTime()) return null;
	// Remember use at most once a minute.
	if (!row.grant.lastUsedAt || now.getTime() - row.grant.lastUsedAt.getTime() > MINUTE) {
		await db.update(oauthGrants).set({ lastUsedAt: now }).where(eq(oauthGrants.id, row.grant.id));
	}
	return { grant: row.grant, user: row.user };
}

// ---------------------------------------------------------------------------
// Connections of a person
// ---------------------------------------------------------------------------

export async function listConnections(db: Tx, userId: string, now = new Date()) {
	return db
		.select({
			id: oauthGrants.id,
			clientName: oauthClients.name,
			scope: oauthGrants.scope,
			createdAt: oauthGrants.createdAt,
			lastUsedAt: oauthGrants.lastUsedAt,
			expiresAt: oauthGrants.expiresAt
		})
		.from(oauthGrants)
		.innerJoin(oauthClients, eq(oauthGrants.clientId, oauthClients.id))
		.where(
			and(
				eq(oauthGrants.userId, userId),
				isNull(oauthGrants.revokedAt),
				gt(oauthGrants.expiresAt, now)
			)
		)
		.orderBy(desc(oauthGrants.createdAt));
}

export async function revokeConnection(db: DB, userId: string, grantId: string, now = new Date()) {
	await db.transaction(async (tx) => {
		const [grant] = await tx
			.update(oauthGrants)
			.set({ revokedAt: now })
			.where(and(eq(oauthGrants.id, grantId), eq(oauthGrants.userId, userId)))
			.returning();
		if (!grant) return;
		await tx.delete(oauthTokens).where(eq(oauthTokens.grantId, grantId));
		await audit(
			tx,
			{ userId },
			{
				action: 'mcp.disconnect',
				entityType: 'user',
				entityId: userId,
				data: { grantId }
			}
		);
	});
}

/** Removes expired codes and tokens. */
export async function cleanupOAuth(db: DB, now = new Date()) {
	await db.delete(oauthCodes).where(lt(oauthCodes.expiresAt, now));
	await db.delete(oauthTokens).where(lt(oauthTokens.expiresAt, now));
	await db
		.delete(oauthGrants)
		.where(or(lt(oauthGrants.expiresAt, now), lt(oauthGrants.revokedAt, now)));
	// Apps that registered but were never connected (or no longer are) after a day.
	await db
		.delete(oauthClients)
		.where(
			and(
				lt(oauthClients.createdAt, new Date(now.getTime() - 24 * 60 * MINUTE)),
				notExists(db.select().from(oauthGrants).where(eq(oauthGrants.clientId, oauthClients.id)))
			)
		);
}
