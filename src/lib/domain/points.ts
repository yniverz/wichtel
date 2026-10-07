import { overlaps, type Interval } from './booking.ts';
import { addDays, utcToZoned, zonedToUtc, type WallTime } from './time.ts';

export interface PointRule {
	perShift: number;
	perHour: number;
}

export interface RuleOverride {
	pointsPerShift: number | null;
	pointsPerHour: number | null;
}

export interface BonusSettings {
	nightBonus: number;
	nightStart: WallTime;
	nightEnd: WallTime;
	lastMinuteBonus: number;
	lastMinuteHours: number;
}

/**
 * Each value is taken from the most specific level that sets it: position, then the areas from
 * the shift's area up to the root, then the instance default.
 */
export function resolveRule(
	position: RuleOverride,
	lineage: readonly RuleOverride[],
	instance: PointRule
): PointRule {
	const pick = (key: keyof RuleOverride, fallback: number) => {
		if (position[key] !== null) return position[key]!;
		for (const area of lineage) if (area[key] !== null) return area[key]!;
		return fallback;
	};
	return {
		perShift: pick('pointsPerShift', instance.perShift),
		perHour: pick('pointsPerHour', instance.perHour)
	};
}

/** Whether the shift overlaps the (daily, possibly overnight) night window. */
export function touchesNight(
	shift: Interval,
	start: WallTime,
	end: WallTime,
	timeZone: string
): boolean {
	if (start === end) return false;
	const first = addDays(utcToZoned(shift.startsAt, timeZone).date, -1);
	const last = utcToZoned(shift.endsAt, timeZone).date;
	for (let day = first; day <= last; day = addDays(day, 1)) {
		const window = {
			startsAt: zonedToUtc(day, start, timeZone),
			endsAt: zonedToUtc(end <= start ? addDays(day, 1) : day, end, timeZone)
		};
		if (overlaps(shift, window)) return true;
	}
	return false;
}

export interface PointsBreakdown {
	base: number;
	night: number;
	lastMinute: number;
	total: number;
}

/** Points a shift is worth for one person. Whole numbers; hours are rounded to the nearest point. */
export function shiftPoints(
	shift: Interval,
	bookedAt: Date | null,
	rule: PointRule,
	bonus: BonusSettings,
	timeZone: string
): PointsBreakdown {
	const hours = (shift.endsAt.getTime() - shift.startsAt.getTime()) / 3_600_000;
	const base = rule.perShift + Math.round(hours * rule.perHour);
	const night =
		bonus.nightBonus > 0 && touchesNight(shift, bonus.nightStart, bonus.nightEnd, timeZone)
			? bonus.nightBonus
			: 0;
	const lastMinute =
		bonus.lastMinuteBonus > 0 &&
		bookedAt !== null &&
		shift.startsAt.getTime() - bookedAt.getTime() < bonus.lastMinuteHours * 3_600_000
			? bonus.lastMinuteBonus
			: 0;
	return { base, night, lastMinute, total: base + night + lastMinute };
}

// ---------------------------------------------------------------------------
// Goodies
// ---------------------------------------------------------------------------

export type GoodieAvailability =
	'available' | 'inactive' | 'notEligible' | 'limitReached' | 'soldOut' | 'notEnoughPoints';

export interface GoodieFacts {
	active: boolean;
	price: number;
	maxPerPerson: number;
	selfServiceLimit: number | null;
	advance: boolean;
	eligible: boolean;
	/** Non-cancelled claims of this person for this goodie. */
	myCount: number;
	/** Non-cancelled self-service claims of everyone. */
	selfServiceUsed: number;
	/** Confirmed points. */
	balance: number;
	/** Points of booked, not yet confirmed shifts. */
	pending: number;
}

/** Whether a helper can pick this goodie themselves, and if not, why. */
export function goodieAvailability(f: GoodieFacts): GoodieAvailability {
	if (!f.active) return 'inactive';
	if (!f.eligible) return 'notEligible';
	if (f.myCount >= f.maxPerPerson) return 'limitReached';
	if (f.selfServiceLimit !== null && f.selfServiceUsed >= f.selfServiceLimit) return 'soldOut';
	const spendable = f.advance ? f.balance + f.pending : f.balance;
	if (spendable < f.price) return 'notEnoughPoints';
	return 'available';
}

/** A goodie restricted to areas is only for people who attended a shift in one of them. */
export function isEligible(
	requiredAreaIds: readonly string[],
	attendedAreaIds: readonly string[],
	isWithin: (areaId: string, ancestorId: string) => boolean
): boolean {
	if (requiredAreaIds.length === 0) return true;
	return attendedAreaIds.some((a) => requiredAreaIds.some((r) => isWithin(a, r)));
}
