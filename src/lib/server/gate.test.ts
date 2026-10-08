import { afterEach, describe, expect, it, vi } from 'vitest';
import { Gate } from './gate.ts';

function deferred() {
	let resolve!: () => void;
	const promise = new Promise<void>((r) => (resolve = r));
	return { promise, resolve };
}

afterEach(() => vi.useRealTimers());

describe('Gate', () => {
	it('runs at most the allowed number of tasks at once, the rest in order', async () => {
		const gate = new Gate({ concurrent: 2, queue: 10, waitMs: 1000 });
		const order: number[] = [];
		const blockers = [deferred(), deferred(), deferred()];
		const runs = blockers.map((b, i) =>
			gate.run(async () => {
				order.push(i);
				await b.promise;
				return i;
			})
		);
		await Promise.resolve();
		expect(order).toEqual([0, 1]);
		expect(gate.load).toEqual({ running: 2, waiting: 1 });
		blockers[0].resolve();
		await runs[0];
		await Promise.resolve();
		expect(order).toEqual([0, 1, 2]);
		blockers[1].resolve();
		blockers[2].resolve();
		expect(await Promise.all(runs)).toEqual([{ value: 0 }, { value: 1 }, { value: 2 }]);
		expect(gate.load).toEqual({ running: 0, waiting: 0 });
	});

	it('turns requests away when the line is full', async () => {
		let turnedAway = 0;
		const gate = new Gate({ concurrent: 1, queue: 1, waitMs: 1000 }, () => turnedAway++);
		const block = deferred();
		const first = gate.run(() => block.promise);
		const second = gate.run(async () => 'second');
		expect(await gate.run(async () => 'third')).toBeNull();
		expect(turnedAway).toBe(1);
		block.resolve();
		await first;
		expect(await second).toEqual({ value: 'second' });
	});

	it('turns requests away after waiting too long and keeps counting right', async () => {
		vi.useFakeTimers();
		const gate = new Gate({ concurrent: 1, queue: 5, waitMs: 100 });
		const block = deferred();
		const first = gate.run(() => block.promise);
		const late = gate.run(async () => 'late');
		await vi.advanceTimersByTimeAsync(150);
		expect(await late).toBeNull();
		expect(gate.load).toEqual({ running: 1, waiting: 0 });
		block.resolve();
		await first;
		expect(gate.load).toEqual({ running: 0, waiting: 0 });
	});

	it('frees the slot when a task fails', async () => {
		const gate = new Gate({ concurrent: 1, queue: 5, waitMs: 1000 });
		await expect(gate.run(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
		expect(await gate.run(async () => 'next')).toEqual({ value: 'next' });
		expect(gate.load).toEqual({ running: 0, waiting: 0 });
	});
});
