import { fail } from '@sveltejs/kit';
import { groupJoinLimiter } from '#lib/server/limits.ts';
import { z } from 'zod';
import { db } from '#lib/server/app.ts';
import { attempt, requireVerifiedUser } from '#lib/server/guards.ts';
import { appUrl } from '#lib/server/notifications.ts';
import { getCurrentEdition } from '#lib/server/services/editions.ts';
import {
	createGroup,
	getGroup,
	groupSchedule,
	joinGroup,
	leaveGroup,
	rotateGroupCode
} from '#lib/server/services/groups.ts';
import { getSettings } from '#lib/server/services/settings.ts';
import { parseForm, requiredText } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireVerifiedUser(event);
	const database = db();
	const [edition, settings] = await Promise.all([
		getCurrentEdition(database),
		getSettings(database)
	]);
	const base = {
		enabled: settings.buddyGroupsEnabled && edition !== undefined,
		maxSize: settings.buddyGroupMaxSize,
		timezone: settings.timezone,
		code: event.url.searchParams.get('code') ?? ''
	};
	if (!edition || !settings.buddyGroupsEnabled) return { ...base, group: null };
	const group = await getGroup(database, user.id, edition.id);
	if (!group) return { ...base, group: null };
	const schedule = await groupSchedule(database, group, new Date());
	return {
		...base,
		group: {
			name: group.name,
			code: group.inviteCode,
			link: appUrl(`/app/group?code=${group.inviteCode}`),
			members: group.members.map((m) => ({
				id: m.userId,
				name: `${m.firstName} ${m.lastName}`,
				isYou: m.userId === user.id,
				shifts: schedule
					.filter((s) => s.userId === m.userId)
					.map((s) => ({
						id: s.shiftId,
						titleDe: s.titleDe,
						titleEn: s.titleEn,
						startsAt: s.startsAt.toISOString(),
						endsAt: s.endsAt.toISOString(),
						status: s.status
					}))
			}))
		}
	};
};

async function context(event: RequestEvent) {
	const user = requireVerifiedUser(event);
	const edition = await getCurrentEdition(db());
	if (!edition) return null;
	return { user, editionId: edition.id };
}

export const actions: Actions = {
	create: async (event) => {
		const ctx = await context(event);
		if (!ctx) return fail(400, { error: 'error.notFound' });
		const parsed = parseForm(z.object({ name: requiredText(60) }), await event.request.formData());
		if (!parsed.ok)
			return fail(400, { action: 'create', errors: parsed.errors, values: parsed.values });
		const result = await attempt(
			() => createGroup(db(), ctx.user.id, ctx.editionId, parsed.data.name),
			{ action: 'create', values: parsed.values }
		);
		if (!result.ok) return result.failure;
		return { success: 'group.created' };
	},
	join: async (event) => {
		const ctx = await context(event);
		if (!ctx) return fail(400, { error: 'error.notFound' });
		const parsed = parseForm(z.object({ code: requiredText(40) }), await event.request.formData());
		if (!parsed.ok)
			return fail(400, { action: 'join', errors: parsed.errors, values: parsed.values });
		if (!groupJoinLimiter.attempt(ctx.user.id))
			return fail(429, { action: 'join', error: 'error.rateLimited', values: parsed.values });
		const result = await attempt(
			() => joinGroup(db(), ctx.user.id, ctx.editionId, parsed.data.code),
			{ action: 'join', values: parsed.values }
		);
		if (!result.ok) return result.failure;
		return { success: 'group.joined' };
	},
	leave: async (event) => {
		const ctx = await context(event);
		if (!ctx) return fail(400, { error: 'error.notFound' });
		await leaveGroup(db(), ctx.user.id, ctx.editionId);
		return { success: 'group.left' };
	},
	rotate: async (event) => {
		const ctx = await context(event);
		if (!ctx) return fail(400, { error: 'error.notFound' });
		const result = await attempt(() => rotateGroupCode(db(), ctx.user.id, ctx.editionId));
		if (!result.ok) return result.failure;
		return { success: 'common.saved' };
	}
};
