import { error } from '@sveltejs/kit';
import { db } from '#lib/server/app.ts';
import { audit } from '#lib/server/audit.ts';
import { actorOf, getAdminContext, requireAdmin } from '#lib/server/guards.ts';
import { exportPersonalData } from '#lib/server/services/privacy.ts';
import { isDomainError } from '#lib/server/errors.ts';
import type { RequestHandler } from './$types';

/** Data export for a request by e-mail or letter (Art. 15 GDPR); admins only, and logged. */
export const GET: RequestHandler = async (event) => {
	requireAdmin(await getAdminContext(event));
	const data = await exportPersonalData(db(), event.params.id).catch((e) => {
		if (isDomainError(e)) error(404, 'error.notFound');
		throw e;
	});
	await db().transaction((tx) =>
		audit(tx, actorOf(event), {
			action: 'user.export',
			entityType: 'user',
			entityId: event.params.id
		})
	);
	return new Response(JSON.stringify(data, null, 2), {
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'content-disposition': `attachment; filename="wichtel-auskunft-${new Date().toISOString().slice(0, 10)}.json"`,
			'cache-control': 'no-store'
		}
	});
};
