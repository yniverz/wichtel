import { describe, expect, it } from 'vitest';
import {
	excerpt,
	feedOrder,
	isPinned,
	mayPublish,
	reaches,
	type NewsTarget,
	type Reader
} from './news.ts';
import { Authz } from './permissions.ts';

// Areas: bar > tent; gate on its own.
const parents: Record<string, string | null> = { bar: null, tent: 'bar', gate: null };
const lineage = (id: string) => {
	const out = [id];
	let p = parents[id];
	while (p) {
		out.push(p);
		p = parents[p];
	}
	return out;
};
const isWithin = (id: string, ancestor: string) => lineage(id).includes(ancestor);

const target = (audience: NewsTarget['audience'], extra: Partial<NewsTarget> = {}): NewsTarget => ({
	audience,
	areaId: null,
	shiftId: null,
	roleId: null,
	...extra
});
const reader = (extra: Partial<Reader> = {}): Reader => ({
	crew: false,
	roleIds: new Set(),
	shiftIds: new Set(),
	areaIds: new Set(),
	...extra
});
const tentHelper = reader({ shiftIds: new Set(['s1']), areaIds: new Set(['tent']) });

describe('reaches', () => {
	it('shows public posts to everybody, everything else only to signed-in people', () => {
		expect(reaches(target('public'), null, isWithin)).toBe(true);
		expect(reaches(target('everyone'), null, isWithin)).toBe(false);
		expect(reaches(target('everyone'), reader(), isWithin)).toBe(true);
	});

	it('reaches helpers, crew and role holders', () => {
		expect(reaches(target('helpers'), tentHelper, isWithin)).toBe(true);
		expect(reaches(target('helpers'), reader(), isWithin)).toBe(false);
		expect(reaches(target('crew'), reader({ crew: true }), isWithin)).toBe(true);
		expect(reaches(target('crew'), tentHelper, isWithin)).toBe(false);
		const role = target('role', { roleId: 'r1' });
		expect(reaches(role, reader({ crew: true, roleIds: new Set(['r1']) }), isWithin)).toBe(true);
		expect(reaches(role, reader({ crew: true, roleIds: new Set(['r2']) }), isWithin)).toBe(false);
	});

	it('reaches the people of an area including its sub-areas, and of a shift', () => {
		expect(reaches(target('area', { areaId: 'bar' }), tentHelper, isWithin)).toBe(true);
		expect(reaches(target('area', { areaId: 'tent' }), tentHelper, isWithin)).toBe(true);
		expect(reaches(target('area', { areaId: 'gate' }), tentHelper, isWithin)).toBe(false);
		expect(reaches(target('shift', { shiftId: 's1' }), tentHelper, isWithin)).toBe(true);
		expect(reaches(target('shift', { shiftId: 's2' }), tentHelper, isWithin)).toBe(false);
	});

	it('reaches nobody once the area, shift or role is gone', () => {
		const all = reader({
			crew: true,
			roleIds: new Set(['r1']),
			shiftIds: new Set(['s1']),
			areaIds: new Set(['bar'])
		});
		expect(reaches(target('area'), all, isWithin)).toBe(false);
		expect(reaches(target('shift'), all, isWithin)).toBe(false);
		expect(reaches(target('role'), all, isWithin)).toBe(false);
	});
});

describe('mayPublish', () => {
	const admin = new Authz(true, [], lineage);
	const lead = new Authz(false, [{ areaId: null, permissions: ['mail.send'] }], lineage);
	const barLead = new Authz(false, [{ areaId: 'bar', permissions: ['mail.send'] }], lineage);
	const helper = new Authz(false, [], lineage);

	it('lets only administrators write to everybody and the public', () => {
		for (const a of ['public', 'everyone'] as const) {
			expect(mayPublish(admin, target(a))).toBe(true);
			expect(mayPublish(lead, target(a))).toBe(false);
		}
	});

	it('needs edition-wide rights for helpers, crew and roles', () => {
		for (const a of ['helpers', 'crew', 'role'] as const) {
			expect(mayPublish(lead, target(a, { roleId: 'r1' }))).toBe(true);
			expect(mayPublish(barLead, target(a, { roleId: 'r1' }))).toBe(false);
		}
	});

	it('limits area leads to their areas and the shifts in them', () => {
		expect(mayPublish(barLead, target('area', { areaId: 'tent' }))).toBe(true);
		expect(mayPublish(barLead, target('area', { areaId: 'gate' }))).toBe(false);
		expect(mayPublish(barLead, target('shift', { shiftId: 's1' }), 'tent')).toBe(true);
		expect(mayPublish(barLead, target('shift', { shiftId: 's1' }), 'gate')).toBe(false);
		expect(mayPublish(barLead, target('shift', { shiftId: 's1' }))).toBe(false);
		expect(mayPublish(helper, target('area', { areaId: 'bar' }))).toBe(false);
	});
});

describe('feed order', () => {
	const now = new Date('2027-06-10T12:00:00Z');
	const post = (id: string, published: string, pinned = false, until: string | null = null) => ({
		id,
		publishedAt: new Date(published),
		pinned,
		pinnedUntil: until ? new Date(until) : null
	});

	it('puts pinned posts first until their pin ends, then the newest', () => {
		const posts = [
			post('old-pinned', '2027-06-01T00:00:00Z', true),
			post('new', '2027-06-09T00:00:00Z'),
			post('expired-pin', '2027-06-08T00:00:00Z', true, '2027-06-09T00:00:00Z'),
			post('older', '2027-06-05T00:00:00Z')
		];
		expect(feedOrder(posts, now).map((p) => p.id)).toEqual([
			'old-pinned',
			'new',
			'expired-pin',
			'older'
		]);
		expect(isPinned(posts[2], now)).toBe(false);
	});
});

describe('excerpt', () => {
	it('keeps short text and strips Markdown marks', () => {
		expect(excerpt('# Achtung\n\n**Einlass** verschiebt sich, [Details](https://x.de).')).toEqual({
			text: 'Achtung Einlass verschiebt sich, Details.',
			more: false
		});
	});

	it('cuts long text at a word', () => {
		const result = excerpt('wort '.repeat(100), 30);
		expect(result.more).toBe(true);
		expect(result.text.endsWith('wort …')).toBe(true);
		expect(result.text.length).toBeLessThanOrEqual(32);
	});
});
