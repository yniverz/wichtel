import { describe, expect, it } from 'vitest';
import { AreaTree } from '#lib/domain/area-tree.ts';
import { Authz } from '#lib/domain/permissions.ts';
import type { Area } from './db/schema.ts';
import {
	canSeeShiftArea,
	dashboardScope,
	hasDashboardAccess,
	hasShiftAccess,
	planningScope
} from './shift-access.ts';

// Infrastruktur ── Aufbau      Awareness
const tree = new AreaTree([
	{ id: 'infra', parentId: null, sortOrder: 0, nameDe: 'Infrastruktur' },
	{ id: 'aufbau', parentId: 'infra', sortOrder: 0, nameDe: 'Aufbau' },
	{ id: 'awareness', parentId: null, sortOrder: 1, nameDe: 'Awareness' }
] as unknown as Area[]);
const authz = (grants: { areaId: string | null; permissions: string[] }[]) =>
	new Authz(false, grants, (id) => tree.lineage(id));

describe('staffing dashboard access', () => {
	it('dashboard.view shows the staffing of its areas, read-only', () => {
		const a = authz([{ areaId: 'infra', permissions: ['dashboard.view'] }]);
		const ctx = { authz: a, tree } as never;
		expect(hasDashboardAccess({ authz: a })).toBe(true);
		expect(dashboardScope(a, tree)).toEqual(new Set(['infra', 'aufbau']));
		// No shift planning: the shifts themselves are not linked.
		expect(hasShiftAccess(ctx)).toBe(false);
		expect(planningScope(a, tree)).toEqual(new Set());
		expect(canSeeShiftArea({ authz: a }, 'aufbau')).toBe(false);
	});

	it('edition-wide dashboard.view sees everything', () => {
		const a = authz([{ areaId: null, permissions: ['dashboard.view'] }]);
		expect(dashboardScope(a, tree)).toBe('all');
	});

	it('shift permissions keep showing the staffing, combined with dashboard.view', () => {
		const a = authz([
			{ areaId: 'awareness', permissions: ['attendance.confirm'] },
			{ areaId: 'aufbau', permissions: ['dashboard.view'] }
		]);
		expect(hasDashboardAccess({ authz: a })).toBe(true);
		expect(dashboardScope(a, tree)).toEqual(new Set(['awareness', 'aufbau']));
		expect(canSeeShiftArea({ authz: a }, 'awareness')).toBe(true);
		expect(canSeeShiftArea({ authz: a }, 'aufbau')).toBe(false);
	});

	it('other permissions show no staffing', () => {
		const a = authz([{ areaId: null, permissions: ['goodie.issue'] }]);
		expect(hasDashboardAccess({ authz: a })).toBe(false);
		expect(dashboardScope(a, tree)).toEqual(new Set());
	});
});
