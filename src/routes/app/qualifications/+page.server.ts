import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { config, db } from '#lib/server/app.ts';
import { attempt, requireVerifiedUser } from '#lib/server/guards.ts';
import {
	applyForQualification,
	listQualifications,
	listUserQualifications
} from '#lib/server/services/qualifications.ts';
import { checkbox, optionalText, parseForm, uuid } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireVerifiedUser(event);
	const [all, mine] = await Promise.all([
		listQualifications(db()),
		listUserQualifications(db(), user.id)
	]);
	const now = Date.now();
	return {
		open: event.url.searchParams.get('q'),
		qualifications: all
			.filter((q) => q.active)
			.map((q) => {
				const entry = mine.find((m) => m.qualification.id === q.id)?.entry;
				const expired =
					entry?.status === 'approved' &&
					entry.expiresAt !== null &&
					entry.expiresAt.getTime() <= now;
				return {
					id: q.id,
					nameDe: q.nameDe,
					nameEn: q.nameEn,
					descriptionDe: q.descriptionDe,
					descriptionEn: q.descriptionEn,
					proof: q.proof,
					deletedAfterReview: q.documentRetention === 'delete_after_review',
					status: expired ? 'expired' : (entry?.status ?? 'none'),
					expiresAt: entry?.expiresAt?.toISOString() ?? null,
					reviewNote: entry?.status === 'rejected' ? entry.reviewNote : ''
				};
			})
	};
};

export const actions: Actions = {
	default: async (event) => {
		const user = requireVerifiedUser(event);
		const form = await event.request.formData();
		const parsed = parseForm(
			z.object({ qualificationId: uuid, confirmed: checkbox, note: optionalText(1000) }),
			form
		);
		if (!parsed.ok) return fail(400, { error: 'error.notFound' });
		const file = form.get('document');
		const result = await attempt(
			() =>
				applyForQualification(db(), config.uploadDir, user.id, {
					...parsed.data,
					document: file instanceof File ? file : null
				}),
			{ action: parsed.data.qualificationId }
		);
		if (!result.ok) return result.failure;
		return { action: parsed.data.qualificationId, success: 'quals.submitted' };
	}
};
