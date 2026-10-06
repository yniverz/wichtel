/**
 * Edition-scoped permissions that can be bundled into configurable roles.
 *
 * Instance-wide administration (settings, editions, role definitions, admin accounts) is not a
 * permission but reserved for users with `isAdmin`.
 */
export const PERMISSIONS = [
	'area.manage',
	'role.assign',
	'dashboard.view',
	'shift.manage',
	'assignment.manage',
	'assignment.override',
	'attendance.confirm',
	'qualification.review',
	'qualification.documents.view',
	'helper.contact.view',
	'goodie.manage',
	'goodie.issue',
	'points.adjust',
	'mail.send',
	'audit.view'
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_GROUPS: { key: string; permissions: Permission[] }[] = [
	{ key: 'structure', permissions: ['area.manage', 'role.assign', 'dashboard.view', 'audit.view'] },
	{
		key: 'shifts',
		permissions: ['shift.manage', 'assignment.manage', 'assignment.override', 'attendance.confirm']
	},
	{
		key: 'people',
		permissions: [
			'helper.contact.view',
			'qualification.review',
			'qualification.documents.view',
			'mail.send'
		]
	},
	{ key: 'rewards', permissions: ['goodie.manage', 'goodie.issue', 'points.adjust'] }
];

export function isPermission(value: string): value is Permission {
	return (PERMISSIONS as readonly string[]).includes(value);
}

/** One role assignment, reduced to what is needed for permission checks. */
export interface ScopedGrant {
	/** null = whole edition */
	areaId: string | null;
	permissions: readonly string[];
}

/**
 * Answers permission questions for one user within one edition.
 *
 * A grant on an area applies to that area and all of its descendants; a grant without area applies
 * to the whole edition. Instance admins can do everything.
 */
export class Authz {
	constructor(
		readonly isAdmin: boolean,
		private readonly grants: readonly ScopedGrant[],
		/** Returns the area itself followed by all its ancestors up to the root. */
		private readonly lineage: (areaId: string) => readonly string[]
	) {}

	/**
	 * @param areaId the area the action concerns. `undefined` asks whether the permission is held
	 * for the *whole* edition (e.g. creating a top-level area).
	 */
	can(permission: Permission, areaId?: string | null): boolean {
		if (this.isAdmin) return true;
		const scope = areaId ? new Set(this.lineage(areaId)) : null;
		return this.grants.some(
			(g) =>
				g.permissions.includes(permission) &&
				(g.areaId === null || (scope !== null && scope.has(g.areaId)))
		);
	}

	/** True if the permission is held anywhere in the edition (used e.g. to show menu entries). */
	canSomewhere(permission: Permission): boolean {
		return this.isAdmin || this.grants.some((g) => g.permissions.includes(permission));
	}

	/** Areas (roots of sub-trees) where the permission is held; `'all'` for edition-wide grants. */
	scopesFor(permission: Permission): 'all' | string[] {
		if (this.isAdmin) return 'all';
		const ids: string[] = [];
		for (const g of this.grants) {
			if (!g.permissions.includes(permission)) continue;
			if (g.areaId === null) return 'all';
			ids.push(g.areaId);
		}
		return ids;
	}

	/** Permissions the user holds at the given scope (null/undefined = whole edition). */
	effectivePermissions(areaId?: string | null): Set<Permission> {
		const result = new Set<Permission>();
		for (const p of PERMISSIONS) if (this.can(p, areaId)) result.add(p);
		return result;
	}

	/**
	 * Whether the user may hand out a role with `rolePermissions` at `areaId`. Requires `role.assign`
	 * there and every permission of the role at that scope – nobody can grant more than they have.
	 */
	canAssignRole(rolePermissions: readonly string[], areaId: string | null): boolean {
		if (this.isAdmin) return true;
		if (!this.can('role.assign', areaId)) return false;
		const own = this.effectivePermissions(areaId);
		return rolePermissions.every((p) => isPermission(p) && own.has(p));
	}

	get hasAnyGrant(): boolean {
		return this.isAdmin || this.grants.length > 0;
	}
}
