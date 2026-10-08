import { db } from '#lib/server/app.ts';
import { requireUser } from '#lib/server/guards.ts';
import { exportPersonalData } from '#lib/server/services/privacy.ts';
import type { RequestHandler } from './$types';

/** Everything stored about the signed-in person, as a JSON download (Art. 15 / 20 GDPR). */
export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	const data = await exportPersonalData(db(), user.id);
	return new Response(JSON.stringify(data, null, 2), {
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'content-disposition': `attachment; filename="wichtel-meine-daten-${new Date().toISOString().slice(0, 10)}.json"`,
			'cache-control': 'no-store'
		}
	});
};
