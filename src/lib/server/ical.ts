/** Minimal iCalendar (RFC 5545) generator for a personal shift feed. */

export interface CalendarEvent {
	uid: string;
	start: Date;
	end: Date;
	summary: string;
	location?: string;
	geo?: { lat: number; lng: number };
	description?: string;
	url?: string;
	updated: Date;
}

const stamp = (d: Date) =>
	d
		.toISOString()
		.replace(/[-:]/g, '')
		.replace(/\.\d{3}/, '');

const escapeText = (s: string) =>
	s
		.replace(/\\/g, '\\\\')
		.replace(/;/g, '\\;')
		.replace(/,/g, '\\,')
		.replace(/\r\n|\r|\n/g, '\\n');

/** Lines longer than 75 octets are folded as required by the spec. */
function fold(line: string): string {
	const bytes = new TextEncoder().encode(line);
	if (bytes.length <= 75) return line;
	const parts: string[] = [];
	let current = '';
	for (const char of line) {
		if (new TextEncoder().encode(current + char).length > (parts.length ? 74 : 75)) {
			parts.push(current);
			current = '';
		}
		current += char;
	}
	parts.push(current);
	return parts.join('\r\n ');
}

export function buildCalendar(name: string, events: CalendarEvent[]): string {
	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Wichtel//Shifts//DE',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		`X-WR-CALNAME:${escapeText(name)}`,
		'X-PUBLISHED-TTL:PT1H',
		'REFRESH-INTERVAL;VALUE=DURATION:PT1H'
	];
	for (const e of events) {
		lines.push(
			'BEGIN:VEVENT',
			`UID:${e.uid}`,
			`DTSTAMP:${stamp(e.updated)}`,
			`LAST-MODIFIED:${stamp(e.updated)}`,
			`DTSTART:${stamp(e.start)}`,
			`DTEND:${stamp(e.end)}`,
			`SUMMARY:${escapeText(e.summary)}`,
			...(e.location ? [`LOCATION:${escapeText(e.location)}`] : []),
			...(e.geo ? [`GEO:${e.geo.lat};${e.geo.lng}`] : []),
			...(e.description ? [`DESCRIPTION:${escapeText(e.description)}`] : []),
			...(e.url ? [`URL:${e.url}`] : []),
			'END:VEVENT'
		);
	}
	lines.push('END:VCALENDAR');
	return lines.map(fold).join('\r\n') + '\r\n';
}
