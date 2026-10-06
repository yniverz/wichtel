/** Groups items by key, keeping the order in which keys first appear. */
export function groupBy<T>(items: readonly T[], key: (item: T) => string): [string, T[]][] {
	const groups: Record<string, T[]> = {};
	const order: string[] = [];
	for (const item of items) {
		const k = key(item);
		if (!groups[k]) {
			groups[k] = [];
			order.push(k);
		}
		groups[k].push(item);
	}
	return order.map((k) => [k, groups[k]]);
}
