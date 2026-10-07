import { error, redirect } from '@sveltejs/kit';
import { db } from '#lib/server/app.ts';
import { requireUser } from '#lib/server/guards.ts';
import { redeemInvite } from '#lib/server/services/waves.ts';
import type { PageServerLoad } from './$types';

/** Invitation link for a booking wave. Non-members are sent to log in (or sign up) first. */
export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const wave = await redeemInvite(db(), user.id, event.params.code);
	if (!wave) error(404, 'error.invalidToken');
	redirect(303, `/app/shifts?invited=${encodeURIComponent(wave.name)}`);
};
