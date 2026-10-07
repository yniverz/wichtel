import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from '../db/client.ts';
import { users } from '../db/schema.ts';
import { createTestDatabase } from '../testing/db.ts';
import {
	authenticateAccessToken,
	createCode,
	exchangeCode,
	isAllowedRedirect,
	listConnections,
	OAuthError,
	pkceChallenge,
	refreshTokens,
	registerClient,
	revokeConnection,
	validateAuthorization
} from './oauth.ts';

let database: Database;
beforeEach(async () => {
	database = await createTestDatabase();
});
afterEach(async () => {
	await database.close();
});

const verifier = 'v'.repeat(50);
const redirect = 'https://claude.ai/api/mcp/auth_callback';

async function setup() {
	const db = database.db;
	const [user] = await db
		.insert(users)
		.values({ email: 'lead@x.org', firstName: 'Lea', lastName: 'Lead' })
		.returning();
	const client = await registerClient(db, { name: 'Claude', redirectUris: [redirect] });
	return { db, user, client };
}

async function expectOAuthError(promise: Promise<unknown>, error: string) {
	await expect(promise).rejects.toSatisfy((e) => e instanceof OAuthError && e.error === error);
}

describe('oauth', () => {
	it('accepts https and local redirect URIs only', () => {
		expect(isAllowedRedirect(redirect)).toBe(true);
		expect(isAllowedRedirect('http://localhost:33418/callback')).toBe(true);
		expect(isAllowedRedirect('http://evil.example/cb')).toBe(false);
		expect(isAllowedRedirect('javascript:alert(1)')).toBe(false);
	});

	it('validates authorization requests', async () => {
		const { db, client } = await setup();
		const params = (extra: Record<string, string>) =>
			new URLSearchParams({
				client_id: client.id,
				redirect_uri: redirect,
				response_type: 'code',
				code_challenge: pkceChallenge(verifier),
				code_challenge_method: 'S256',
				state: 'xyz',
				...extra
			});
		expect((await validateAuthorization(db, params({}))).state).toBe('xyz');
		await expectOAuthError(
			validateAuthorization(db, params({ redirect_uri: 'https://other.example/cb' })),
			'invalid_request'
		);
		await expectOAuthError(
			validateAuthorization(db, params({ code_challenge_method: 'plain' })),
			'invalid_request'
		);
	});

	it('runs the code flow with PKCE, rotation and revocation', async () => {
		const { db, user, client } = await setup();
		const now = new Date('2026-10-08T10:00:00Z');
		const code = await createCode(
			db,
			{
				clientId: client.id,
				userId: user.id,
				redirectUri: redirect,
				codeChallenge: pkceChallenge(verifier),
				scope: 'write'
			},
			now
		);
		const input = { code, clientId: client.id, redirectUri: redirect, codeVerifier: verifier };
		await expectOAuthError(
			exchangeCode(db, { ...input, codeVerifier: 'w'.repeat(50) }, now),
			'invalid_grant'
		);

		const tokens = await exchangeCode(db, input, now);
		expect(tokens.scope).toBe('write');
		await expectOAuthError(exchangeCode(db, input, now), 'invalid_grant');

		const auth = await authenticateAccessToken(db, tokens.access_token, now);
		expect(auth?.user.id).toBe(user.id);
		expect(
			await authenticateAccessToken(db, tokens.access_token, new Date('2026-10-08T12:00:00Z'))
		).toBeNull();

		const next = await refreshTokens(
			db,
			{ refreshToken: tokens.refresh_token, clientId: client.id },
			now
		);
		await expectOAuthError(
			refreshTokens(db, { refreshToken: tokens.refresh_token, clientId: client.id }, now),
			'invalid_grant'
		);

		const [connection] = await listConnections(db, user.id, now);
		expect(connection.clientName).toBe('Claude');
		await revokeConnection(db, user.id, connection.id, now);
		expect(await authenticateAccessToken(db, next.access_token, now)).toBeNull();
		await expectOAuthError(
			refreshTokens(db, { refreshToken: next.refresh_token, clientId: client.id }, now),
			'invalid_grant'
		);
	});
});
