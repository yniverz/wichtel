import { error } from '@sveltejs/kit';
import { canSeeEmails, canViewPeople } from '#lib/domain/permissions.ts';
import { db } from '#lib/server/app.ts';
import { getAdminContext } from '#lib/server/guards.ts';
import { PAGE_SIZE, searchPeople } from '#lib/server/services/people.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const ctx = await getAdminContext(event);
	const { authz } = ctx;
	if (!canViewPeople(authz)) error(403, 'error.forbidden');
	const q = event.url.searchParams.get('q') ?? '';
	const pageNo = Math.max(0, Number(event.url.searchParams.get('page') ?? 0) || 0);
	// E-mail addresses are contact data: only shown (and searched) with the matching permission.
	const showContact = canSeeEmails(authz);
	const { people, total } = await searchPeople(db(), q, pageNo, { matchEmail: showContact });
	return {
		q,
		pageNo,
		pageSize: PAGE_SIZE,
		total,
		people: people.map((p) => ({ ...p, email: showContact ? p.email : null }))
	};
};
