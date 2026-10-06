import {
	addDays,
	shiftInterval,
	startOfZonedDay,
	utcToZoned,
	weekdayOf,
	type IsoDate,
	type WallTime
} from './time.ts';

export interface Interval {
	startsAt: Date;
	endsAt: Date;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** Whether two intervals overlap, treating `breakMinutes` of required gap as part of each shift. */
export function overlaps(a: Interval, b: Interval, breakMinutes = 0): boolean {
	const gap = breakMinutes * MINUTE;
	return (
		a.startsAt.getTime() < b.endsAt.getTime() + gap &&
		b.startsAt.getTime() < a.endsAt.getTime() + gap
	);
}

/**
 * The cancel deadline that applies to a shift: the shift's own setting, else the closest area in
 * its lineage that sets one, else the instance default.
 */
export function effectiveCancelHours(
	shiftHours: number | null,
	lineageHours: readonly (number | null)[],
	instanceHours: number
): number {
	if (shiftHours !== null) return shiftHours;
	for (const h of lineageHours) if (h !== null) return h;
	return instanceHours;
}

/** Last moment a helper may cancel a booking themselves. */
export function cancelDeadline(startsAt: Date, hours: number): Date {
	return new Date(startsAt.getTime() - hours * HOUR);
}

export function canSelfCancel(now: Date, startsAt: Date, hours: number): boolean {
	return now.getTime() <= cancelDeadline(startsAt, hours).getTime();
}

/**
 * Attendance (check-in) can be confirmed from the start of the shift's day in the festival time
 * zone – so the volunteer desk can check people in on arrival, before the shift starts.
 */
export function checkInOpen(now: Date, startsAt: Date, timeZone: string): boolean {
	const day = utcToZoned(startsAt, timeZone).date;
	return now.getTime() >= startOfZonedDay(day, timeZone).getTime();
}

export function freeSpots(capacity: number, taken: number): number {
	return Math.max(0, capacity - taken);
}

export interface SeriesInput {
	from: IsoDate;
	to: IsoDate;
	/** 0 = Sunday … 6 = Saturday */
	weekdays: readonly number[];
	slots: readonly { start: WallTime; end: WallTime }[];
	timeZone: string;
}

export const MAX_SERIES_SHIFTS = 500;

/** Expands a series definition into concrete shift intervals, sorted by start. */
export function expandSeries(input: SeriesInput): Interval[] {
	const result: Interval[] = [];
	const days = new Set(input.weekdays);
	for (let date = input.from; date <= input.to; date = addDays(date, 1)) {
		if (!days.has(weekdayOf(date))) continue;
		for (const slot of input.slots) {
			result.push(shiftInterval(date, slot.start, slot.end, input.timeZone));
			if (result.length > MAX_SERIES_SHIFTS) return result;
		}
	}
	return result.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}
