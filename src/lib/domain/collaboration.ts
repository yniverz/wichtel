import { canSelfCancel } from './booking.ts';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** The closest explicit setting in an area lineage (own area first), else the instance default. */
export function inheritedFlag(lineage: readonly (boolean | null)[], fallback: boolean): boolean {
	for (const value of lineage) if (value !== null) return value;
	return fallback;
}

/**
 * Whether handing a booking over to someone else needs a lead's approval: always for positions
 * that are only filled on request, otherwise only after the cancel deadline if configured so.
 */
export function swapNeedsApproval(input: {
	bookingMode: 'open' | 'request';
	now: Date;
	startsAt: Date;
	cancelHours: number;
	approvalAfterDeadline: boolean;
}): boolean {
	if (input.bookingMode === 'request') return true;
	return (
		input.approvalAfterDeadline && !canSelfCancel(input.now, input.startsAt, input.cancelHours)
	);
}

/** End of a place reserved for a group member: the configured time, but at the latest the start. */
export function holdEnd(now: Date, startsAt: Date, hours: number): Date {
	return new Date(Math.min(now.getTime() + hours * HOUR, startsAt.getTime()));
}

/** Minimum time between two urgent calls for the same position, so nobody gets flooded. */
export const URGENT_COOLDOWN_MINUTES = 60;

export function canCallUrgent(lastCall: Date | null, now: Date): boolean {
	return !lastCall || now.getTime() - lastCall.getTime() >= URGENT_COOLDOWN_MINUTES * MINUTE;
}

/** Readable invite codes: no 0/O, 1/I/L. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function inviteCodeFrom(bytes: Uint8Array): string {
	return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

/** Normalises user input of a code ("abcd-efgh" → "ABCDEFGH"). */
export function normaliseCode(input: string): string {
	return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}
