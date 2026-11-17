import { db } from '#lib/server/app.ts';
import { requireUser } from '#lib/server/guards.ts';
import { getCurrentEdition } from '#lib/server/services/editions.ts';
import { unreadCount } from '#lib/server/services/news.ts';
import { adminEditions } from '#lib/server/services/roles.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const user = requireUser(event);
	// Re-run when the news were opened (they mark everything as read).
	event.depends('app:news');
	const edition = (await getCurrentEdition(db())) ?? null;
	const [editions, unreadNews] = await Promise.all([
		// A role in any edition that is not archived opens the admin area, not only the current one.
		user.isAdmin ? [] : adminEditions(db(), user),
		edition ? unreadCount(db(), user, edition.id, new Date()) : 0
	]);
	return {
		unreadNews,
		edition: edition && {
			id: edition.id,
			name: edition.name,
			startsOn: edition.startsOn,
			endsOn: edition.endsOn
		},
		canAdmin: user.isAdmin || editions.length > 0
	};
};
