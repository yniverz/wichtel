import { and, asc, eq } from 'drizzle-orm';
import type { DB, Tx } from '../db/client.ts';
import { editions, places, type Place } from '../db/schema.ts';
import { audit, diff, type Actor } from '../audit.ts';
import { DomainError } from '../errors.ts';
import { afterShiftChange } from './shifts.ts';

export type PlaceInput = Omit<Place, 'id' | 'editionId' | 'createdAt' | 'updatedAt'>;

export function listPlaces(db: Tx, editionId: string): Promise<Place[]> {
	return db
		.select()
		.from(places)
		.where(eq(places.editionId, editionId))
		.orderBy(asc(places.sortOrder), asc(places.nameDe));
}

/** Places for a select field. */
export async function placeOptions(db: Tx, editionId: string) {
	return (await listPlaces(db, editionId)).map((p) => ({
		id: p.id,
		nameDe: p.nameDe,
		nameEn: p.nameEn
	}));
}

export async function createPlace(db: DB, actor: Actor, editionId: string, input: PlaceInput) {
	return db.transaction(async (tx) => {
		const [place] = await tx
			.insert(places)
			.values({ ...input, editionId })
			.returning();
		await audit(tx, actor, {
			action: 'place.create',
			entityType: 'place',
			entityId: place.id,
			editionId,
			data: { after: { nameDe: place.nameDe } }
		});
		return place;
	});
}

export async function updatePlace(
	db: DB,
	actor: Actor,
	editionId: string,
	id: string,
	input: PlaceInput
) {
	await db.transaction(async (tx) => {
		const [before] = await tx
			.select()
			.from(places)
			.where(and(eq(places.id, id), eq(places.editionId, editionId)));
		if (!before) throw new DomainError('notFound');
		await tx.update(places).set(input).where(eq(places.id, id));
		const changes = diff(
			before as unknown as Record<string, unknown>,
			input as unknown as Record<string, unknown>
		);
		if (changes)
			await audit(tx, actor, {
				action: 'place.update',
				entityType: 'place',
				entityId: id,
				editionId: before.editionId,
				data: changes
			});
	});
}

/** Shifts referring to the place keep their free-text details; the link is removed. */
export async function deletePlace(db: DB, actor: Actor, editionId: string, id: string) {
	await afterShiftChange(
		db.transaction(async (tx) => {
			const [place] = await tx
				.delete(places)
				.where(and(eq(places.id, id), eq(places.editionId, editionId)))
				.returning();
			if (!place) throw new DomainError('notFound');
			await tx.update(editions).set({ deskPlaceId: null }).where(eq(editions.deskPlaceId, id));
			await audit(tx, actor, {
				action: 'place.delete',
				entityType: 'place',
				entityId: id,
				editionId: place.editionId,
				data: { before: { nameDe: place.nameDe } }
			});
		})
	);
}

export async function setSitePlan(db: DB, actor: Actor, editionId: string, assetId: string | null) {
	await db.transaction(async (tx) => {
		await tx.update(editions).set({ sitePlanAssetId: assetId }).where(eq(editions.id, editionId));
		await audit(tx, actor, {
			action: 'edition.site_plan',
			entityType: 'edition',
			entityId: editionId,
			editionId,
			data: { assetId }
		});
	});
}

export async function setDeskPlace(
	db: DB,
	actor: Actor,
	editionId: string,
	placeId: string | null
) {
	await db.transaction(async (tx) => {
		if (placeId) {
			const [place] = await tx
				.select({ editionId: places.editionId })
				.from(places)
				.where(eq(places.id, placeId));
			if (!place || place.editionId !== editionId) throw new DomainError('notFound');
		}
		await tx.update(editions).set({ deskPlaceId: placeId }).where(eq(editions.id, editionId));
		await audit(tx, actor, {
			action: 'edition.desk_place',
			entityType: 'edition',
			entityId: editionId,
			editionId,
			data: { placeId }
		});
	});
}

/** What the browser needs to show a place (name, text, pins). */
export function placeView(p: Place) {
	return {
		id: p.id,
		nameDe: p.nameDe,
		nameEn: p.nameEn,
		descriptionDe: p.descriptionDe,
		descriptionEn: p.descriptionEn,
		address: p.address,
		lat: p.lat,
		lng: p.lng,
		planX: p.planX,
		planY: p.planY
	};
}
export type PlaceView = ReturnType<typeof placeView>;
