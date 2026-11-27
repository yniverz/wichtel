/** Festival days of an edition and the build-up/teardown days around them. Pure logic. */

export type DayPhase = 'build' | 'festival' | 'teardown';

export interface FestivalDays {
	/** YYYY-MM-DD; both null when the edition has no festival days set. */
	festivalStartsOn: string | null;
	festivalEndsOn: string | null;
}

/**
 * Which part of the edition a day belongs to: before the festival days build-up, after them
 * teardown. Null when the edition has no festival days set.
 */
export function dayPhase(day: string, edition: FestivalDays): DayPhase | null {
	const { festivalStartsOn: from, festivalEndsOn: to } = edition;
	if (!from || !to) return null;
	if (day < from) return 'build';
	if (day > to) return 'teardown';
	return 'festival';
}

/** Problems with festival days for an edition running from `startsOn` to `endsOn`. */
export function festivalDaysError(
	input: FestivalDays & { startsOn: string; endsOn: string }
): { field: 'festivalStartsOn' | 'festivalEndsOn'; code: string } | null {
	const { festivalStartsOn: from, festivalEndsOn: to } = input;
	if (!from && !to) return null;
	if (!from) return { field: 'festivalStartsOn', code: 'required' };
	if (!to) return { field: 'festivalEndsOn', code: 'required' };
	if (to < from) return { field: 'festivalEndsOn', code: 'invalidDateRange' };
	if (from < input.startsOn || to > input.endsOn)
		return {
			field: from < input.startsOn ? 'festivalStartsOn' : 'festivalEndsOn',
			code: 'festivalOutsideEdition'
		};
	return null;
}
