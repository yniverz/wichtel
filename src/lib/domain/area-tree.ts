export interface AreaNode {
	id: string;
	parentId: string | null;
	sortOrder: number;
	nameDe: string;
}

export interface TreeEntry<T extends AreaNode> {
	area: T;
	depth: number;
	children: TreeEntry<T>[];
}

/** Index over a flat list of areas of one edition. */
export class AreaTree<T extends AreaNode> {
	private readonly byId: Map<string, T>;
	private readonly childrenOf: Map<string | null, T[]>;

	constructor(areas: readonly T[]) {
		this.byId = new Map(areas.map((a) => [a.id, a]));
		this.childrenOf = new Map();
		for (const a of areas) {
			const parent = a.parentId && this.byId.has(a.parentId) ? a.parentId : null;
			const list = this.childrenOf.get(parent) ?? [];
			list.push(a);
			this.childrenOf.set(parent, list);
		}
		for (const list of this.childrenOf.values()) {
			list.sort((a, b) => a.sortOrder - b.sortOrder || a.nameDe.localeCompare(b.nameDe));
		}
	}

	get(id: string): T | undefined {
		return this.byId.get(id);
	}

	has(id: string): boolean {
		return this.byId.has(id);
	}

	children(id: string | null): readonly T[] {
		return this.childrenOf.get(id) ?? [];
	}

	/** The area itself followed by its ancestors up to the root. Robust against corrupt cycles. */
	lineage(id: string): string[] {
		const result: string[] = [];
		const seen = new Set<string>();
		let current = this.byId.get(id);
		while (current && !seen.has(current.id)) {
			seen.add(current.id);
			result.push(current.id);
			current = current.parentId ? this.byId.get(current.parentId) : undefined;
		}
		return result;
	}

	/** Ancestors from the root down to (excluding) the area itself. */
	path(id: string): T[] {
		return this.lineage(id)
			.slice(1)
			.reverse()
			.map((a) => this.byId.get(a)!);
	}

	depth(id: string): number {
		return this.lineage(id).length - 1;
	}

	/** All descendants of an area (not including itself). */
	descendants(id: string): string[] {
		const result: string[] = [];
		const stack = [...this.children(id)];
		while (stack.length) {
			const next = stack.pop()!;
			result.push(next.id);
			stack.push(...this.children(next.id));
		}
		return result;
	}

	/** Whether `id` is `ancestorId` itself or lies below it. */
	isWithin(id: string, ancestorId: string): boolean {
		return this.lineage(id).includes(ancestorId);
	}

	/** Moving `id` below `newParentId` must not create a cycle. */
	canMove(id: string, newParentId: string | null): boolean {
		if (newParentId === null) return true;
		if (!this.byId.has(newParentId)) return false;
		return !this.isWithin(newParentId, id);
	}

	/** Nested structure for rendering, depth-first and sorted. */
	nested(rootId: string | null = null, depth = 0): TreeEntry<T>[] {
		return this.children(rootId).map((area) => ({
			area,
			depth,
			children: this.nested(area.id, depth + 1)
		}));
	}

	/** Flattened, depth-first and sorted – handy for `<select>` options. */
	flat(rootId: string | null = null): { area: T; depth: number }[] {
		const out: { area: T; depth: number }[] = [];
		const walk = (entries: TreeEntry<T>[]) => {
			for (const e of entries) {
				out.push({ area: e.area, depth: e.depth });
				walk(e.children);
			}
		};
		walk(this.nested(rootId));
		return out;
	}

	/** Reduces a set of scope roots to the areas they cover (roots and descendants). */
	covered(roots: readonly string[]): Set<string> {
		const set = new Set<string>();
		for (const r of roots) {
			if (!this.byId.has(r)) continue;
			set.add(r);
			for (const d of this.descendants(r)) set.add(d);
		}
		return set;
	}
}
