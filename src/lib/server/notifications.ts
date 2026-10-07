import { and, eq, inArray } from 'drizzle-orm';
import {
	formatDayLong,
	formatTime,
	isMessageKey,
	localized,
	translator,
	type Locale
} from '#lib/i18n/index.ts';
import { utcToZoned } from '#lib/domain/time.ts';
import type { Tx } from './db/client.ts';
import {
	assignments,
	emailOutbox,
	mailTemplates,
	places,
	shifts,
	users,
	type Place,
	type Shift
} from './db/schema.ts';
import { mapLinks } from '#lib/domain/places.ts';
import { getSettings } from './services/settings.ts';

export const MAIL_TEMPLATES = [
	'booking_confirmed',
	'booking_requested',
	'request_approved',
	'request_rejected',
	'added_by_lead',
	'removed_by_lead',
	'shift_changed',
	'shift_cancelled',
	'reminder',
	'waitlist_promoted',
	'group_hold',
	'hold_expired',
	'swap_offered',
	'swap_proposed',
	'swap_pending',
	'swap_completed',
	'swap_declined',
	'urgent_call'
] as const;
export type MailTemplate = (typeof MAIL_TEMPLATES)[number];

/** Public base URL for links in e-mails; set once at startup. */
let publicUrl = 'http://localhost:5173';
export function setPublicUrl(url: string) {
	publicUrl = url.replace(/\/+$/, '');
}
export function appUrl(path: string) {
	return `${publicUrl}${path}`;
}

const escapeHtml = (s: string) =>
	s.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);

function interpolate(template: string, params: Record<string, string>) {
	return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? params[k] : m));
}

/** Turns a plain-text mail into simple, robust HTML (paragraphs, line breaks, links). */
export function textToHtml(text: string, primaryColor: string): string {
	const paragraphs = text
		.split(/\n{2,}/)
		.map((p) =>
			escapeHtml(p)
				.replace(
					/https?:\/\/[^\s<]+/g,
					(url) => `<a href="${url}" style="color:${primaryColor}">${url}</a>`
				)
				.replace(/\n/g, '<br>')
		)
		.map((p) => `<p>${p}</p>`)
		.join('\n');
	return `<!doctype html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1d1b17;max-width:560px;margin:0 auto;padding:24px">\n${paragraphs}\n</body></html>`;
}

/** Subject and body for a template: admin override if present, else the built-in default. */
export async function templateText(tx: Tx, key: MailTemplate, locale: Locale) {
	const [override] = await tx
		.select()
		.from(mailTemplates)
		.where(and(eq(mailTemplates.key, key), eq(mailTemplates.locale, locale)));
	if (override) return { subject: override.subject, body: override.body };
	const t = translator(locale);
	const subjectKey = `mailtpl.${key}.subject`;
	const bodyKey = `mailtpl.${key}.body`;
	return {
		subject: isMessageKey(subjectKey) ? t(subjectKey) : key,
		body: isMessageKey(bodyKey) ? t(bodyKey) : ''
	};
}

type ShiftForMail = Pick<
	Shift,
	| 'titleDe'
	| 'titleEn'
	| 'startsAt'
	| 'endsAt'
	| 'location'
	| 'meetingPoint'
	| 'locationPlaceId'
	| 'meetingPlaceId'
>;

/** Loads the structured places a shift refers to. */
export async function placesOf(tx: Tx, shift: Pick<Shift, 'locationPlaceId' | 'meetingPlaceId'>) {
	const ids = [shift.locationPlaceId, shift.meetingPlaceId].filter((id): id is string => !!id);
	const rows = ids.length ? await tx.select().from(places).where(inArray(places.id, ids)) : [];
	const byId = new Map(rows.map((p) => [p.id, p]));
	return {
		location: shift.locationPlaceId ? byId.get(shift.locationPlaceId) : undefined,
		meeting: shift.meetingPlaceId ? byId.get(shift.meetingPlaceId) : undefined
	};
}

function describePlace(place: Place | undefined, detail: string, locale: Locale) {
	const parts = [
		place ? localized(place, 'name', locale) + (place.address ? ` (${place.address})` : '') : '',
		detail
	].filter(Boolean);
	const link = place ? mapLinks(place)?.google : undefined;
	return { text: parts.join(' – '), link };
}

/** Placeholders describing a shift, in the recipient's language and the festival time zone. */
export function shiftParams(
	shift: ShiftForMail,
	locale: Locale,
	timeZone: string,
	shiftPlaces: { location?: Place; meeting?: Place } = {}
) {
	const t = translator(locale);
	const location = describePlace(shiftPlaces.location, shift.location, locale);
	const meeting = describePlace(shiftPlaces.meeting, shift.meetingPoint, locale);
	const where = [
		location.text ? `${t('mail.location')}: ${location.text}` : '',
		meeting.text ? `${t('mail.meetingPoint')}: ${meeting.text}` : '',
		meeting.link ?? location.link ?? ''
	].filter(Boolean);
	return {
		shift: localized(shift, 'title', locale),
		date: formatDayLong(utcToZoned(shift.startsAt, timeZone).date, locale),
		time: `${formatTime(shift.startsAt, locale, timeZone)}–${formatTime(shift.endsAt, locale, timeZone)}`,
		location: where.length ? `\n${where.join('\n')}` : ''
	};
}

export async function enqueueMail(
	tx: Tx,
	mail: { to: string; subject: string; text: string },
	sendAfter?: Date
) {
	const settings = await getSettings(tx);
	await tx.insert(emailOutbox).values({
		to: mail.to,
		subject: mail.subject,
		text: mail.text,
		html: textToHtml(mail.text, settings.primaryColor),
		...(sendAfter ? { sendAfter } : {})
	});
}

/** Renders a template for one person and puts it into the outbox. */
export async function sendTemplate(
	tx: Tx,
	key: MailTemplate,
	recipient: { email: string; firstName: string; locale: Locale },
	params: Record<string, string>
) {
	const settings = await getSettings(tx);
	const template = await templateText(tx, key, recipient.locale);
	const all = {
		name: recipient.firstName,
		festival: settings.festivalName,
		link: appUrl('/app/shifts'),
		...params
	};
	await enqueueMail(tx, {
		to: recipient.email,
		subject: interpolate(template.subject, all),
		text: interpolate(template.body, all)
	});
}

/** Notifies the person of an assignment about it (booking, approval, removal, …). */
export async function notifyAssignment(tx: Tx, key: MailTemplate, assignmentId: string) {
	const [row] = await tx
		.select({ user: users, shift: shifts })
		.from(assignments)
		.innerJoin(users, eq(assignments.userId, users.id))
		.innerJoin(shifts, eq(assignments.shiftId, shifts.id))
		.where(eq(assignments.id, assignmentId));
	if (!row) return;
	const settings = await getSettings(tx);
	const shiftPlaces = await placesOf(tx, row.shift);
	await sendTemplate(
		tx,
		key,
		row.user,
		shiftParams(row.shift, row.user.locale, settings.timezone, shiftPlaces)
	);
}

/** Notifies several people about a shift (change or cancellation); `shift` may already be deleted. */
export async function notifyShiftPeople(
	tx: Tx,
	key: MailTemplate,
	shift: ShiftForMail,
	userIds: string[]
) {
	if (userIds.length === 0) return;
	const settings = await getSettings(tx);
	const shiftPlaces = await placesOf(tx, shift);
	const people = await tx
		.select()
		.from(users)
		.where(inArray(users.id, [...new Set(userIds)]));
	for (const person of people) {
		await sendTemplate(
			tx,
			key,
			person,
			shiftParams(shift, person.locale, settings.timezone, shiftPlaces)
		);
	}
}
