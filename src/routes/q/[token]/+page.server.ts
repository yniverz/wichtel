import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/app.ts';
import { users } from '#lib/server/db/schema.ts';
import { requireUser } from '#lib/server/guards.ts';
import { getCurrentEdition } from '#lib/server/services/editions.ts';
import { loadAuthz } from '#lib/server/services/roles.ts';
import type { PageServerLoad } from './$types';

/**
 * Target of the personal QR code. Desk staff land on the person's desk page; the owner lands on
 * their own goodies page; everyone else gets nothing.
 */
export const load: PageServerLoad = async (event) => {
	const viewer = requireUser(event);
	const [person] = await db()
		.select({ id: users.id })
		.from(users)
		.where(eq(users.qrToken, event.params.token));
	if (!person) error(404, 'error.qrUnknown');

	const edition = await getCurrentEdition(db());
	const authz = await loadAuthz(db(), viewer, edition?.id ?? null);
	if (authz.canSomewhere('goodie.issue') || authz.canSomewhere('attendance.confirm')) {
		redirect(303, `/admin/desk/${person.id}`);
	}
	if (person.id === viewer.id) redirect(303, '/app/goodies');
	error(404, 'error.qrUnknown');
};
