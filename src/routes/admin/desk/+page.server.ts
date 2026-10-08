import { db } from '#lib/server/app.ts';
import { deskAccess, involvedInEdition } from '#lib/server/desk.ts';
import { getAdminContext, requireEdition } from '#lib/server/guards.ts';
import { searchPeople } from '#lib/server/services/people.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const ctx = await getAdminContext(event);
	const access = deskAccess(ctx);
	const q = event.url.searchParams.get('q') ?? '';
	const { edition } = requireEdition(ctx);
	let people = q.trim().length >= 2 ? (await searchPeople(db(), q)).people : [];
	if (!ctx.authz.isAdmin) {
		const involved = await involvedInEdition(
			db(),
			people.map((p) => p.id),
			edition.id
		);
		people = people.filter((p) => involved.has(p.id));
	}
	people = people.slice(0, 20);
	return {
		q,
		people: people.map((p) => ({
			id: p.id,
			name: `${p.firstName} ${p.lastName}`,
			email: access.contact ? p.email : null
		}))
	};
};
