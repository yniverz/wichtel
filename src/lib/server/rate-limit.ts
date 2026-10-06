/**
 * Simple in-memory fixed-window rate limiter. Good enough for a single app instance; replace with a
 * shared store if Wichtel is ever scaled horizontally.
 */
export class RateLimiter {
	private readonly hits = new Map<string, { count: number; resetAt: number }>();

	constructor(
		private readonly limit: number,
		private readonly windowMs: number
	) {}

	/** Records an attempt and returns whether it is allowed. */
	attempt(key: string, now = Date.now()): boolean {
		const entry = this.hits.get(key);
		if (!entry || entry.resetAt <= now) {
			this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
			this.prune(now);
			return true;
		}
		entry.count++;
		return entry.count <= this.limit;
	}

	reset(key: string): void {
		this.hits.delete(key);
	}

	private prune(now: number) {
		if (this.hits.size < 10_000) return;
		for (const [key, entry] of this.hits) if (entry.resetAt <= now) this.hits.delete(key);
	}
}
