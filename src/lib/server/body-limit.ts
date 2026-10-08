const KB = 1024;
const MB = 1024 * KB;

/** Pages whose forms carry files (logos, site plan, qualification proofs). */
const UPLOAD_ROUTES = new Set(['/admin/settings', '/admin/places', '/app/qualifications']);
/** Machine endpoints that only ever receive small JSON or form bodies. */
const SMALL_ROUTES = new Set(['/mcp', '/oauth/token', '/oauth/register']);

/**
 * Largest accepted request body for a route. The server-wide limit (`BODY_SIZE_LIMIT`, 16 MB in
 * the container) is only needed for uploads; everywhere else a large body is just a way to make
 * the server read and parse a lot of data.
 */
export function bodyLimitFor(routeId: string | null): number {
	if (routeId && UPLOAD_ROUTES.has(routeId)) return 16 * MB;
	if (routeId && SMALL_ROUTES.has(routeId)) return 256 * KB;
	return 1 * MB;
}

/** Whether the declared body is too large. Bodies without length are left to the server limit. */
export function bodyTooLarge(request: Request, routeId: string | null): boolean {
	const length = Number(request.headers.get('content-length'));
	return Number.isFinite(length) && length > bodyLimitFor(routeId);
}
