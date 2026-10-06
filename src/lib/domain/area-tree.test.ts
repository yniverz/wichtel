import { describe, expect, it } from 'vitest';
import { AreaTree } from './area-tree.ts';

const areas = [
	{ id: 'b', parentId: null, sortOrder: 2, nameDe: 'B' },
	{ id: 'a', parentId: null, sortOrder: 1, nameDe: 'A' },
	{ id: 'a1', parentId: 'a', sortOrder: 0, nameDe: 'A1' },
	{ id: 'a1x', parentId: 'a1', sortOrder: 0, nameDe: 'A1x' },
	{ id: 'orphan', parentId: 'missing', sortOrder: 0, nameDe: 'Orphan' }
];
const tree = new AreaTree(areas);

describe('AreaTree', () => {
	it('sorts by order and flattens depth-first (orphans become roots)', () => {
		expect(tree.flat().map((e) => `${e.area.id}:${e.depth}`)).toEqual([
			'orphan:0',
			'a:0',
			'a1:1',
			'a1x:2',
			'b:0'
		]);
	});

	it('computes lineage, path and depth', () => {
		expect(tree.lineage('a1x')).toEqual(['a1x', 'a1', 'a']);
		expect(tree.path('a1x').map((a) => a.id)).toEqual(['a', 'a1']);
		expect(tree.depth('a1x')).toBe(2);
	});

	it('finds descendants', () => {
		expect(tree.descendants('a').sort()).toEqual(['a1', 'a1x']);
		expect([...tree.covered(['a1'])].sort()).toEqual(['a1', 'a1x']);
	});

	it('prevents moves that would create cycles', () => {
		expect(tree.canMove('a', 'a1x')).toBe(false);
		expect(tree.canMove('a', 'a')).toBe(false);
		expect(tree.canMove('a1x', 'b')).toBe(true);
		expect(tree.canMove('a1', null)).toBe(true);
		expect(tree.canMove('a1', 'nope')).toBe(false);
	});

	it('survives corrupt cyclic data', () => {
		const broken = new AreaTree([
			{ id: 'x', parentId: 'y', sortOrder: 0, nameDe: 'X' },
			{ id: 'y', parentId: 'x', sortOrder: 0, nameDe: 'Y' }
		]);
		expect(broken.lineage('x')).toEqual(['x', 'y']);
	});
});
