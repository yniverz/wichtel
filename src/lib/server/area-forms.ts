import { error } from '@sveltejs/kit';
import type { AreaTree } from '#lib/domain/area-tree.ts';
import type { Authz } from '#lib/domain/permissions.ts';
import type { Area } from './db/schema.ts';

/** Possible parent areas for a form: those the user may manage, minus the area's own sub-tree. */
export function parentOptions(tree: AreaTree<Area>, authz: Authz, excludeId?: string) {
	const excluded = excludeId ? new Set([excludeId, ...tree.descendants(excludeId)]) : new Set();
	return tree
		.flat()
		.filter(({ area }) => !excluded.has(area.id) && authz.can('area.manage', area.id))
		.map(({ area, depth }) => ({ id: area.id, label: area.nameDe, depth }));
}

/** Creating or moving an area below `parentId` needs `area.manage` on that parent. */
export function assertCanPlaceUnder(authz: Authz, parentId: string | null) {
	if (!authz.can('area.manage', parentId)) error(403, 'error.forbidden');
}
