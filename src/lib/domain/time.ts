/**
 * Time zone helpers without external libraries. Shift times are stored as UTC instants; people
 * enter and read them as wall-clock times in the festival's time zone (instance setting).
 */

export type IsoDate = string; // YYYY-MM-DD
export type WallTime = string; // HH:MM

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
	let f = partsFormatters.get(timeZone);
	if (!f) {
		f = new Intl.DateTimeFormat('en-US', {
			timeZone,
			hourCycle: 'h23',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
		partsFormatters.set(timeZone, f);
	}
	return f;
}

function zonedFields(instant: Date, timeZone: string) {
	const parts = partsFormatter(timeZone).formatToParts(instant);
	const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
	return {
		year: get('year'),
		month: get('month'),
		day: get('day'),
		hour: get('hour'),
		minute: get('minute'),
		second: get('second')
	};
}

/** Offset of the time zone from UTC at the given instant, in milliseconds. */
function offsetAt(instant: Date, timeZone: string): number {
	const f = zonedFields(instant, timeZone);
	const asUtc = Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute, f.second);
	return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function isIsoDate(value: string): boolean {
	return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function isWallTime(value: string): boolean {
	return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** Converts a wall-clock date and time in `timeZone` to a UTC instant. */
export function zonedToUtc(date: IsoDate, time: WallTime, timeZone: string): Date {
	const [y, m, d] = date.split('-').map(Number);
	const [hh, mm] = time.split(':').map(Number);
	const guess = Date.UTC(y, m - 1, d, hh, mm);
	const first = offsetAt(new Date(guess), timeZone);
	let result = guess - first;
	// Around DST changes the offset at the result can differ from the guess; one correction suffices.
	const second = offsetAt(new Date(result), timeZone);
	if (second !== first) result = guess - second;
	return new Date(result);
}

/** Wall-clock date and time of a UTC instant in `timeZone`. */
export function utcToZoned(instant: Date, timeZone: string): { date: IsoDate; time: WallTime } {
	const f = zonedFields(instant, timeZone);
	return {
		date: `${f.year}-${pad(f.month)}-${pad(f.day)}`,
		time: `${pad(f.hour)}:${pad(f.minute)}`
	};
}

export function addDays(date: IsoDate, days: number): IsoDate {
	const [y, m, d] = date.split('-').map(Number);
	const next = new Date(Date.UTC(y, m - 1, d + days));
	return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

/** 0 = Sunday … 6 = Saturday */
export function weekdayOf(date: IsoDate): number {
	const [y, m, d] = date.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Start (00:00) of the given day in `timeZone`. */
export function startOfZonedDay(date: IsoDate, timeZone: string): Date {
	return zonedToUtc(date, '00:00', timeZone);
}

/**
 * Turns "date + start time + end time" into an interval. An end time at or before the start time
 * means the shift ends on the following day (e.g. 22:00–02:00).
 */
export function shiftInterval(
	date: IsoDate,
	start: WallTime,
	end: WallTime,
	timeZone: string
): { startsAt: Date; endsAt: Date } {
	const endDate = end <= start ? addDays(date, 1) : date;
	return {
		startsAt: zonedToUtc(date, start, timeZone),
		endsAt: zonedToUtc(endDate, end, timeZone)
	};
}
