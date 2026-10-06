import { db } from '#lib/server/app.ts';
import { requireUser } from '#lib/server/guards.ts';
import { getCurrentEdition } from '#lib/server/services/editions.ts';
import { loadAuthz } from '#lib/server/services/roles.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const user = requireUser(event);
	const edition = (await getCurrentEdition(db())) ?? null;
	const authz = await loadAuthz(db(), user, edition?.id ?? null);
	return {
		edition: edition && {
			id: edition.id,
			name: edition.name,
			startsOn: edition.startsOn,
			endsOn: edition.endsOn
		},
		canAdmin: authz.hasAnyGrant
	};
};
