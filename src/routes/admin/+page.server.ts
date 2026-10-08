import { count, eq } from 'drizzle-orm';
import { db } from '#lib/server/app.ts';
import { DEFAULT_PRIMARY, roleAssignments } from '#lib/server/db/schema.ts';
import { getAdminContext } from '#lib/server/guards.ts';
import { outboxStatus } from '#lib/server/outbox.ts';
import { hasShiftAccess, shiftAreaScope } from '#lib/server/shift-access.ts';
import { pendingRequests } from '#lib/server/services/assignments.ts';
import { adminNumbers, loadDashboard } from '#lib/server/services/dashboard.ts';
import { pendingRequests as pendingQualifications } from '#lib/server/services/qualifications.ts';
import { getSettings } from '#lib/server/services/settings.ts';
import { pendingSwaps } from '#lib/server/services/swaps.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const ctx = await getAdminContext(event);
	const database = db();
	const settings = await getSettings(database);
	const now = new Date();
	const { authz, edition, tree } = ctx;

	const [{ grants }] = edition
		? await database
				.select({ grants: count() })
				.from(roleAssignments)
				.where(eq(roleAssignments.editionId, edition.id))
		: [{ grants: 0 }];
	const areaCount = tree ? tree.flat().length : 0;
	const steps = {
		branding: settings.logoAssetId !== null || settings.primaryColor !== DEFAULT_PRIMARY,
		areas: areaCount > 0,
		roles: grants > 0
	};

	const shiftAccess = hasShiftAccess(ctx) && edition && tree;
	const [dashboard, requests, swaps, qualifications, numbers, mail] = await Promise.all([
		shiftAccess
			? loadDashboard(database, edition.id, tree, shiftAreaScope(ctx), settings.timezone, now)
			: null,
		shiftAccess ? pendingRequests(database, authz, edition.id) : [],
		shiftAccess ? pendingSwaps(database, authz, edition.id) : [],
		authz.isAdmin || authz.canSomewhere('qualification.review')
			? pendingQualifications(database)
			: [],
		authz.isAdmin && edition ? adminNumbers(database, edition.id, now) : null,
		authz.isAdmin ? outboxStatus(database) : null
	]);

	return {
		timezone: settings.timezone,
		steps,
		dashboard,
		open: {
			requests: requests.length + swaps.length,
			qualifications: qualifications.length
		},
		numbers,
		failedMails: mail?.failed ?? 0
	};
};
