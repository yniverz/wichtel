import { RateLimiter } from './rate-limit.ts';

const MINUTE = 60 * 1000;
const WINDOW = 15 * MINUTE;

/**
 * Login protection with three counters. Only failed attempts count.
 * - per address and account: stops one client guessing one password;
 * - per address: stops one client trying many accounts (password spraying);
 * - per account, across all addresses: after many failures each further attempt has to wait a
 *   little longer (up to a minute). No hard lock, so nobody can lock others out on purpose, but
 *   guessing from many addresses becomes very slow.
 *
 * Without a known address (misconfigured proxy) only the per-account counter applies, instead of
 * everybody sharing one counter.
 */
export class LoginGuard {
	private readonly pair = new Map<string, number[]>();
	private readonly address = new Map<string, number[]>();
	private readonly account = new Map<string, number[]>();

	constructor(
		private readonly limits = { pair: 10, address: 50, accountFree: 20, maxDelayMs: MINUTE }
	) {}

	private recent(map: Map<string, number[]>, key: string, now: number) {
		const list = (map.get(key) ?? []).filter((t) => now - t < WINDOW);
		if (list.length) map.set(key, list);
		else map.delete(key);
		return list;
	}

	/** Whether an attempt may be made now. */
	allows(ip: string | null, email: string, now = Date.now()): boolean {
		if (ip && this.recent(this.pair, `${ip}:${email}`, now).length >= this.limits.pair)
			return false;
		if (ip && this.recent(this.address, ip, now).length >= this.limits.address) return false;
		const failures = this.recent(this.account, email, now);
		const over = failures.length - this.limits.accountFree;
		if (over >= 0) {
			const wait = Math.min(this.limits.maxDelayMs, 1000 * 2 ** over);
			if (now - failures[failures.length - 1] < wait) return false;
		}
		return true;
	}

	failed(ip: string | null, email: string, now = Date.now()): void {
		const add = (map: Map<string, number[]>, key: string) =>
			map.set(key, [...this.recent(map, key, now), now]);
		if (ip) {
			add(this.pair, `${ip}:${email}`);
			add(this.address, ip);
		}
		add(this.account, email);
		if (this.account.size > 10_000) this.prune(now);
	}

	/** A successful login clears the account's counters (not the address counter). */
	succeeded(ip: string | null, email: string): void {
		if (ip) this.pair.delete(`${ip}:${email}`);
		this.account.delete(email);
	}

	private prune(now: number) {
		for (const map of [this.pair, this.address, this.account])
			for (const key of map.keys()) this.recent(map, key, now);
	}
}

export const loginGuard = new LoginGuard();

/** Registrations per IP. */
export const registerLimiter = new RateLimiter(10, 60 * MINUTE);
/** E-mails triggered by a user (reset, resend verification) per IP + address. */
export const mailLimiter = new RateLimiter(5, 60 * MINUTE);
/** The same e-mails per address, from anywhere (prevents mail bombing via many IPs). */
export const mailPerAddressLimiter = new RateLimiter(10, 60 * MINUTE);
/** OAuth client registrations per IP. */
export const oauthRegisterLimiter = new RateLimiter(10, 60 * MINUTE);
