import { describe, expect, it } from 'vitest';
import { AlertThrottle, errorSignature } from './alerts.ts';
import { formatEntry } from './log.ts';

const at = new Date('2027-06-01T10:00:00Z');

describe('formatEntry', () => {
	it('writes one JSON object per line', () => {
		const line = formatEntry('json', at, 'info', 'request', {
			path: '/app',
			status: 200,
			skip: undefined
		});
		expect(JSON.parse(line)).toEqual({
			time: '2027-06-01T10:00:00.000Z',
			level: 'info',
			msg: 'request',
			path: '/app',
			status: 200
		});
	});

	it('serialises errors with their stack', () => {
		const parsed = JSON.parse(
			formatEntry('json', at, 'error', 'boom', { err: new TypeError('bad') })
		);
		expect(parsed.err).toMatchObject({ name: 'TypeError', message: 'bad' });
		expect(parsed.err.stack).toContain('TypeError: bad');
	});

	it('writes readable text with multi-line values as blocks', () => {
		expect(formatEntry('text', at, 'warn', 'mail failed', { attempts: 2, note: 'a b' })).toBe(
			'10:00:00 WARN  mail failed attempts=2 note="a b"'
		);
		expect(formatEntry('text', at, 'info', 'mail', { text: 'Hi\nthere' })).toBe(
			'10:00:00 INFO  mail\ntext:\n  Hi\n  there'
		);
	});
});

describe('AlertThrottle', () => {
	it('reports the same error once per hour and caps the total', () => {
		const throttle = new AlertThrottle(2, 60_000);
		expect(throttle.allow('a', 0)).toBe(true);
		expect(throttle.allow('a', 1000)).toBe(false);
		expect(throttle.allow('b', 2000)).toBe(true);
		expect(throttle.allow('c', 3000)).toBe(false);
		expect(throttle.allow('a', 61_000)).toBe(true);
	});

	it('tells errors apart by message and place', () => {
		const make = () => new Error('x');
		expect(errorSignature(make())).toBe(errorSignature(make()));
		expect(errorSignature(new Error('x'))).not.toBe(errorSignature(new Error('y')));
	});
});
