import { describe, expect, it } from 'vitest';
import { bookingWindow, type WaveRule } from './waves.ts';

const at = (iso: string) => new Date(iso);
const person = { crew: false, returning: false, invitedWaveIds: new Set<string>() };
const wave = (w: Partial<WaveRule>): WaveRule => ({
	id: 'w',
	opensAt: at('2027-03-01T10:00:00Z'),
	closesAt: null,
	areaIds: [],
	audience: 'everyone',
	...w
});

describe('booking waves', () => {
	it('is open without waves', () => {
		expect(bookingWindow([], ['bar'], person, at('2027-01-01T00:00:00Z')).open).toBe(true);
	});

	it('opens and closes at the configured times', () => {
		const w = [wave({ closesAt: at('2027-03-10T00:00:00Z') })];
		expect(bookingWindow(w, ['bar'], person, at('2027-02-28T00:00:00Z'))).toEqual({
			open: false,
			opensAt: at('2027-03-01T10:00:00Z')
		});
		expect(bookingWindow(w, ['bar'], person, at('2027-03-05T00:00:00Z')).open).toBe(true);
		expect(bookingWindow(w, ['bar'], person, at('2027-03-11T00:00:00Z'))).toEqual({
			open: false,
			opensAt: null
		});
	});

	it('respects audience and areas', () => {
		const now = at('2027-03-05T00:00:00Z');
		const crewFirst = [
			wave({ id: 'crew', audience: 'crew', opensAt: at('2027-02-01T00:00:00Z') }),
			wave({ id: 'all', audience: 'everyone', opensAt: at('2027-04-01T00:00:00Z') })
		];
		expect(bookingWindow(crewFirst, ['bar'], { ...person, crew: true }, now).open).toBe(true);
		expect(bookingWindow(crewFirst, ['bar'], person, now)).toEqual({
			open: false,
			opensAt: at('2027-04-01T00:00:00Z')
		});

		const barOnly = [wave({ areaIds: ['bar'] })];
		expect(bookingWindow(barOnly, ['theke', 'bar'], person, now).open).toBe(true);
		expect(bookingWindow(barOnly, ['awareness'], person, now).open).toBe(false);

		const invite = [wave({ id: 'i', audience: 'invite' })];
		expect(bookingWindow(invite, ['bar'], person, now).open).toBe(false);
		expect(
			bookingWindow(invite, ['bar'], { ...person, invitedWaveIds: new Set(['i']) }, now).open
		).toBe(true);
	});
});
