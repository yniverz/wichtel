import { shiftInterval, utcToZoned } from '#lib/domain/time.ts';
import type { z } from 'zod';
import type { seriesSchema, shiftSchema } from './schemas.ts';
import type { ShiftDetailsInput, ShiftInput, ShiftWithPositions } from './services/shifts.ts';

type ShiftForm = z.output<typeof shiftSchema>;
type SeriesForm = z.output<typeof seriesSchema>;

export function detailsFromForm(data: ShiftForm | SeriesForm): ShiftDetailsInput {
	return {
		areaId: data.areaId,
		titleDe: data.titleDe,
		titleEn: data.titleEn,
		descriptionDe: data.descriptionDe,
		descriptionEn: data.descriptionEn,
		location: data.location,
		meetingPoint: data.meetingPoint,
		contact: data.contact,
		visibility: data.visibility,
		cancelDeadlineHours: data.cancelDeadlineHours
	};
}

export function shiftInputFromForm(data: ShiftForm, timeZone: string): ShiftInput {
	return {
		...detailsFromForm(data),
		...shiftInterval(data.date, data.start, data.end, timeZone),
		positions: data.positions
	};
}

/** Pre-fills the shift form from an existing shift (edit or duplicate). */
export function formValuesFromShift(shift: ShiftWithPositions, timeZone: string, keepIds: boolean) {
	const start = utcToZoned(shift.startsAt, timeZone);
	const end = utcToZoned(shift.endsAt, timeZone);
	return {
		values: {
			areaId: shift.areaId,
			titleDe: shift.titleDe,
			titleEn: shift.titleEn,
			descriptionDe: shift.descriptionDe,
			descriptionEn: shift.descriptionEn,
			location: shift.location,
			meetingPoint: shift.meetingPoint,
			contact: shift.contact,
			visibility: shift.visibility,
			cancelDeadlineHours: shift.cancelDeadlineHours,
			date: start.date,
			start: start.time,
			end: end.time
		},
		positions: shift.positions.map((p) => ({
			...(keepIds ? { id: p.id, booked: p.booked + p.requested } : {}),
			nameDe: p.nameDe,
			nameEn: p.nameEn,
			descriptionDe: p.descriptionDe,
			descriptionEn: p.descriptionEn,
			capacity: p.capacity,
			bookingMode: p.bookingMode
		}))
	};
}
