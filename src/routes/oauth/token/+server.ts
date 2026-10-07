import { db } from '#lib/server/app.ts';
import { corsPreflight, jsonResponse, oauthErrorResponse } from '#lib/server/oauth-http.ts';
import { exchangeCode, OAuthError, refreshTokens } from '#lib/server/services/oauth.ts';
import type { RequestHandler } from './$types';

/** Token endpoint: authorization code (with PKCE) and refresh token grants. */
export const POST: RequestHandler = async ({ request }) => {
	let form: URLSearchParams;
	try {
		form = new URLSearchParams(await request.text());
	} catch {
		return jsonResponse({ error: 'invalid_request' }, 400);
	}
	const get = (key: string) => form.get(key) ?? '';
	try {
		switch (get('grant_type')) {
			case 'authorization_code':
				return jsonResponse(
					await exchangeCode(db(), {
						code: get('code'),
						clientId: get('client_id'),
						redirectUri: get('redirect_uri'),
						codeVerifier: get('code_verifier')
					})
				);
			case 'refresh_token':
				return jsonResponse(
					await refreshTokens(db(), {
						refreshToken: get('refresh_token'),
						clientId: get('client_id')
					})
				);
			default:
				throw new OAuthError('unsupported_grant_type', 'Unsupported grant type.');
		}
	} catch (e) {
		if (e instanceof OAuthError) return oauthErrorResponse(e);
		throw e;
	}
};

export const OPTIONS: RequestHandler = () => corsPreflight();
