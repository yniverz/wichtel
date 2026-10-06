import { error } from '@sveltejs/kit';
import { db } from '#lib/server/app.ts';
import { getAdminContext } from '#lib/server/guards.ts';
import { AUDIT_PAGE_SIZE, listAuditEntries } from '#lib/server/services/audit-log.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const ctx = await getAdminContext(event);
	if (!ctx.authz.can('audit.view')) error(403, 'error.forbidden');
	const before = Number(event.url.searchParams.get('before')) || undefined;
	// Admins see everything; others only entries of the selected edition.
	const entries = await listAuditEntries(db(), {
		editionId: ctx.authz.isAdmin
			? null
			: (ctx.edition?.id ?? '00000000-0000-0000-0000-000000000000'),
		before
	});
	return { entries, hasMore: entries.length === AUDIT_PAGE_SIZE };
};
