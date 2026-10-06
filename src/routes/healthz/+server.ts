import { sql } from 'drizzle-orm';
import { db } from '#lib/server/app.ts';
import type { RequestHandler } from './$types';

/** Liveness/readiness probe for Docker and reverse proxies. */
export const GET: RequestHandler = async () => {
	try {
		await db().execute(sql`select 1`);
		return new Response('ok', { headers: { 'cache-control': 'no-store' } });
	} catch {
		return new Response('database unavailable', { status: 503 });
	}
};
