import { describe, expect, it } from 'vitest';
import {
	goodieAvailability,
	isEligible,
	resolveRule,
	shiftPoints,
	touchesNight
} from './points.ts';

const TZ = 'Europe/Berlin';
const at = (iso: string) => new Date(iso);
const none = { pointsPerShift: null, pointsPerHour: null };
const bonus = {
	nightBonus: 0,
	nightStart: '00:00',
	nightEnd: '06:00',
	lastMinuteBonus: 0,
	lastMinuteHours: 24
};

describe('point rules', () => {
	it('takes each value from the most specific level', () => {
		const instance = { perShift: 1, perHour: 0 };
		expect(resolveRule(none, [none, none], instance)).toEqual({ perShift: 1, perHour: 0 });
		expect(
			resolveRule(
				none,
				[
					{ pointsPerShift: null, pointsPerHour: 1 },
					{ pointsPerShift: 5, pointsPerHour: 3 }
				],
				instance
			)
		).toEqual({
			perShift: 5,
			perHour: 1
		});
		expect(
			resolveRule(
				{ pointsPerShift: 3, pointsPerHour: null },
				[{ pointsPerShift: 5, pointsPerHour: null }],
				instance
			)
		).toEqual({
			perShift: 3,
			perHour: 0
		});
	});

	it('computes base points from shift and hours', () => {
		const shift = { startsAt: at('2027-06-12T08:00:00Z'), endsAt: at('2027-06-12T12:30:00Z') };
		expect(shiftPoints(shift, null, { perShift: 1, perHour: 0 }, bonus, TZ).total).toBe(1);
		expect(shiftPoints(shift, null, { perShift: 0, perHour: 1 }, bonus, TZ).total).toBe(5); // 4.5 h → 5
		expect(shiftPoints(shift, null, { perShift: 2, perHour: 2 }, bonus, TZ).total).toBe(11);
	});

	it('detects the night window, also across midnight', () => {
		// 22:00–02:00 local touches 00:00–06:00
		expect(
			touchesNight(
				{ startsAt: at('2027-06-12T20:00:00Z'), endsAt: at('2027-06-13T00:00:00Z') },
				'00:00',
				'06:00',
				TZ
			)
		).toBe(true);
		// 18:00–22:00 local does not
		expect(
			touchesNight(
				{ startsAt: at('2027-06-12T16:00:00Z'), endsAt: at('2027-06-12T20:00:00Z') },
				'00:00',
				'06:00',
				TZ
			)
		).toBe(false);
		// window 22:00–04:00 catches 21:00–23:00
		expect(
			touchesNight(
				{ startsAt: at('2027-06-12T19:00:00Z'), endsAt: at('2027-06-12T21:00:00Z') },
				'22:00',
				'04:00',
				TZ
			)
		).toBe(true);
	});

	it('adds night and last-minute bonuses', () => {
		const shift = { startsAt: at('2027-06-12T20:00:00Z'), endsAt: at('2027-06-13T00:00:00Z') };
		const b = { ...bonus, nightBonus: 2, lastMinuteBonus: 1, lastMinuteHours: 12 };
		expect(
			shiftPoints(shift, at('2027-06-12T10:00:00Z'), { perShift: 1, perHour: 0 }, b, TZ)
		).toEqual({
			base: 1,
			night: 2,
			lastMinute: 1,
			total: 4
		});
		expect(
			shiftPoints(shift, at('2027-06-10T10:00:00Z'), { perShift: 1, perHour: 0 }, b, TZ).lastMinute
		).toBe(0);
	});
});

describe('goodies', () => {
	const base = {
		active: true,
		price: 2,
		maxPerPerson: 1,
		selfServiceLimit: null,
		advance: false,
		eligible: true,
		myCount: 0,
		selfServiceUsed: 0,
		balance: 2,
		pending: 0
	};

	it('explains why a goodie cannot be picked', () => {
		expect(goodieAvailability(base)).toBe('available');
		expect(goodieAvailability({ ...base, active: false })).toBe('inactive');
		expect(goodieAvailability({ ...base, eligible: false })).toBe('notEligible');
		expect(goodieAvailability({ ...base, myCount: 1 })).toBe('limitReached');
		expect(goodieAvailability({ ...base, selfServiceLimit: 50, selfServiceUsed: 50 })).toBe(
			'soldOut'
		);
		expect(goodieAvailability({ ...base, balance: 1 })).toBe('notEnoughPoints');
		expect(goodieAvailability({ ...base, balance: 1, pending: 3, advance: true })).toBe(
			'available'
		);
	});

	it('restricts goodies to helpers of certain areas', () => {
		const within = (a: string, b: string) => a === b || (a === 'abbau-buehne' && b === 'abbau');
		expect(isEligible([], [], within)).toBe(true);
		expect(isEligible(['abbau'], ['bar'], within)).toBe(false);
		expect(isEligible(['abbau'], ['abbau-buehne'], within)).toBe(true);
	});
});
