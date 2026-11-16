import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { mayPublish, NEWS_AUDIENCES, type NewsAudience } from '#lib/domain/news.ts';
import { zonedToUtc, utcToZoned } from '#lib/domain/time.ts';
import type { News } from './db/schema.ts';
import type { DB } from './db/client.ts';
import type { AdminContext } from './guards.ts';
import { listRoles } from './services/roles.ts';
import { getShift } from './services/shifts.ts';
import type { NewsInput } from './services/news.ts';
import { checkbox, isoDate, optionalText, optionalUuid, requiredText } from './validation.ts';

/** Publishing news needs the right to write to some group (formerly group e-mails). */
export function requireNewsWriter(ctx: AdminContext) {
	if (!ctx.authz.canSomewhere('mail.send')) error(403, 'error.forbidden');
}

export const newsSchema = z.object({
	audience: z.enum(NEWS_AUDIENCES),
	areaId: optionalUuid,
	shiftId: optionalUuid,
	roleId: optionalUuid,
	titleDe: requiredText(200),
	titleEn: optionalText(200),
	bodyDe: requiredText(20_000),
	bodyEn: optionalText(20_000),
	pinned: checkbox,
	pinnedUntil: z.union([z.literal(''), isoDate]).default(''),
	sendMail: checkbox
});

/** A pin "until" a day lasts to the end of that day in the festival time zone. */
export function newsInput(data: z.output<typeof newsSchema>, timeZone: string): NewsInput {
	return {
		audience: data.audience,
		areaId: data.areaId,
		shiftId: data.shiftId,
		roleId: data.roleId,
		titleDe: data.titleDe,
		titleEn: data.titleEn,
		bodyDe: data.bodyDe,
		bodyEn: data.bodyEn,
		pinned: data.pinned,
		pinnedUntil:
			data.pinned && data.pinnedUntil ? zonedToUtc(data.pinnedUntil, '23:59', timeZone) : null
	};
}

/** Form values of an existing post. */
export function newsValues(post: News, timeZone: string) {
	return {
		audience: post.audience,
		areaId: post.areaId ?? '',
		shiftId: post.shiftId ?? '',
		roleId: post.roleId ?? '',
		titleDe: post.titleDe,
		titleEn: post.titleEn,
		bodyDe: post.bodyDe,
		bodyEn: post.bodyEn,
		pinned: post.pinned ? 'on' : '',
		pinnedUntil: post.pinnedUntil ? utcToZoned(post.pinnedUntil, timeZone).date : ''
	};
}

/**
 * The audiences the person may choose, with the areas and roles to pick from. A shift can only
 * be chosen when the form is opened from that shift (`shiftId`).
 */
export async function audienceOptions(db: DB, ctx: AdminContext, shiftId: string | null) {
	const { authz } = ctx;
	const none = { audience: 'everyone', areaId: null, shiftId: null, roleId: null } as const;
	const areas = (ctx.tree?.flat() ?? [])
		.filter(({ area }) => authz.can('mail.send', area.id))
		.map(({ area, depth }) => ({ id: area.id, nameDe: area.nameDe, nameEn: area.nameEn, depth }));
	const shift = shiftId ? await getShift(db, shiftId) : undefined;
	const shiftOption =
		shift && shift.editionId === ctx.edition?.id && authz.can('mail.send', shift.areaId)
			? { id: shift.id, titleDe: shift.titleDe, titleEn: shift.titleEn }
			: null;
	// From narrow to wide, so the narrowest allowed group is chosen by default.
	const order: NewsAudience[] = ['shift', 'area', 'helpers', 'crew', 'role', 'everyone', 'public'];
	const audiences = order.filter((a) => {
		if (a === 'area') return areas.length > 0;
		if (a === 'shift') return shiftOption !== null;
		return mayPublish(authz, { ...none, audience: a });
	});
	const roles = audiences.includes('role')
		? (await listRoles(db)).map((r) => ({ id: r.id, nameDe: r.nameDe, nameEn: r.nameEn }))
		: [];
	return { audiences, areas, roles, shift: shiftOption };
}
