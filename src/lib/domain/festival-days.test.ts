import { describe, expect, it } from 'vitest';
import { dayPhase, festivalDaysError } from './festival-days.ts';

const edition = { startsOn: '2027-07-05', endsOn: '2027-07-15' };
const festival = { festivalStartsOn: '2027-07-09', festivalEndsOn: '2027-07-10' };

describe('festival days', () => {
	it('splits an edition into build-up, festival and teardown', () => {
		expect(dayPhase('2027-07-08', festival)).toBe('build');
		expect(dayPhase('2027-07-09', festival)).toBe('festival');
		expect(dayPhase('2027-07-10', festival)).toBe('festival');
		expect(dayPhase('2027-07-11', festival)).toBe('teardown');
	});

	it('marks nothing without festival days', () => {
		expect(dayPhase('2027-07-09', { festivalStartsOn: null, festivalEndsOn: null })).toBeNull();
	});

	it('needs both days, in order and within the edition', () => {
		expect(festivalDaysError({ ...edition, ...festival })).toBeNull();
		expect(
			festivalDaysError({ ...edition, festivalStartsOn: null, festivalEndsOn: null })
		).toBeNull();
		expect(
			festivalDaysError({ ...edition, festivalStartsOn: '2027-07-09', festivalEndsOn: null })
		).toEqual({ field: 'festivalEndsOn', code: 'required' });
		expect(
			festivalDaysError({
				...edition,
				festivalStartsOn: '2027-07-10',
				festivalEndsOn: '2027-07-09'
			})
		).toEqual({ field: 'festivalEndsOn', code: 'invalidDateRange' });
		expect(
			festivalDaysError({
				...edition,
				festivalStartsOn: '2027-07-04',
				festivalEndsOn: '2027-07-09'
			})
		).toEqual({ field: 'festivalStartsOn', code: 'festivalOutsideEdition' });
	});
});
