import { describe, expect, it } from 'vitest';
import {
	canCallUrgent,
	holdEnd,
	inheritedFlag,
	inviteCodeFrom,
	normaliseCode,
	swapNeedsApproval
} from './collaboration.ts';

const at = (iso: string) => new Date(iso);

describe('inheritedFlag', () => {
	it('uses the closest explicit value', () => {
		expect(inheritedFlag([null, true, false], false)).toBe(true);
		expect(inheritedFlag([false, true], true)).toBe(false);
	});
	it('falls back to the instance default', () => {
		expect(inheritedFlag([null, null], true)).toBe(true);
		expect(inheritedFlag([], false)).toBe(false);
	});
});

describe('swapNeedsApproval', () => {
	const base = {
		bookingMode: 'open' as const,
		startsAt: at('2026-07-10T10:00:00Z'),
		cancelHours: 48,
		approvalAfterDeadline: true
	};
	it('is free before the cancel deadline', () => {
		expect(swapNeedsApproval({ ...base, now: at('2026-07-07T10:00:00Z') })).toBe(false);
	});
	it('needs approval after the deadline when configured', () => {
		expect(swapNeedsApproval({ ...base, now: at('2026-07-09T10:00:00Z') })).toBe(true);
		expect(
			swapNeedsApproval({ ...base, now: at('2026-07-09T10:00:00Z'), approvalAfterDeadline: false })
		).toBe(false);
	});
	it('always needs approval for request-only positions', () => {
		expect(
			swapNeedsApproval({ ...base, bookingMode: 'request', now: at('2026-07-01T10:00:00Z') })
		).toBe(true);
	});
});

describe('holdEnd', () => {
	it('holds for the configured hours', () => {
		expect(holdEnd(at('2026-07-01T10:00:00Z'), at('2026-07-10T10:00:00Z'), 24)).toEqual(
			at('2026-07-02T10:00:00Z')
		);
	});
	it('never holds beyond the start of the shift', () => {
		expect(holdEnd(at('2026-07-10T00:00:00Z'), at('2026-07-10T10:00:00Z'), 24)).toEqual(
			at('2026-07-10T10:00:00Z')
		);
	});
});

describe('canCallUrgent', () => {
	it('allows one call per hour', () => {
		const now = at('2026-07-10T10:00:00Z');
		expect(canCallUrgent(null, now)).toBe(true);
		expect(canCallUrgent(at('2026-07-10T09:30:00Z'), now)).toBe(false);
		expect(canCallUrgent(at('2026-07-10T09:00:00Z'), now)).toBe(true);
	});
});

describe('invite codes', () => {
	it('uses only unambiguous characters', () => {
		const code = inviteCodeFrom(new Uint8Array([0, 8, 30, 31, 255, 100, 7, 13]));
		expect(code).toHaveLength(8);
		expect(code).not.toMatch(/[01OIL]/);
	});
	it('normalises user input', () => {
		expect(normaliseCode(' ab3d-ef9h ')).toBe('AB3DEF9H');
	});
});
