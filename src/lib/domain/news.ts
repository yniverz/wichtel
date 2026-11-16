/** News: who a post is for, who may publish it, how the feed is ordered. Pure logic. */
import type { Authz } from './permissions.ts';

export const NEWS_AUDIENCES = [
	'public',
	'everyone',
	'helpers',
	'crew',
	'role',
	'area',
	'shift'
] as const;
export type NewsAudience = (typeof NEWS_AUDIENCES)[number];

export interface NewsTarget {
	audience: NewsAudience;
	/** For `area` (including sub-areas), `shift` and `role`. Null if the target was deleted. */
	areaId: string | null;
	shiftId: string | null;
	roleId: string | null;
}

/** What decides which posts a signed-in person sees (in one edition). */
export interface Reader {
	/** Has a role in the edition. */
	crew: boolean;
	roleIds: ReadonlySet<string>;
	/** Shifts and their areas with an active booking or request. */
	shiftIds: ReadonlySet<string>;
	areaIds: ReadonlySet<string>;
}

/**
 * Whether the post reaches the reader (null = not signed in). A post whose area, shift or role
 * was deleted reaches nobody rather than everybody.
 */
export function reaches(
	post: NewsTarget,
	reader: Reader | null,
	isWithin: (areaId: string, ancestorId: string) => boolean
): boolean {
	if (post.audience === 'public') return true;
	if (!reader) return false;
	switch (post.audience) {
		case 'everyone':
			return true;
		case 'helpers':
			return reader.shiftIds.size > 0;
		case 'crew':
			return reader.crew;
		case 'role':
			return post.roleId !== null && reader.roleIds.has(post.roleId);
		case 'area': {
			const target = post.areaId;
			return target !== null && [...reader.areaIds].some((a) => isWithin(a, target));
		}
		case 'shift':
			return post.shiftId !== null && reader.shiftIds.has(post.shiftId);
	}
}

/**
 * Whether someone may publish to (or edit a post for) this audience. Mirrors the old group
 * e-mail: areas and shifts need `mail.send` there; edition-wide groups need it for the whole
 * edition; everybody and the public only administrators (who may edit every post, also one whose
 * target was deleted). `shiftAreaId` is the area of the shift.
 */
export function mayPublish(
	authz: Authz,
	target: NewsTarget,
	shiftAreaId: string | null = null
): boolean {
	if (authz.isAdmin) return true;
	switch (target.audience) {
		case 'public':
		case 'everyone':
			return authz.isAdmin;
		case 'helpers':
		case 'crew':
		case 'role':
			return authz.can('mail.send');
		case 'area':
			return target.areaId !== null && authz.can('mail.send', target.areaId);
		case 'shift':
			return shiftAreaId !== null && authz.can('mail.send', shiftAreaId);
	}
}

export function isPinned(post: { pinned: boolean; pinnedUntil: Date | null }, now: Date): boolean {
	return post.pinned && (post.pinnedUntil === null || post.pinnedUntil.getTime() > now.getTime());
}

/** Pinned posts first, then the newest. */
export function feedOrder<
	T extends { pinned: boolean; pinnedUntil: Date | null; publishedAt: Date }
>(posts: readonly T[], now: Date): T[] {
	return [...posts].sort((a, b) => {
		const pin = Number(isPinned(b, now)) - Number(isPinned(a, now));
		return pin !== 0 ? pin : b.publishedAt.getTime() - a.publishedAt.getTime();
	});
}

/** The start of a post as plain text, for lists (Markdown marks removed, cut at a word). */
export function excerpt(markdown: string, max = 240): { text: string; more: boolean } {
	const plain = markdown
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/^#{1,6}\s+/gm, '')
		.replace(/^\s*(?:[-*]|\d+\.)\s+/gm, '')
		.replace(/\*\*([^*]+)\*\*|\*([^*]+)\*/g, '$1$2')
		.replace(/\s+/g, ' ')
		.trim();
	if (plain.length <= max) return { text: plain, more: false };
	const cut = plain.slice(0, max);
	const space = cut.lastIndexOf(' ');
	return { text: `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()} …`, more: true };
}
