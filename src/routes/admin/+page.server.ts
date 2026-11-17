import { count, eq } from 'drizzle-orm';
import { config, db } from '#lib/server/app.ts';
import { DEFAULT_PRIMARY, roleAssignments } from '#lib/server/db/schema.ts';
import { getAdminContext } from '#lib/server/guards.ts';
import { outboxStatus } from '#lib/server/outbox.ts';
import {
	canSeeShiftArea,
	dashboardScope,
	hasDashboardAccess,
	hasShiftAccess
} from '#lib/server/shift-access.ts';
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
	// Staffing figures: with shift permissions or `dashboard.view` (read-only) for those areas.
	const dashboardAccess = hasDashboardAccess(ctx) && edition && tree;
	const [staffing, requests, swaps, qualifications, numbers, mail] = await Promise.all([
		dashboardAccess
			? loadDashboard(
					database,
					edition.id,
					tree,
					dashboardScope(authz, tree),
					settings.timezone,
					now
				)
			: null,
		shiftAccess ? pendingRequests(database, authz, edition.id) : [],
		shiftAccess ? pendingSwaps(database, authz, edition.id) : [],
		authz.isAdmin || authz.canSomewhere('qualification.review')
			? pendingQualifications(database)
			: [],
		authz.isAdmin && edition ? adminNumbers(database, edition.id, now) : null,
		authz.isAdmin ? outboxStatus(database) : null
	]);
	// Shifts are only linked where the viewer may open them; `dashboard.view` alone is read-only.
	const link = (areaId: string) => canSeeShiftArea(ctx, areaId);
	const dashboard = staffing && {
		...staffing,
		heatmap: {
			...staffing.heatmap,
			rows: staffing.heatmap.rows.map((r) => ({ ...r, link: link(r.areaId) }))
		},
		understaffed: staffing.understaffed.map((s) => ({ ...s, link: link(s.areaId) })),
		today: staffing.today.map((s) => ({ ...s, link: link(s.areaId) }))
	};

	return {
		timezone: settings.timezone,
		steps,
		dashboard,
		open: {
			requests: requests.length + swaps.length,
			qualifications: qualifications.length
		},
		numbers,
		failedMails: mail?.failed ?? 0,
		noMailServer: authz.isAdmin && !config.mailServer
	};
};
