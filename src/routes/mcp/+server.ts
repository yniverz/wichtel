import { db } from '#lib/server/app.ts';
import { handleMcpRequest } from '#lib/server/mcp/handler.ts';
import { corsPreflight, jsonResponse } from '#lib/server/oauth-http.ts';
import type { RequestHandler } from './$types';

/** MCP endpoint for AI assistants (Streamable HTTP, stateless, OAuth bearer tokens). */
export const POST: RequestHandler = (event) => {
	let ip: string | null = null;
	try {
		ip = event.getClientAddress();
	} catch {
		// not available in every environment
	}
	return handleMcpRequest(db(), event.request, ip);
};

// No server-initiated streams or sessions in stateless mode.
export const GET: RequestHandler = () =>
	jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'POST, OPTIONS' });
export const DELETE: RequestHandler = GET;
export const OPTIONS: RequestHandler = () => corsPreflight();
