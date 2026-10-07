import { appUrl } from './notifications.ts';
import { OAuthError } from './services/oauth.ts';

/** Endpoints used by AI assistants are called from other origins (e.g. browser-based clients). */
export const CORS_HEADERS = {
	'access-control-allow-origin': '*',
	'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
	'access-control-allow-headers':
		'authorization, content-type, mcp-protocol-version, mcp-session-id, last-event-id',
	'access-control-expose-headers': 'www-authenticate, mcp-session-id'
};

export function corsPreflight() {
	return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			'content-type': 'application/json',
			'cache-control': 'no-store',
			...CORS_HEADERS,
			...headers
		}
	});
}

export function oauthErrorResponse(e: OAuthError) {
	return jsonResponse({ error: e.error, error_description: e.description }, e.status);
}

export const MCP_PATH = '/mcp';

/** RFC 9728: tells clients which authorization server protects the MCP endpoint. */
export function protectedResourceMetadata() {
	return {
		resource: appUrl(MCP_PATH),
		authorization_servers: [appUrl('')],
		scopes_supported: ['read', 'write'],
		bearer_methods_supported: ['header'],
		resource_name: 'Wichtel'
	};
}

/** RFC 8414: endpoints and capabilities of the authorization server. */
export function authorizationServerMetadata() {
	return {
		issuer: appUrl(''),
		authorization_endpoint: appUrl('/oauth/authorize'),
		token_endpoint: appUrl('/oauth/token'),
		registration_endpoint: appUrl('/oauth/register'),
		response_types_supported: ['code'],
		grant_types_supported: ['authorization_code', 'refresh_token'],
		code_challenge_methods_supported: ['S256'],
		token_endpoint_auth_methods_supported: ['none'],
		scopes_supported: ['read', 'write']
	};
}
