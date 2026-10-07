/**
 * Protection against cross-site form submissions, equivalent to SvelteKit's built-in check (which
 * is switched off in vite.config.ts). The built-in check cannot exempt single routes, but the
 * OAuth endpoints must accept form posts from other servers (Claude), and the MCP endpoint is
 * called by other origins too. None of these use cookies, so CSRF does not apply to them.
 */
const OPEN_PATHS = ['/oauth/token', '/oauth/register', '/mcp'];
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const FORM_TYPES = ['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'];

export function isCrossSiteForm(request: Request, url: URL): boolean {
	if (!MUTATING.has(request.method)) return false;
	if (OPEN_PATHS.includes(url.pathname)) return false;
	const type = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
	if (type && !FORM_TYPES.includes(type)) return false;
	return request.headers.get('origin') !== url.origin;
}
