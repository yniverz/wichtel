import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import type { DB } from '../db/client.ts';
import { appUrl } from '../notifications.ts';
import { CORS_HEADERS, jsonResponse, MCP_PATH } from '../oauth-http.ts';
import { RateLimiter } from '../rate-limit.ts';
import { authenticateAccessToken, getClient } from '../services/oauth.ts';
import { getSettings } from '../services/settings.ts';
import { canUseMcp } from './access.ts';
import { buildMcpServer } from './tools.ts';

/** Tool calls per connection and minute. */
const limiter = new RateLimiter(120, 60_000);

function unauthorized() {
	return jsonResponse({ error: 'invalid_token' }, 401, {
		'www-authenticate': `Bearer error="invalid_token", resource_metadata="${appUrl(`/.well-known/oauth-protected-resource${MCP_PATH}`)}"`
	});
}

/**
 * Handles one MCP request (Streamable HTTP, stateless): authenticates the bearer token, checks the
 * person's right to use AI assistants and runs the request against a fresh server instance.
 */
export async function handleMcpRequest(
	db: DB,
	request: Request,
	ip: string | null
): Promise<Response> {
	const header = request.headers.get('authorization') ?? '';
	const token = header.match(/^Bearer\s+(.+)$/i)?.[1];
	const auth = token ? await authenticateAccessToken(db, token) : null;
	if (!auth) return unauthorized();
	if (!(await canUseMcp(db, auth.user))) {
		return jsonResponse({ error: 'insufficient_scope', error_description: 'Not allowed.' }, 403);
	}
	if (!limiter.attempt(auth.grant.id)) return jsonResponse({ error: 'too_many_requests' }, 429);

	const client = await getClient(db, auth.grant.clientId);
	const server = buildMcpServer({
		db,
		user: auth.user,
		grant: auth.grant,
		settings: await getSettings(db),
		actor: { userId: auth.user.id, ip, via: `MCP: ${client?.name ?? 'AI assistant'}` },
		now: () => new Date()
	});
	const transport = new WebStandardStreamableHTTPServerTransport({
		sessionIdGenerator: undefined,
		enableJsonResponse: true
	});
	await server.connect(transport);
	try {
		const response = await transport.handleRequest(request);
		const headers = new Headers(response.headers);
		for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
		return new Response(response.body, { status: response.status, headers });
	} finally {
		await server.close();
	}
}
