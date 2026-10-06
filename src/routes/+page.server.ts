import { db } from '#lib/server/app.ts';
import { getCurrentEdition } from '#lib/server/services/editions.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const edition = await getCurrentEdition(db());
	return { edition: edition ? { startsOn: edition.startsOn, endsOn: edition.endsOn } : null };
};
