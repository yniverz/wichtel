import type { Permission } from '#lib/domain/permissions.ts';
import type { AdminContext } from './guards.ts';

/** Permissions that give access to the shift planning area. */
export const SHIFT_PERMISSIONS: Permission[] = [
	'shift.manage',
	'assignment.manage',
	'attendance.confirm'
];

export function hasShiftAccess(ctx: AdminContext): boolean {
	return SHIFT_PERMISSIONS.some((p) => ctx.authz.canSomewhere(p));
}

/** Area ids whose shifts the user may see in planning, or 'all'. */
export function shiftAreaScope(ctx: AdminContext): 'all' | Set<string> {
	if (!ctx.tree) return new Set();
	const roots: string[] = [];
	for (const p of SHIFT_PERMISSIONS) {
		const scope = ctx.authz.scopesFor(p);
		if (scope === 'all') return 'all';
		roots.push(...scope);
	}
	return ctx.tree.covered(roots);
}

export function canSeeShiftArea(ctx: AdminContext, areaId: string): boolean {
	return SHIFT_PERMISSIONS.some((p) => ctx.authz.can(p, areaId));
}

/** Areas in which the user may create or edit shifts, for `<select>` options. */
export function shiftAreaOptions(ctx: AdminContext) {
	return (ctx.tree?.flat() ?? [])
		.filter(({ area }) => ctx.authz.can('shift.manage', area.id))
		.map(({ area, depth }) => ({ id: area.id, nameDe: area.nameDe, nameEn: area.nameEn, depth }));
}
