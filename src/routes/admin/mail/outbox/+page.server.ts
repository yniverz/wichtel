import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { config, db, mailer } from '#lib/server/app.ts';
import { testMail } from '#lib/server/mail.ts';
import { getSettings } from '#lib/server/services/settings.ts';
import { log } from '#lib/server/log.ts';
import { actorOf, getAdminContext, requireAdmin } from '#lib/server/guards.ts';
import {
	discardMails,
	MAX_ATTEMPTS,
	outboxProblems,
	outboxStatus,
	outboxLog,
	retryMails
} from '#lib/server/outbox.ts';
import { parseForm, uuid } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireAdmin(await getAdminContext(event));
	const q = event.url.searchParams.get('q') ?? '';
	const pageNo = Math.max(0, Number(event.url.searchParams.get('page') ?? 0) || 0);
	const [status, problems, history] = await Promise.all([
		outboxStatus(db()),
		outboxProblems(db()),
		outboxLog(db(), q, pageNo, LOG_PAGE)
	]);
	return {
		status,
		log: {
			q,
			pageNo,
			pages: Math.max(1, Math.ceil(history.total / LOG_PAGE)),
			total: history.total,
			mails: history.mails.map((m) => ({
				id: m.id,
				to: m.to,
				subject: m.subject,
				state: m.state,
				at: (m.sentAt ?? m.createdAt).toISOString(),
				lastError: m.state === 'sent' ? '' : (m.lastError ?? '')
			}))
		},
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

const LOG_PAGE = 50;

const selection = z.object({ 'ids[]': z.array(uuid).min(1, 'error.required') });

export const actions: Actions = {
	retry: async (event) => {
		requireAdmin(await getAdminContext(event));
		const parsed = parseForm(selection, await event.request.formData());
		if (!parsed.ok) return fail(400, { error: 'admin.outbox.nothingSelected' });
		await retryMails(db(), actorOf(event), parsed.data['ids[]']);
		return { success: 'admin.outbox.retried' };
	},
	/**
	 * Sends a short e-mail to the signed-in admin right away (not through the outbox) and shows the
	 * mail server's answer, so wrong settings show up immediately.
	 */
	testMail: async (event) => {
		const ctx = await getAdminContext(event);
		requireAdmin(ctx);
		const settings = await getSettings(db());
		try {
			await mailer().send(
				testMail({
					locale: event.locals.locale,
					to: ctx.user.email,
					name: ctx.user.firstName,
					festival: settings.festivalName
				})
			);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			log.warn('test e-mail failed', { err: message });
			return fail(400, { testFailed: message.slice(0, 500) });
		}
		return { testSent: ctx.user.email, viaServer: config.mailServer };
	},
	discard: async (event) => {
		requireAdmin(await getAdminContext(event));
		const parsed = parseForm(selection, await event.request.formData());
		if (!parsed.ok) return fail(400, { error: 'admin.outbox.nothingSelected' });
		await discardMails(db(), actorOf(event), parsed.data['ids[]']);
		return { success: 'admin.outbox.discarded' };
	}
};
