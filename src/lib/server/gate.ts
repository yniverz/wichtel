import { log } from './log.ts';

/**
 * Limits how many expensive requests run at the same time. Further requests wait in line; when
 * the line is too long or the wait too long, they are turned away instead of piling up until the
 * server runs out of memory (a booking wave opening for thousands of people at once).
 */
export class Gate {
	private running = 0;
	private readonly waiting: (() => void)[] = [];

	constructor(
		private readonly limits = { concurrent: 4, queue: 200, waitMs: 20_000 },
		private readonly onTurnAway: () => void = () => {}
	) {}

	/** Runs `task` when a slot is free. Resolves to null when the request was turned away. */
	async run<T>(task: () => Promise<T>): Promise<{ value: T } | null> {
		if (this.running >= this.limits.concurrent) {
			if (this.waiting.length >= this.limits.queue || !(await this.wait())) {
				this.onTurnAway();
				return null;
			}
		} else {
			this.running++;
		}
		try {
			return { value: await task() };
		} finally {
			this.release();
		}
	}

	/** Waits for a slot; the slot is handed over by `release` (the running count stays). */
	private wait(): Promise<boolean> {
		return new Promise((resolve) => {
			const entry = () => {
				clearTimeout(timer);
				resolve(true);
			};
			const timer = setTimeout(() => {
				const index = this.waiting.indexOf(entry);
				if (index >= 0) this.waiting.splice(index, 1);
				resolve(false);
			}, this.limits.waitMs);
			this.waiting.push(entry);
		});
	}

	private release() {
		const next = this.waiting.shift();
		if (next) next();
		else this.running--;
	}

	get load() {
		return { running: this.running, waiting: this.waiting.length };
	}
}

/** Logs turned-away requests at most once a minute, so a busy server shows up in the logs. */
function reportTurnAway() {
	let count = 0;
	let since = 0;
	return () => {
		count++;
		const now = Date.now();
		if (now - since < 60_000) return;
		log.warn('server busy: requests turned away', { count });
		count = 0;
		since = now;
	};
}

/** The volunteers' shift views (shift list and home page), which work through every shift. */
export const shiftViewGate = new Gate(undefined, reportTurnAway());
