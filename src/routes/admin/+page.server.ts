import { count, eq } from 'drizzle-orm';
import { db } from '#lib/server/app.ts';
import { DEFAULT_PRIMARY, roleAssignments, users } from '#lib/server/db/schema.ts';
import { getAdminContext } from '#lib/server/guards.ts';
import { getSettings } from '#lib/server/services/settings.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const ctx = await getAdminContext(event);
	const database = db();
	const settings = await getSettings(database);
	const [[{ users: userCount }], [{ assignments }]] = await Promise.all([
		database.select({ users: count() }).from(users),
		ctx.edition
			? database
					.select({ assignments: count() })
					.from(roleAssignments)
					.where(eq(roleAssignments.editionId, ctx.edition.id))
			: Promise.resolve([{ assignments: 0 }])
	]);
	const areaCount = ctx.tree ? ctx.tree.flat().length : 0;
	return {
		stats: { users: userCount, areas: areaCount, assignments },
		steps: {
			branding: settings.logoAssetId !== null || settings.primaryColor !== DEFAULT_PRIMARY,
			areas: areaCount > 0,
			roles: assignments > 0
		}
	};
};
