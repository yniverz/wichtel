import { describe, expect, it } from 'vitest';
import { LoginGuard } from './limits.ts';

const limits = { pair: 3, address: 5, accountFree: 4, maxDelayMs: 60_000 };

describe('LoginGuard', () => {
	it('limits one address guessing one account', () => {
		const g = new LoginGuard(limits);
		for (let i = 0; i < 3; i++) g.failed('1.1.1.1', 'a@x.org', i);
		expect(g.allows('1.1.1.1', 'a@x.org', 10)).toBe(false);
		expect(g.allows('2.2.2.2', 'a@x.org', 10)).toBe(true);
		// The window passes.
		expect(g.allows('1.1.1.1', 'a@x.org', 16 * 60_000)).toBe(true);
	});

	it('limits one address trying many accounts', () => {
		const g = new LoginGuard(limits);
		for (let i = 0; i < 5; i++) g.failed('1.1.1.1', `u${i}@x.org`, i);
		expect(g.allows('1.1.1.1', 'new@x.org', 10)).toBe(false);
		// A successful login of the attacker's own account does not reset the address.
		g.succeeded('1.1.1.1', 'own@x.org');
		expect(g.allows('1.1.1.1', 'new@x.org', 10)).toBe(false);
	});

	it('slows down guessing one account from many addresses, without locking it', () => {
		const g = new LoginGuard(limits);
		for (let i = 0; i < 4; i++) g.failed(`10.0.0.${i}`, 'a@x.org', 0);
		expect(g.allows('10.0.1.1', 'a@x.org', 500)).toBe(false);
		expect(g.allows('10.0.1.1', 'a@x.org', 1000)).toBe(true);
		g.failed('10.0.1.1', 'a@x.org', 1000);
		expect(g.allows('10.0.1.2', 'a@x.org', 2500)).toBe(false);
		expect(g.allows('10.0.1.2', 'a@x.org', 3000)).toBe(true);
		g.succeeded('10.0.1.2', 'a@x.org');
		expect(g.allows('10.0.1.3', 'a@x.org', 3001)).toBe(true);
	});

	it('does not share one counter when the address is unknown', () => {
		const g = new LoginGuard(limits);
		for (let i = 0; i < 10; i++) g.failed(null, `u${i}@x.org`, i);
		expect(g.allows(null, 'someone@x.org', 20)).toBe(true);
	});
});
