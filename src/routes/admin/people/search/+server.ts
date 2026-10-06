import { error, json } from '@sveltejs/kit';
import { db } from '#lib/server/app.ts';
import { getAdminContext } from '#lib/server/guards.ts';
import { searchPeople } from '#lib/server/services/people.ts';
import type { RequestHandler } from './$types';

/** Person picker for leads (adding people to shifts, assigning roles). */
export const GET: RequestHandler = async (event) => {
	const ctx = await getAdminContext(event);
	const { authz } = ctx;
	if (!(
		authz.isAdmin ||
		authz.canSomewhere('assignment.manage') ||
		authz.canSomewhere('role.assign')
	)) {
		error(403, 'error.forbidden');
	}
	const q = event.url.searchParams.get('q') ?? '';
	if (q.trim().length < 2) return json([]);
	const showContact = authz.isAdmin || authz.can('helper.contact.view');
	const { people } = await searchPeople(db(), q);
	return json(
		people.slice(0, 8).map((p) => ({
			id: p.id,
			name: `${p.firstName} ${p.lastName}`,
			email: showContact ? p.email : null
		}))
	);
};
