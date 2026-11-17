import { error, json } from '@sveltejs/kit';
import { canSeeEmails } from '#lib/domain/permissions.ts';
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
	const showContact = canSeeEmails(authz);
	const { people } = await searchPeople(db(), q, 0, { matchEmail: showContact });
	return json(
		people.slice(0, 8).map((p) => ({
			id: p.id,
			name: `${p.firstName} ${p.lastName}`,
			email: showContact ? p.email : null
		}))
	);
};
