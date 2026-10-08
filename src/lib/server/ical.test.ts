import { describe, expect, it } from 'vitest';
import { buildCalendar } from './ical.ts';

describe('buildCalendar', () => {
	it('keeps text inside its property, whatever line breaks it contains', () => {
		const ics = buildCalendar('Fest', [
			{
				uid: 'a@wichtel',
				start: new Date('2027-06-01T10:00:00Z'),
				end: new Date('2027-06-01T12:00:00Z'),
				updated: new Date('2027-05-01T00:00:00Z'),
				summary: 'Bar\rATTENDEE:mailto:x@evil.example\nEND:VEVENT\r\nBEGIN:VEVENT'
			}
		]);
		const lines = ics.split('\r\n');
		expect(lines.filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(1);
		expect(lines.some((l) => l.startsWith('ATTENDEE'))).toBe(false);
		// No line breaks other than the separators (folded lines start with a space).
		expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
	});
});
