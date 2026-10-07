import { db } from '#lib/server/app.ts';
import { registerLimiter } from '#lib/server/limits.ts';
import { corsPreflight, jsonResponse, oauthErrorResponse } from '#lib/server/oauth-http.ts';
import { OAuthError, registerClient } from '#lib/server/services/oauth.ts';
import type { RequestHandler } from './$types';

/** RFC 7591 dynamic client registration (used by Claude when a connector is added). */
export const POST: RequestHandler = async (event) => {
	if (!registerLimiter.attempt(`oauth:${event.getClientAddress()}`)) {
		return jsonResponse({ error: 'too_many_requests' }, 429);
	}
	let body: { client_name?: unknown; redirect_uris?: unknown };
	try {
		body = await event.request.json();
	} catch {
		return jsonResponse({ error: 'invalid_client_metadata' }, 400);
	}
	const uris = Array.isArray(body.redirect_uris)
		? body.redirect_uris.filter((u): u is string => typeof u === 'string')
		: [];
	try {
		const client = await registerClient(db(), {
			name: typeof body.client_name === 'string' ? body.client_name : '',
			redirectUris: uris
		});
		return jsonResponse(
			{
				client_id: client.id,
				client_name: client.name,
				redirect_uris: client.redirectUris,
				grant_types: ['authorization_code', 'refresh_token'],
				response_types: ['code'],
				token_endpoint_auth_method: 'none',
				client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000)
			},
			201
		);
	} catch (e) {
		if (e instanceof OAuthError) return oauthErrorResponse(e);
		throw e;
	}
};

export const OPTIONS: RequestHandler = () => corsPreflight();
