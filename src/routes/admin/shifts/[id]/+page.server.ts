import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { checkInOpen } from '#lib/domain/booking.ts';
import { db } from '#lib/server/app.ts';
import { placeOptions } from '#lib/server/services/places.ts';
import { qualificationOptions } from '#lib/server/services/qualifications.ts';
import {
	actorOf,
	attempt,
	getAdminContext,
	requireEdition,
	requirePermission
} from '#lib/server/guards.ts';
import { shiftSchema } from '#lib/server/schemas.ts';
import { canSeeShiftArea, shiftAreaOptions } from '#lib/server/shift-access.ts';
import { formValuesFromShift, shiftInputFromForm } from '#lib/server/shift-forms.ts';
import {
	decideRequest,
	leadAssign,
	leadRemove,
	setAttendance,
	shiftRoster
} from '#lib/server/services/assignments.ts';
import { getSettings } from '#lib/server/services/settings.ts';
import { deleteShift, getShift, updateShift } from '#lib/server/services/shifts.ts';
import { callUrgent, endUrgent } from '#lib/server/services/urgent.ts';
import { checkbox, optionalText, parseForm, uuid } from '#lib/server/validation.ts';
import { displayValue } from '#lib/domain/fields.ts';
import { listFields, valuesFor } from '#lib/server/services/fields.ts';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

async function loadShiftForLead(event: RequestEvent) {
	const ctx = await getAdminContext(event);
	const { edition, tree } = requireEdition(ctx);
	const shift = await getShift(db(), event.params.id);
	if (!shift || shift.editionId !== edition.id) error(404, 'error.notFound');
	if (!canSeeShiftArea(ctx, shift.areaId)) error(403, 'error.forbidden');
	return { ctx, shift, tree };
}

export const load: PageServerLoad = async (event) => {
	const { ctx, shift, tree } = await loadShiftForLead(event);
	const { authz } = ctx;
	const tz = (await getSettings(db())).timezone;
	const roster = await shiftRoster(db(), shift.id);
	const leadFields = (await listFields(db())).filter((f) => f.active && f.showToLeads);
	const leadValues = await valuesFor(
		db(),
		roster.map((r) => r.userId),
		leadFields.map((f) => f.id)
	);
	const notesFor = (userId: string) =>
		leadFields
			.map((f) => ({
				labelDe: f.labelDe,
				labelEn: f.labelEn,
				value: displayValue(leadValues.get(userId)?.[f.id], '✓', '–')
			}))
			.filter((n) => n.value !== '');
	const showContact = authz.can('helper.contact.view', shift.areaId);
	const canEdit = authz.can('shift.manage', shift.areaId);

	return {
		timezone: tz,
		shift: {
			id: shift.id,
			titleDe: shift.titleDe,
			titleEn: shift.titleEn,
			startsAt: shift.startsAt.toISOString(),
			endsAt: shift.endsAt.toISOString(),
			areaPath: [...tree.path(shift.areaId), tree.get(shift.areaId)!].map((a) => ({
				nameDe: a.nameDe,
				nameEn: a.nameEn
			})),
			location: shift.location,
			meetingPoint: shift.meetingPoint,
			positions: shift.positions.map((p) => ({
				id: p.id,
				nameDe: p.nameDe,
				nameEn: p.nameEn,
				capacity: p.capacity,
				booked: p.booked,
				mode: p.bookingMode,
				urgentAt: p.urgentAt?.toISOString() ?? null,
				urgentBonus: p.urgentBonus,
				people: roster
					.filter((r) => r.positionId === p.id)
					.map((r) => ({
						id: r.id,
						userId: r.userId,
						name: `${r.firstName} ${r.lastName}`,
						phone: showContact ? r.phone : null,
						status: r.status,
						holdUntil: r.holdUntil?.toISOString() ?? null,
						attendance: r.attendance,
						notes: notesFor(r.userId)
					}))
			}))
		},
		can: {
			edit: canEdit,
			manage: authz.can('assignment.manage', shift.areaId),
			override: authz.can('assignment.override', shift.areaId),
			attendance: authz.can('attendance.confirm', shift.areaId),
			mail: authz.can('mail.send', shift.areaId),
			checkInOpen: checkInOpen(new Date(), shift.startsAt, tz),
			started: shift.startsAt.getTime() <= Date.now()
		},
		areas: canEdit ? shiftAreaOptions(ctx) : [],
		qualifications: canEdit ? await qualificationOptions(db()) : [],
		places: canEdit ? await placeOptions(db(), shift.editionId) : [],
		form: canEdit ? formValuesFromShift(shift, tz, true) : null
	};
};

export const actions: Actions = {
	update: async (event) => {
		const { ctx, shift } = await loadShiftForLead(event);
		requirePermission(ctx, 'shift.manage', shift.areaId);
		const form = await event.request.formData();
		const parsed = parseForm(shiftSchema, form);
		if (!parsed.ok) {
			return fail(400, {
				action: 'update',
				errors: parsed.errors,
				values: parsed.values,
				positions: String(form.get('positions') ?? '')
			});
		}
		requirePermission(ctx, 'shift.manage', parsed.data.areaId);
		const tz = (await getSettings(db())).timezone;
		const result = await attempt(
			() => updateShift(db(), actorOf(event), shift.id, shiftInputFromForm(parsed.data, tz)),
			{ action: 'update', values: parsed.values }
		);
		if (!result.ok) return result.failure;
		return { action: 'update', success: 'common.saved' };
	},
	delete: async (event) => {
		const { ctx, shift } = await loadShiftForLead(event);
		requirePermission(ctx, 'shift.manage', shift.areaId);
		await deleteShift(db(), actorOf(event), shift.id);
		redirect(303, '/admin/shifts');
	},
	add: async (event) => {
		const { ctx } = await loadShiftForLead(event);
		const parsed = parseForm(
			z.object({ positionId: uuid, userId: uuid, override: checkbox }),
			await event.request.formData()
		);
		if (!parsed.ok) return fail(400, { action: 'add', error: 'error.notFound' });
		const result = await attempt(
			() => leadAssign({ db: db(), now: new Date() }, actorOf(event), ctx.authz, parsed.data),
			{ action: 'add' }
		);
		if (!result.ok) return result.failure;
		if (!result.value.assignment) {
			return fail(409, { action: 'add', issues: result.value.issues, pending: parsed.data });
		}
		return { action: 'add', success: 'common.saved' };
	},
	remove: async (event) => {
		const { ctx } = await loadShiftForLead(event);
		const parsed = parseForm(z.object({ id: uuid }), await event.request.formData());
		if (!parsed.ok) return fail(400, { action: 'remove', error: 'error.notFound' });
		const result = await attempt(() =>
			leadRemove({ db: db(), now: new Date() }, actorOf(event), ctx.authz, parsed.data.id)
		);
		if (!result.ok) return result.failure;
		return { action: 'remove', success: 'common.saved' };
	},
	decide: async (event) => {
		const { ctx } = await loadShiftForLead(event);
		const parsed = parseForm(
			z.object({ id: uuid, approve: checkbox }),
			await event.request.formData()
		);
		if (!parsed.ok) return fail(400, { action: 'decide', error: 'error.notFound' });
		const result = await attempt(() =>
			decideRequest(
				{ db: db(), now: new Date() },
				actorOf(event),
				ctx.authz,
				parsed.data.id,
				parsed.data.approve
			)
		);
		if (!result.ok) return result.failure;
		return { action: 'decide', success: 'common.saved' };
	},
	urgent: async (event) => {
		const { ctx } = await loadShiftForLead(event);
		const parsed = parseForm(
			z.object({
				positionId: uuid,
				bonus: z.coerce.number('error.invalidNumber').int('error.invalidNumber').min(0).max(100),
				note: optionalText(300)
			}),
			await event.request.formData()
		);
		if (!parsed.ok)
			return fail(400, { action: 'urgent', errors: parsed.errors, values: parsed.values });
		const result = await attempt(
			() =>
				callUrgent(
					db(),
					actorOf(event),
					ctx.authz,
					parsed.data.positionId,
					{ bonus: parsed.data.bonus, note: parsed.data.note },
					new Date()
				),
			{ action: 'urgent' }
		);
		if (!result.ok) return result.failure;
		return { action: 'urgent', success: 'admin.urgent.sent', count: result.value };
	},
	endUrgent: async (event) => {
		const { ctx } = await loadShiftForLead(event);
		const parsed = parseForm(z.object({ positionId: uuid }), await event.request.formData());
		if (!parsed.ok) return fail(400, { action: 'endUrgent', error: 'error.notFound' });
		await endUrgent(db(), actorOf(event), ctx.authz, parsed.data.positionId);
		return { action: 'endUrgent', success: 'admin.urgent.ended' };
	},
	attendance: async (event) => {
		const { ctx } = await loadShiftForLead(event);
		const parsed = parseForm(
			z.object({ id: uuid, attendance: z.enum(['attended', 'no_show', 'unknown']) }),
			await event.request.formData()
		);
		if (!parsed.ok) return fail(400, { action: 'attendance', error: 'error.notFound' });
		const tz = (await getSettings(db())).timezone;
		const result = await attempt(() =>
			setAttendance(
				{ db: db(), now: new Date() },
				actorOf(event),
				ctx.authz,
				parsed.data.id,
				parsed.data.attendance,
				tz
			)
		);
		if (!result.ok) return result.failure;
		return { action: 'attendance' };
	}
};
