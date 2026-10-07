import { db } from '#lib/server/app.ts';
import { requireGoodieManager } from '#lib/server/goodie-forms.ts';
import { getAdminContext, requireEdition } from '#lib/server/guards.ts';
import { claimStats, listGoodies } from '#lib/server/services/goodies.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const ctx = await getAdminContext(event);
	requireGoodieManager(ctx);
	const { edition } = requireEdition(ctx);
	const [list, stats] = await Promise.all([
		listGoodies(db(), edition.id),
		claimStats(db(), edition.id)
	]);
	return {
		goodies: list.map((g) => ({
			id: g.id,
			nameDe: g.nameDe,
			nameEn: g.nameEn,
			price: g.price,
			active: g.active,
			mandatory: g.mandatory,
			selfServiceLimit: g.selfServiceLimit,
			stock: g.stock,
			stats: stats.get(g.id) ?? {}
		}))
	};
};
