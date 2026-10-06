import { db } from '#lib/server/app.ts';
import { getAdminContext, requireAdmin } from '#lib/server/guards.ts';
import { listRoles, roleUsage } from '#lib/server/services/roles.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireAdmin(await getAdminContext(event));
	const [roles, usage] = await Promise.all([listRoles(db()), roleUsage(db())]);
	return { roles: roles.map((r) => ({ ...r, usage: usage.get(r.id) ?? 0 })) };
};
