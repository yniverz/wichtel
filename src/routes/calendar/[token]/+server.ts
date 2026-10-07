import { error } from '@sveltejs/kit';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '#lib/server/app.ts';
import { assignments, shiftPositions, shifts, users } from '#lib/server/db/schema.ts';
import { buildCalendar } from '#lib/server/ical.ts';
import { appUrl, placesOf } from '#lib/server/notifications.ts';
import { getSettings } from '#lib/server/services/settings.ts';
import { localized, translator } from '#lib/i18n/index.ts';
import type { RequestHandler } from './$types';

/** Personal iCal feed: `/calendar/<token>.ics` (the token is secret and rotatable). */
export const GET: RequestHandler = async ({ params }) => {
	const token = params.token.replace(/\.ics$/, '');
	const [user] = await db().select().from(users).where(eq(users.calendarToken, token));
	if (!user) error(404, 'error.notFound');
	const settings = await getSettings(db());
	const t = translator(user.locale);
	const rows = await db()
		.select({ assignment: assignments, shift: shifts, position: shiftPositions })
		.from(assignments)
		.innerJoin(shifts, eq(assignments.shiftId, shifts.id))
		.innerJoin(shiftPositions, eq(assignments.positionId, shiftPositions.id))
		.where(
			and(
				eq(assignments.userId, user.id),
				inArray(assignments.status, ['booked', 'requested', 'held'])
			)
		)
		.orderBy(asc(shifts.startsAt));

	const events = await Promise.all(
		rows.map(async ({ assignment, shift, position }) => {
			const { location, meeting } = await placesOf(db(), shift);
			const place = meeting ?? location;
			return {
				uid: `${assignment.id}@wichtel`,
				start: shift.startsAt,
				end: shift.endsAt,
				updated: shift.updatedAt > assignment.updatedAt ? shift.updatedAt : assignment.updatedAt,
				summary: `${assignment.status === 'requested' || assignment.status === 'held' ? `(${t(`shifts.status.${assignment.status}`)}) ` : ''}${localized(shift, 'title', user.locale)} · ${settings.festivalName}`,
				location: [
					place
						? [localized(place, 'name', user.locale), place.address].filter(Boolean).join(', ')
						: '',
					shift.meetingPoint || shift.location
				]
					.filter(Boolean)
					.join(' – '),
				geo:
					place && place.lat !== null && place.lng !== null
						? { lat: place.lat, lng: place.lng }
						: undefined,
				description: [
					localized(position, 'name', user.locale),
					shift.contact ? `${t('shifts.contact')}: ${shift.contact}` : '',
					localized(shift, 'description', user.locale)
				]
					.filter(Boolean)
					.join('\n'),
				url: appUrl('/app/shifts')
			};
		})
	);
	const body = buildCalendar(settings.festivalName, events);
	return new Response(body, {
		headers: {
			'content-type': 'text/calendar; charset=utf-8',
			'cache-control': 'private, max-age=300'
		}
	});
};
