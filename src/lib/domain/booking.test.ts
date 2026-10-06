import { describe, expect, it } from 'vitest';
import {
	canSelfCancel,
	checkInOpen,
	effectiveCancelHours,
	expandSeries,
	overlaps
} from './booking.ts';
import { shiftInterval, utcToZoned, zonedToUtc } from './time.ts';

const TZ = 'Europe/Berlin';
const at = (iso: string) => new Date(iso);

describe('time zones', () => {
	it('converts wall-clock time to UTC, including DST', () => {
		expect(zonedToUtc('2027-01-15', '18:00', TZ).toISOString()).toBe('2027-01-15T17:00:00.000Z');
		expect(zonedToUtc('2027-06-15', '18:00', TZ).toISOString()).toBe('2027-06-15T16:00:00.000Z');
		// 2027-03-28 is the spring-forward day in Germany
		expect(zonedToUtc('2027-03-28', '12:00', TZ).toISOString()).toBe('2027-03-28T10:00:00.000Z');
		expect(utcToZoned(at('2027-06-15T16:00:00Z'), TZ)).toEqual({
			date: '2027-06-15',
			time: '18:00'
		});
	});

	it('treats an end time before the start as the next day', () => {
		const { startsAt, endsAt } = shiftInterval('2027-06-12', '22:00', '02:00', TZ);
		expect(startsAt.toISOString()).toBe('2027-06-12T20:00:00.000Z');
		expect(endsAt.toISOString()).toBe('2027-06-13T00:00:00.000Z');
	});
});

describe('booking rules', () => {
	const a = { startsAt: at('2027-06-12T10:00:00Z'), endsAt: at('2027-06-12T14:00:00Z') };

	it('detects overlaps and required breaks', () => {
		const touching = { startsAt: at('2027-06-12T14:00:00Z'), endsAt: at('2027-06-12T16:00:00Z') };
		const inside = { startsAt: at('2027-06-12T11:00:00Z'), endsAt: at('2027-06-12T12:00:00Z') };
		expect(overlaps(a, touching)).toBe(false);
		expect(overlaps(a, touching, 30)).toBe(true);
		expect(overlaps(a, inside)).toBe(true);
		expect(overlaps(inside, a)).toBe(true);
	});

	it('resolves the cancel deadline from shift, areas or instance', () => {
		expect(effectiveCancelHours(12, [24, 72], 48)).toBe(12);
		expect(effectiveCancelHours(null, [null, 72], 48)).toBe(72);
		expect(effectiveCancelHours(null, [], 48)).toBe(48);
	});

	it('allows self-cancel only before the deadline', () => {
		expect(canSelfCancel(at('2027-06-10T09:59:00Z'), a.startsAt, 48)).toBe(true);
		expect(canSelfCancel(at('2027-06-10T10:01:00Z'), a.startsAt, 48)).toBe(false);
	});

	it('opens check-in at the start of the shift day', () => {
		const evening = { startsAt: at('2027-06-12T18:00:00Z') };
		expect(checkInOpen(at('2027-06-11T21:59:00Z'), evening.startsAt, TZ)).toBe(false);
		expect(checkInOpen(at('2027-06-11T22:00:00Z'), evening.startsAt, TZ)).toBe(true);
	});

	it('expands series by weekday and time slots', () => {
		const shifts = expandSeries({
			from: '2027-06-07', // Monday
			to: '2027-06-13',
			weekdays: [5, 6], // Friday, Saturday
			slots: [
				{ start: '18:00', end: '22:00' },
				{ start: '22:00', end: '02:00' }
			],
			timeZone: TZ
		});
		expect(shifts).toHaveLength(4);
		expect(utcToZoned(shifts[0].startsAt, TZ)).toEqual({ date: '2027-06-11', time: '18:00' });
		expect(utcToZoned(shifts[3].endsAt, TZ)).toEqual({ date: '2027-06-13', time: '02:00' });
	});
});
