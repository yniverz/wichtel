import { db } from '#lib/server/app.ts';
import { getSettings, publicSettings } from '#lib/server/services/settings.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const settings = publicSettings(await getSettings(db()));
	const user = locals.user;
	return {
		locale: locals.locale,
		settings,
		user: user
			? {
					id: user.id,
					email: user.email,
					firstName: user.firstName,
					lastName: user.lastName,
					isAdmin: user.isAdmin,
					emailVerified: user.emailVerifiedAt !== null
				}
			: null
	};
};
