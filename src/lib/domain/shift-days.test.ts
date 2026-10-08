import { describe, expect, it } from 'vitest';
import { ALL_DAYS, pickDay, summariseDays } from './shift-days.ts';

const days = summariseDays([
	{ day: '2027-06-03', past: true, open: false },
	{ day: '2027-06-01', past: true, open: false },
	{ day: '2027-06-04', past: false, open: false },
	{ day: '2027-06-05', past: false, open: true },
	{ day: '2027-06-05', past: false, open: false }
]);

describe('summariseDays', () => {
	it('counts shifts per day in date order', () => {
		expect(days).toEqual([
			{ day: '2027-06-01', count: 1, upcoming: 0, bookable: 0 },
			{ day: '2027-06-03', count: 1, upcoming: 0, bookable: 0 },
			{ day: '2027-06-04', count: 1, upcoming: 1, bookable: 0 },
			{ day: '2027-06-05', count: 2, upcoming: 2, bookable: 1 }
		]);
	});
});

describe('pickDay', () => {
	it('defaults to the next day with free places', () => {
		expect(pickDay(days, null, null)).toBe('2027-06-05');
	});

	it('falls back to the next day with shifts, then to the last day', () => {
		const full = summariseDays([
			{ day: '2027-06-01', past: true, open: false },
			{ day: '2027-06-02', past: false, open: false }
		]);
		expect(pickDay(full, null, null)).toBe('2027-06-02');
		const over = summariseDays([
			{ day: '2027-06-01', past: true, open: false },
			{ day: '2027-06-02', past: true, open: false }
		]);
		expect(pickDay(over, null, null)).toBe('2027-06-02');
		expect(pickDay([], null, null)).toBe(ALL_DAYS);
	});

	it('honours a requested day, all days, and the day of a linked shift', () => {
		expect(pickDay(days, '2027-06-01', null)).toBe('2027-06-01');
		expect(pickDay(days, ALL_DAYS, '2027-06-01')).toBe(ALL_DAYS);
		expect(pickDay(days, null, '2027-06-03')).toBe('2027-06-03');
		expect(pickDay(days, '2027-06-04', '2027-06-03')).toBe('2027-06-04');
	});

	it('ignores days without shifts and malformed values', () => {
		expect(pickDay(days, '2027-06-02', null)).toBe('2027-06-05');
		expect(pickDay(days, 'nonsense', 'other')).toBe('2027-06-05');
	});
});
