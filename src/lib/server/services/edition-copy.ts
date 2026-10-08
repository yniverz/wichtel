import { randomUUID } from 'node:crypto';
import { asc, eq, inArray } from 'drizzle-orm';
import { addDays, utcToZoned, zonedToUtc, type IsoDate } from '#lib/domain/time.ts';
import type { DB } from '../db/client.ts';
import {
	areas,
	bookingWaves,
	editions,
	goodies,
	places,
	roleAssignments,
	shiftPositions,
	shifts,
	type Edition
} from '../db/schema.ts';
import { audit, type Actor } from '../audit.ts';
import { DomainError } from '../errors.ts';
import { getSettings } from './settings.ts';
import { afterShiftChange } from './shifts.ts';

export interface CopyOptions {
	name: string;
	/** First day of the new edition; all dates move by the same number of days. */
	startsOn: IsoDate;
	places: boolean;
	shifts: boolean;
	goodies: boolean;
	roles: boolean;
	waves: boolean;
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
	const day = (d: IsoDate) => {
		const [y, m, dd] = d.split('-').map(Number);
		return Date.UTC(y, m - 1, dd) / 86_400_000;
	};
	return day(to) - day(from);
}

/**
 * Creates a new edition from an existing one. The area tree is always copied (with its cancel,
 * swap and point rules); everything else as chosen. All times move by whole days in the festival
 * time zone, so 18:00 stays 18:00 across daylight-saving changes. Bookings, points and goodie
 * claims are never copied.
 */
export async function copyEdition(
	db: DB,
	actor: Actor,
	sourceId: string,
	opts: CopyOptions
): Promise<Edition> {
	const { timezone } = await getSettings(db);
	return afterShiftChange(
		db.transaction(async (tx) => {
			const [source] = await tx.select().from(editions).where(eq(editions.id, sourceId));
			if (!source) throw new DomainError('notFound', 'sourceId');
			const offset = daysBetween(source.startsOn, opts.startsOn);
			const move = (instant: Date) => {
				const local = utcToZoned(instant, timezone);
				return zonedToUtc(addDays(local.date, offset), local.time, timezone);
			};

			const [edition] = await tx
				.insert(editions)
				.values({
					name: opts.name,
					startsOn: opts.startsOn,
					endsOn: addDays(source.endsOn, offset),
					isCurrent: false,
					sitePlanAssetId: opts.places ? source.sitePlanAssetId : null
				})
				.returning();

			// Areas: parents before children, so new parent ids are known.
			const areaRows = await tx
				.select()
				.from(areas)
				.where(eq(areas.editionId, source.id))
				.orderBy(asc(areas.createdAt));
			const areaMap = new Map<string, string>(areaRows.map((a) => [a.id, randomUUID()]));
			const depth = (id: string, seen = new Set<string>()): number => {
				const a = areaRows.find((r) => r.id === id);
				if (!a?.parentId || seen.has(id)) return 0;
				seen.add(id);
				return 1 + depth(a.parentId, seen);
			};
			for (const area of [...areaRows].sort((a, b) => depth(a.id) - depth(b.id))) {
				await tx.insert(areas).values({
					...area,
					id: areaMap.get(area.id)!,
					editionId: edition.id,
					parentId: area.parentId ? (areaMap.get(area.parentId) ?? null) : null,
					createdAt: undefined,
					updatedAt: undefined
				});
			}
			const mapAreas = (ids: string[]) =>
				ids.map((id) => areaMap.get(id)).filter((id): id is string => id !== undefined);

			const placeMap = new Map<string, string>();
			if (opts.places) {
				const placeRows = await tx.select().from(places).where(eq(places.editionId, source.id));
				for (const place of placeRows) {
					const id = randomUUID();
					placeMap.set(place.id, id);
					await tx.insert(places).values({
						...place,
						id,
						editionId: edition.id,
						createdAt: undefined,
						updatedAt: undefined
					});
				}
				if (source.deskPlaceId && placeMap.has(source.deskPlaceId)) {
					await tx
						.update(editions)
						.set({ deskPlaceId: placeMap.get(source.deskPlaceId)! })
						.where(eq(editions.id, edition.id));
				}
			}

			let shiftCount = 0;
			if (opts.shifts) {
				const shiftRows = await tx.select().from(shifts).where(eq(shifts.editionId, source.id));
				const positionRows = shiftRows.length
					? await tx
							.select()
							.from(shiftPositions)
							.where(
								inArray(
									shiftPositions.shiftId,
									shiftRows.map((s) => s.id)
								)
							)
					: [];
				const seriesMap = new Map<string, string>();
				for (const shift of shiftRows) {
					const id = randomUUID();
					const seriesId = shift.seriesId
						? (seriesMap.get(shift.seriesId) ??
							seriesMap.set(shift.seriesId, randomUUID()).get(shift.seriesId)!)
						: null;
					await tx.insert(shifts).values({
						...shift,
						id,
						editionId: edition.id,
						areaId: areaMap.get(shift.areaId)!,
						locationPlaceId: shift.locationPlaceId
							? (placeMap.get(shift.locationPlaceId) ?? null)
							: null,
						meetingPlaceId: shift.meetingPlaceId
							? (placeMap.get(shift.meetingPlaceId) ?? null)
							: null,
						startsAt: move(shift.startsAt),
						endsAt: move(shift.endsAt),
						seriesId,
						createdAt: undefined,
						updatedAt: undefined
					});
					const own = positionRows.filter((p) => p.shiftId === shift.id);
					if (own.length) {
						await tx.insert(shiftPositions).values(
							own.map((p) => ({
								...p,
								id: undefined,
								shiftId: id,
								urgentAt: null,
								urgentBonus: 0,
								urgentNote: ''
							}))
						);
					}
					shiftCount++;
				}
			}

			if (opts.goodies) {
				const goodieRows = await tx.select().from(goodies).where(eq(goodies.editionId, source.id));
				if (goodieRows.length) {
					await tx.insert(goodies).values(
						goodieRows.map((g) => ({
							...g,
							id: undefined,
							editionId: edition.id,
							requiredAreaIds: mapAreas(g.requiredAreaIds),
							createdAt: undefined,
							updatedAt: undefined
						}))
					);
				}
			}

			if (opts.roles) {
				const roleRows = await tx
					.select()
					.from(roleAssignments)
					.where(eq(roleAssignments.editionId, source.id));
				if (roleRows.length) {
					await tx.insert(roleAssignments).values(
						roleRows.map((r) => ({
							userId: r.userId,
							roleId: r.roleId,
							editionId: edition.id,
							areaId: r.areaId ? (areaMap.get(r.areaId) ?? null) : null,
							createdBy: actor.userId
						}))
					);
				}
			}

			if (opts.waves) {
				const waveRows = await tx
					.select()
					.from(bookingWaves)
					.where(eq(bookingWaves.editionId, source.id));
				if (waveRows.length) {
					await tx.insert(bookingWaves).values(
						waveRows.map((w) => ({
							name: w.name,
							editionId: edition.id,
							opensAt: move(w.opensAt),
							closesAt: w.closesAt ? move(w.closesAt) : null,
							areaIds: mapAreas(w.areaIds),
							audience: w.audience
						}))
					);
				}
			}

			await audit(tx, actor, {
				action: 'edition.copy',
				entityType: 'edition',
				entityId: edition.id,
				editionId: edition.id,
				data: {
					sourceId: source.id,
					offsetDays: offset,
					areas: areaRows.length,
					shifts: shiftCount,
					options: {
						places: opts.places,
						shifts: opts.shifts,
						goodies: opts.goodies,
						roles: opts.roles,
						waves: opts.waves
					}
				}
			});
			return edition;
		})
	);
}
