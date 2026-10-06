import { error } from '@sveltejs/kit';
import { db } from '#lib/server/app.ts';
import { getAdminContext } from '#lib/server/guards.ts';
import { PAGE_SIZE, searchPeople } from '#lib/server/services/people.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const ctx = await getAdminContext(event);
	const { authz } = ctx;
	if (!(
		authz.isAdmin ||
		authz.canSomewhere('role.assign') ||
		authz.canSomewhere('helper.contact.view')
	)) {
		error(403, 'error.forbidden');
	}
	const q = event.url.searchParams.get('q') ?? '';
	const pageNo = Math.max(0, Number(event.url.searchParams.get('page') ?? 0) || 0);
	const { people, total } = await searchPeople(db(), q, pageNo);
	// E-mail addresses are contact data: only shown with the matching permission.
	const showContact = authz.isAdmin || authz.can('helper.contact.view');
	return {
		q,
		pageNo,
		pageSize: PAGE_SIZE,
		total,
		people: people.map((p) => ({ ...p, email: showContact ? p.email : null }))
	};
};
