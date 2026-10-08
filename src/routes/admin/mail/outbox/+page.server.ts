import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { config, db } from '#lib/server/app.ts';
import { actorOf, getAdminContext, requireAdmin } from '#lib/server/guards.ts';
import {
	discardMails,
	MAX_ATTEMPTS,
	outboxProblems,
	outboxStatus,
	retryMails
} from '#lib/server/outbox.ts';
import { parseForm, uuid } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireAdmin(await getAdminContext(event));
	const [status, problems] = await Promise.all([outboxStatus(db()), outboxProblems(db())]);
	return {
		status,
		mailServer: config.mailServer,
		mails: problems.map((m) => ({
			id: m.id,
			to: m.to,
			subject: m.subject,
			createdAt: m.createdAt.toISOString(),
			nextTry: m.attempts < MAX_ATTEMPTS ? m.sendAfter.toISOString() : null,
			attempts: m.attempts,
			lastError: m.lastError ?? ''
		}))
	};
};

const selection = z.object({ 'ids[]': z.array(uuid).min(1, 'error.required') });

export const actions: Actions = {
	retry: async (event) => {
		requireAdmin(await getAdminContext(event));
		const parsed = parseForm(selection, await event.request.formData());
		if (!parsed.ok) return fail(400, { error: 'admin.outbox.nothingSelected' });
		await retryMails(db(), actorOf(event), parsed.data['ids[]']);
		return { success: 'admin.outbox.retried' };
	},
	discard: async (event) => {
		requireAdmin(await getAdminContext(event));
		const parsed = parseForm(selection, await event.request.formData());
		if (!parsed.ok) return fail(400, { error: 'admin.outbox.nothingSelected' });
		await discardMails(db(), actorOf(event), parsed.data['ids[]']);
		return { success: 'admin.outbox.discarded' };
	}
};
