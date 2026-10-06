import { describe, expect, it } from 'vitest';
import { AreaTree } from './area-tree.ts';
import { Authz } from './permissions.ts';

// Gesamt ─┬─ Infrastruktur ── Aufbau ── Bühne
//         └─ Awareness
const tree = new AreaTree([
	{ id: 'infra', parentId: null, sortOrder: 0, nameDe: 'Infrastruktur' },
	{ id: 'aufbau', parentId: 'infra', sortOrder: 0, nameDe: 'Aufbau' },
	{ id: 'buehne', parentId: 'aufbau', sortOrder: 0, nameDe: 'Bühne' },
	{ id: 'awareness', parentId: null, sortOrder: 1, nameDe: 'Awareness' }
]);
const authz = (grants: { areaId: string | null; permissions: string[] }[], isAdmin = false) =>
	new Authz(isAdmin, grants, (id) => tree.lineage(id));

describe('Authz', () => {
	it('inherits area grants to all descendants', () => {
		const a = authz([{ areaId: 'infra', permissions: ['shift.manage'] }]);
		expect(a.can('shift.manage', 'infra')).toBe(true);
		expect(a.can('shift.manage', 'buehne')).toBe(true);
		expect(a.can('shift.manage', 'awareness')).toBe(false);
		expect(a.can('shift.manage')).toBe(false);
	});

	it('edition-wide grants apply everywhere', () => {
		const a = authz([{ areaId: null, permissions: ['attendance.confirm'] }]);
		expect(a.can('attendance.confirm')).toBe(true);
		expect(a.can('attendance.confirm', 'buehne')).toBe(true);
		expect(a.can('shift.manage', 'buehne')).toBe(false);
	});

	it('admins can do everything', () => {
		const a = authz([], true);
		expect(a.can('points.adjust')).toBe(true);
		expect(a.canAssignRole(['points.adjust'], null)).toBe(true);
	});

	it('only allows assigning roles within own permissions and scope', () => {
		const a = authz([
			{ areaId: 'aufbau', permissions: ['role.assign', 'shift.manage', 'attendance.confirm'] }
		]);
		expect(a.canAssignRole(['attendance.confirm'], 'buehne')).toBe(true);
		expect(a.canAssignRole(['attendance.confirm', 'points.adjust'], 'buehne')).toBe(false);
		expect(a.canAssignRole(['attendance.confirm'], 'awareness')).toBe(false);
		expect(a.canAssignRole(['attendance.confirm'], null)).toBe(false);
	});

	it('combines several grants', () => {
		const a = authz([
			{ areaId: 'aufbau', permissions: ['role.assign'] },
			{ areaId: 'infra', permissions: ['shift.manage'] }
		]);
		expect(a.canAssignRole(['shift.manage'], 'buehne')).toBe(true);
		expect(a.scopesFor('shift.manage')).toEqual(['infra']);
		expect(a.canSomewhere('role.assign')).toBe(true);
		expect(a.canSomewhere('goodie.issue')).toBe(false);
	});
});
