import { and, asc, eq } from 'drizzle-orm';
import { AreaTree } from '#lib/domain/area-tree.ts';
import type { DB, Tx } from '../db/client.ts';
import { areas, type Area } from '../db/schema.ts';
import { audit, diff, type Actor } from '../audit.ts';
import { DomainError } from '../errors.ts';

export interface AreaInput {
	parentId: string | null;
	nameDe: string;
	nameEn: string;
	descriptionDe: string;
	descriptionEn: string;
	sortOrder: number;
	cancelDeadlineHours: number | null;
	swapNeedsApproval?: boolean | null;
	pointsPerShift: number | null;
	pointsPerHour: number | null;
}

export function listAreas(db: Tx, editionId: string): Promise<Area[]> {
	return db
		.select()
		.from(areas)
		.where(eq(areas.editionId, editionId))
		.orderBy(asc(areas.sortOrder), asc(areas.nameDe));
}

export async function loadAreaTree(db: Tx, editionId: string): Promise<AreaTree<Area>> {
	return new AreaTree(await listAreas(db, editionId));
}

async function assertParent(tx: Tx, editionId: string, parentId: string | null) {
	if (!parentId) return;
	const [parent] = await tx
		.select({ id: areas.id })
		.from(areas)
		.where(and(eq(areas.id, parentId), eq(areas.editionId, editionId)));
	if (!parent) throw new DomainError('notFound', 'parentId');
}

export async function createArea(
	db: DB,
	actor: Actor,
	editionId: string,
	input: AreaInput
): Promise<Area> {
	return db.transaction(async (tx) => {
		await assertParent(tx, editionId, input.parentId);
		const [area] = await tx
			.insert(areas)
			.values({ ...input, editionId })
			.returning();
		await audit(tx, actor, {
			action: 'area.create',
			entityType: 'area',
			entityId: area.id,
			editionId,
			data: { after: input }
		});
		return area;
	});
}

export async function updateArea(
	db: DB,
	actor: Actor,
	editionId: string,
	id: string,
	input: AreaInput
): Promise<Area> {
	return db.transaction(async (tx) => {
		const tree = await loadAreaTree(tx, editionId);
		const before = tree.get(id);
		if (!before) throw new DomainError('notFound');
		if (input.parentId !== before.parentId) {
			await assertParent(tx, editionId, input.parentId);
			if (!tree.canMove(id, input.parentId)) throw new DomainError('areaCycle', 'parentId');
		}
		const [after] = await tx.update(areas).set(input).where(eq(areas.id, id)).returning();
		const changes = diff(before, input);
		if (changes) {
			await audit(tx, actor, {
				action: input.parentId !== before.parentId ? 'area.move' : 'area.update',
				entityType: 'area',
				entityId: id,
				editionId,
				data: changes
			});
		}
		return after;
	});
}

export async function deleteArea(
	db: DB,
	actor: Actor,
	editionId: string,
	id: string
): Promise<void> {
	await db.transaction(async (tx) => {
		const tree = await loadAreaTree(tx, editionId);
		const area = tree.get(id);
		if (!area) throw new DomainError('notFound');
		if (tree.children(id).length > 0) throw new DomainError('areaHasChildren');
		await tx.delete(areas).where(eq(areas.id, id));
		await audit(tx, actor, {
			action: 'area.delete',
			entityType: 'area',
			entityId: id,
			editionId,
			data: { before: { nameDe: area.nameDe, parentId: area.parentId } }
		});
	});
}
