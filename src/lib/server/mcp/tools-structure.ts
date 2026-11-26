import { z } from 'zod';
import { utcToZoned, zonedToUtc } from '#lib/domain/time.ts';
import { appUrl } from '../notifications.ts';
import { deleteArea, updateArea } from '../services/areas.ts';
import { deletePlace, listPlaces, setDeskPlace, updatePlace } from '../services/places.ts';
import { createWave, deleteWave, listWaves, updateWave } from '../services/waves.ts';
import { editionParam, isoDate, ToolError, wallTime, type Kit } from './kit.ts';

/** Area and place settings beyond the name (shared by create and update). */
export const areaRulesShape = {
	nameEn: z.string().max(100).optional(),
	description: z.string().max(2000).optional(),
	descriptionEn: z.string().max(2000).optional(),
	sortOrder: z.number().int().min(-9999).max(9999).optional(),
	cancelDeadlineHours: z
		.number()
		.int()
		.min(0)
		.max(24 * 60)
		.nullable()
		.optional()
		.describe('Hours before start until which helpers may cancel; null = inherit'),
	swapNeedsApproval: z
		.boolean()
		.nullable()
		.optional()
		.describe('Shift handovers need a lead’s approval; null = inherit'),
	pointsPerShift: z.number().int().min(0).max(1440).nullable().optional(),
	pointsPerHour: z.number().int().min(0).max(1440).nullable().optional()
};

export const placeShape = {
	nameEn: z.string().max(100).optional(),
	address: z.string().max(300).optional(),
	description: z.string().max(1000).optional(),
	descriptionEn: z.string().max(1000).optional(),
	lat: z.number().min(-90).max(90).nullable().optional(),
	lng: z.number().min(-180).max(180).nullable().optional(),
	planX: z
		.number()
		.min(0)
		.max(1)
		.nullable()
		.optional()
		.describe('Position on the site plan, 0 = left, 1 = right'),
	planY: z
		.number()
		.min(0)
		.max(1)
		.nullable()
		.optional()
		.describe('Position on the site plan, 0 = top, 1 = bottom'),
	sortOrder: z.number().int().min(-9999).max(9999).optional()
};

const waveShape = {
	name: z.string().min(1).max(100),
	opensDate: isoDate,
	opensTime: wallTime,
	closesDate: isoDate.nullable().optional().describe('null or omitted = stays open'),
	closesTime: wallTime.optional(),
	areaIds: z
		.array(z.string().uuid())
		.max(200)
		.optional()
		.describe('Areas (incl. sub-areas) the wave applies to; empty = all areas'),
	audience: z
		.enum(['everyone', 'crew', 'returning', 'invite'])
		.describe(
			'everyone; crew = people with a role; returning = helped in an earlier edition (and crew); invite = only via invitation link'
		)
};

export function registerStructureTools(k: Kit) {
	const { ctx, tool, scope, require, enabled, pick, tz } = k;

	// -- reading --------------------------------------------------------------------

	tool(
		'list_waves',
		{
			title: 'List booking waves',
			description:
				'Booking waves of an edition: who may book which areas from when (with invitation links).',
			input: editionParam,
			readOnly: true
		},
		async ({ editionId }) => {
			const s = await scope(editionId);
			require(s.authz.can('shift.manage'));
			const now = ctx.now().getTime();
			return (await listWaves(ctx.db, s.edition.id)).map((w) => ({
				id: w.id,
				name: w.name,
				opens: k.local(w.opensAt),
				closes: w.closesAt ? k.local(w.closesAt) : null,
				areaIds: w.areaIds,
				audience: w.audience,
				inviteUrl: w.audience === 'invite' ? appUrl(`/invite/${w.inviteCode}`) : null,
				status:
					w.opensAt.getTime() > now
						? 'upcoming'
						: w.closesAt && w.closesAt.getTime() <= now
							? 'closed'
							: 'open'
			}));
		}
	);

	if (!enabled('structure')) return;

	// -- areas ----------------------------------------------------------------------

	tool(
		'update_area',
		{
			title: 'Update area',
			description:
				'Changes an area: name, description, parent (moving it), sort order and its rules for cancelling, handovers and points. Only given fields change.',
			input: {
				...editionParam,
				areaId: z.string().uuid(),
				name: z.string().min(1).max(100).optional(),
				parentId: z.string().uuid().nullable().optional().describe('null = top level'),
				...areaRulesShape
			}
		},
		async (a) => {
			const s = await scope(a.editionId);
			const area = s.tree.get(a.areaId);
			if (!area) throw new ToolError(k.t('error.notFound'));
			require(s.authz.can('area.manage', area.id));
			const parentId = pick(a.parentId, area.parentId);
			if (parentId !== area.parentId) require(s.authz.can('area.manage', parentId));
			const updated = await updateArea(ctx.db, ctx.actor, s.edition.id, area.id, {
				parentId,
				nameDe: pick(a.name, area.nameDe),
				nameEn: pick(a.nameEn, area.nameEn),
				descriptionDe: pick(a.description, area.descriptionDe),
				descriptionEn: pick(a.descriptionEn, area.descriptionEn),
				sortOrder: pick(a.sortOrder, area.sortOrder),
				cancelDeadlineHours: pick(a.cancelDeadlineHours, area.cancelDeadlineHours),
				swapNeedsApproval: pick(a.swapNeedsApproval, area.swapNeedsApproval),
				pointsPerShift: pick(a.pointsPerShift, area.pointsPerShift),
				pointsPerHour: pick(a.pointsPerHour, area.pointsPerHour)
			});
			return { id: updated.id, name: updated.nameDe, parentId: updated.parentId };
		}
	);

	tool(
		'delete_area',
		{
			title: 'Delete area',
			description:
				'Deletes an area. Only possible without sub-areas and shifts. Without confirm: true it only shows what would be deleted.',
			input: { ...editionParam, areaId: z.string().uuid(), confirm: z.boolean().optional() },
			destructive: true
		},
		async ({ editionId, areaId, confirm }) => {
			const s = await scope(editionId);
			const area = s.tree.get(areaId);
			if (!area) throw new ToolError(k.t('error.notFound'));
			require(s.authz.can('area.manage', area.id));
			if (!confirm)
				return {
					preview: true,
					area: k.areaPath(s, area.id),
					subAreas: s.tree.children(area.id).length,
					note: 'Repeat with confirm: true to delete.'
				};
			await deleteArea(ctx.db, ctx.actor, s.edition.id, area.id);
			return { deleted: area.id };
		}
	);

	// -- places ---------------------------------------------------------------------

	tool(
		'update_place',
		{
			title: 'Update place',
			description:
				'Changes a place (name, address, map pin, site-plan position). Only given fields change.',
			input: {
				...editionParam,
				placeId: z.string().uuid(),
				name: z.string().min(1).max(100).optional(),
				...placeShape
			}
		},
		async (a) => {
			const s = await scope(a.editionId);
			require(s.authz.can('shift.manage'));
			const place = (await listPlaces(ctx.db, s.edition.id)).find((p) => p.id === a.placeId);
			if (!place) throw new ToolError(k.t('error.notFound'));
			await updatePlace(ctx.db, ctx.actor, s.edition.id, place.id, {
				nameDe: pick(a.name, place.nameDe),
				nameEn: pick(a.nameEn, place.nameEn),
				descriptionDe: pick(a.description, place.descriptionDe),
				descriptionEn: pick(a.descriptionEn, place.descriptionEn),
				address: pick(a.address, place.address),
				lat: pick(a.lat, place.lat),
				lng: pick(a.lng, place.lng),
				planX: pick(a.planX, place.planX),
				planY: pick(a.planY, place.planY),
				sortOrder: pick(a.sortOrder, place.sortOrder)
			});
			return { id: place.id, updated: true };
		}
	);

	tool(
		'delete_place',
		{
			title: 'Delete place',
			description: 'Deletes a place. Shifts that refer to it keep their free-text location.',
			input: { ...editionParam, placeId: z.string().uuid() },
			destructive: true
		},
		async ({ editionId, placeId }) => {
			const s = await scope(editionId);
			require(s.authz.can('shift.manage'));
			await deletePlace(ctx.db, ctx.actor, s.edition.id, placeId);
			return { deleted: placeId };
		}
	);

	tool(
		'set_desk_place',
		{
			title: 'Set volunteer desk',
			description:
				'Chooses the place of the volunteer desk (where goodies are picked up unless a goodie has its own place). null removes it.',
			input: { ...editionParam, placeId: z.string().uuid().nullable() }
		},
		async ({ editionId, placeId }) => {
			const s = await scope(editionId);
			require(s.authz.can('shift.manage'));
			await setDeskPlace(ctx.db, ctx.actor, s.edition.id, placeId);
			return { deskPlaceId: placeId };
		}
	);

	// -- booking waves ----------------------------------------------------------------

	const waveInput = (a: {
		name: string;
		opensDate: string;
		opensTime: string;
		closesDate?: string | null;
		closesTime?: string;
		areaIds?: string[];
		audience: 'everyone' | 'crew' | 'returning' | 'invite';
	}) => ({
		name: a.name,
		opensAt: zonedToUtc(a.opensDate, a.opensTime, tz),
		closesAt: a.closesDate ? zonedToUtc(a.closesDate, a.closesTime ?? '00:00', tz) : null,
		areaIds: a.areaIds ?? [],
		audience: a.audience
	});

	tool(
		'create_wave',
		{
			title: 'Create booking wave',
			description:
				'Creates a booking wave: from when (and until when) which people may book shifts in which areas. As soon as an edition has waves, booking is only possible within one.',
			input: { ...editionParam, ...waveShape }
		},
		async (a) => {
			const s = await scope(a.editionId);
			require(s.authz.can('shift.manage'));
			const wave = await createWave(ctx.db, ctx.actor, s.edition.id, waveInput(a));
			return { id: wave.id, name: wave.name };
		}
	);

	tool(
		'update_wave',
		{
			title: 'Update booking wave',
			description:
				'Changes a booking wave. Only given fields change; to remove the end, pass closesDate: null.',
			input: {
				...editionParam,
				waveId: z.string().uuid(),
				name: waveShape.name.optional(),
				opensDate: waveShape.opensDate.optional(),
				opensTime: waveShape.opensTime.optional(),
				closesDate: waveShape.closesDate,
				closesTime: waveShape.closesTime,
				areaIds: waveShape.areaIds,
				audience: waveShape.audience.optional()
			}
		},
		async (a) => {
			const s = await scope(a.editionId);
			require(s.authz.can('shift.manage'));
			const wave = (await listWaves(ctx.db, s.edition.id)).find((w) => w.id === a.waveId);
			if (!wave) throw new ToolError(k.t('error.notFound'));
			const opens = utcToZoned(wave.opensAt, tz);
			const closes = wave.closesAt ? utcToZoned(wave.closesAt, tz) : null;
			await updateWave(
				ctx.db,
				ctx.actor,
				s.edition.id,
				wave.id,
				waveInput({
					name: pick(a.name, wave.name),
					opensDate: pick(a.opensDate, opens.date),
					opensTime: pick(a.opensTime, opens.time),
					closesDate: pick(a.closesDate, closes?.date ?? null),
					closesTime: pick(a.closesTime, closes?.time),
					areaIds: pick(a.areaIds, wave.areaIds),
					audience: pick(a.audience, wave.audience)
				})
			);
			return { id: wave.id, updated: true };
		}
	);

	tool(
		'delete_wave',
		{
			title: 'Delete booking wave',
			description: 'Deletes a booking wave.',
			input: { ...editionParam, waveId: z.string().uuid() },
			destructive: true
		},
		async ({ editionId, waveId }) => {
			const s = await scope(editionId);
			require(s.authz.can('shift.manage'));
			await deleteWave(ctx.db, ctx.actor, s.edition.id, waveId);
			return { deleted: waveId };
		}
	);
}
