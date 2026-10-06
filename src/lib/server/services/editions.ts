import { asc, desc, eq } from 'drizzle-orm';
import type { DB, Tx } from '../db/client.ts';
import { editions, type Edition } from '../db/schema.ts';
import { audit, diff, type Actor } from '../audit.ts';
import { DomainError } from '../errors.ts';

export interface EditionInput {
	name: string;
	startsOn: string;
	endsOn: string;
}

function assertRange(input: EditionInput) {
	if (input.endsOn < input.startsOn) throw new DomainError('invalidDateRange', 'endsOn');
}

export function listEditions(db: Tx): Promise<Edition[]> {
	return db.select().from(editions).orderBy(desc(editions.startsOn), asc(editions.name));
}

export async function getEdition(db: Tx, id: string): Promise<Edition | undefined> {
	const [row] = await db.select().from(editions).where(eq(editions.id, id));
	return row;
}

export async function getCurrentEdition(db: Tx): Promise<Edition | undefined> {
	const [row] = await db.select().from(editions).where(eq(editions.isCurrent, true));
	return row;
}

export async function createEdition(
	db: DB,
	actor: Actor,
	input: EditionInput,
	opts: { makeCurrent?: boolean } = {}
): Promise<Edition> {
	assertRange(input);
	return db.transaction(async (tx) => {
		// The first edition automatically becomes the current one.
		const makeCurrent = opts.makeCurrent || !(await getCurrentEdition(tx));
		if (makeCurrent)
			await tx.update(editions).set({ isCurrent: false }).where(eq(editions.isCurrent, true));
		const [edition] = await tx
			.insert(editions)
			.values({ ...input, isCurrent: makeCurrent })
			.returning();
		await audit(tx, actor, {
			action: 'edition.create',
			entityType: 'edition',
			entityId: edition.id,
			editionId: edition.id,
			data: { after: input }
		});
		return edition;
	});
}

export async function updateEdition(
	db: DB,
	actor: Actor,
	id: string,
	input: EditionInput
): Promise<Edition> {
	assertRange(input);
	return db.transaction(async (tx) => {
		const before = await getEdition(tx, id);
		if (!before) throw new DomainError('notFound');
		const [after] = await tx.update(editions).set(input).where(eq(editions.id, id)).returning();
		const changes = diff(before, input);
		if (changes) {
			await audit(tx, actor, {
				action: 'edition.update',
				entityType: 'edition',
				entityId: id,
				editionId: id,
				data: changes
			});
		}
		return after;
	});
}

export async function makeCurrentEdition(db: DB, actor: Actor, id: string): Promise<void> {
	await db.transaction(async (tx) => {
		const edition = await getEdition(tx, id);
		if (!edition) throw new DomainError('notFound');
		await tx.update(editions).set({ isCurrent: false }).where(eq(editions.isCurrent, true));
		await tx.update(editions).set({ isCurrent: true, archivedAt: null }).where(eq(editions.id, id));
		await audit(tx, actor, {
			action: 'edition.make_current',
			entityType: 'edition',
			entityId: id,
			editionId: id
		});
	});
}

export async function setEditionArchived(
	db: DB,
	actor: Actor,
	id: string,
	archived: boolean
): Promise<void> {
	await db.transaction(async (tx) => {
		const edition = await getEdition(tx, id);
		if (!edition) throw new DomainError('notFound');
		await tx
			.update(editions)
			.set({
				archivedAt: archived ? new Date() : null,
				isCurrent: archived ? false : edition.isCurrent
			})
			.where(eq(editions.id, id));
		await audit(tx, actor, {
			action: archived ? 'edition.archive' : 'edition.unarchive',
			entityType: 'edition',
			entityId: id,
			editionId: id
		});
	});
}
