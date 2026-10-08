/** Day tabs of the volunteers' shift list. Pure logic. */

/** Value of `?day=` that shows every day at once. */
export const ALL_DAYS = 'all';

export interface DaySummary {
	/** YYYY-MM-DD in the festival time zone */
	day: string;
	/** Shifts on that day (including past ones). */
	count: number;
	/** Shifts that have not started yet. */
	upcoming: number;
	/** Shifts that have not started and still have a free place. */
	bookable: number;
}

export function summariseDays(
	shifts: readonly { day: string; past: boolean; open: boolean }[]
): DaySummary[] {
	const byDay = new Map<string, DaySummary>();
	for (const s of shifts) {
		const entry = byDay.get(s.day) ?? { day: s.day, count: 0, upcoming: 0, bookable: 0 };
		entry.count++;
		if (!s.past) entry.upcoming++;
		if (s.open) entry.bookable++;
		byDay.set(s.day, entry);
	}
	return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

/**
 * The day the list shows: the requested one (or all days), else the day of a shift linked to,
 * else the next day with free places, else the next day with shifts, else the last day.
 */
export function pickDay(
	days: readonly DaySummary[],
	requested: string | null,
	focusDay: string | null
): string {
	if (requested === ALL_DAYS) return ALL_DAYS;
	const known = (day: string | null) => day !== null && days.some((d) => d.day === day);
	if (known(requested)) return requested!;
	if (known(focusDay)) return focusDay!;
	return (
		days.find((d) => d.bookable > 0)?.day ??
		days.find((d) => d.upcoming > 0)?.day ??
		days.at(-1)?.day ??
		ALL_DAYS
	);
}
