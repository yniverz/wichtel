import { requireVerifiedUser } from '#lib/server/guards.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	requireVerifiedUser(event);
	return {};
};
