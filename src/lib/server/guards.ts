import { error, fail, redirect, type RequestEvent } from '@sveltejs/kit';
import type { Authz, Permission } from '#lib/domain/permissions.ts';
import type { AreaTree } from '#lib/domain/area-tree.ts';
import { db } from './app.ts';
import type { Actor } from './audit.ts';
import { ADMIN_EDITION_COOKIE } from './cookies.ts';
import type { Area, Edition, User } from './db/schema.ts';
import { isDomainError } from './errors.ts';
import { loadAreaTree } from './services/areas.ts';
import { getCurrentEdition, getEdition, listEditions } from './services/editions.ts';
import { loadAuthz } from './services/roles.ts';

export function requireUser(event: RequestEvent): User {
	const user = event.locals.user;
	if (!user) {
		const next = event.url.pathname + event.url.search;
		redirect(303, `/login?next=${encodeURIComponent(next)}`);
	}
	return user;
}

export function requireVerifiedUser(event: RequestEvent): User {
	const user = requireUser(event);
	if (!user.emailVerifiedAt) redirect(303, '/app');
	return user;
}

export function actorOf(event: RequestEvent): Actor {
	let ip: string | null = null;
	try {
		ip = event.getClientAddress();
	} catch {
		// not available in every environment
	}
	return { userId: event.locals.user?.id ?? null, ip };
}

export interface AdminContext {
	user: User;
	authz: Authz;
	editions: Edition[];
	/** The edition being administered (cookie selection, else the current one). */
	edition: Edition | null;
	tree: AreaTree<Area> | null;
}

const adminContexts = new WeakMap<Request, Promise<AdminContext>>();

/**
 * Loads the admin context once per request. Throws 403 if the user has neither admin rights nor
 * any role in the selected edition.
 */
export function getAdminContext(event: RequestEvent): Promise<AdminContext> {
	let ctx = adminContexts.get(event.request);
	if (!ctx) {
		ctx = loadAdminContext(event);
		adminContexts.set(event.request, ctx);
	}
	return ctx;
}

async function loadAdminContext(event: RequestEvent): Promise<AdminContext> {
	const user = requireVerifiedUser(event);
	const database = db();
	const editions = await listEditions(database);
	const selectedId = event.cookies.get(ADMIN_EDITION_COOKIE);
	const edition =
		(selectedId ? await getEdition(database, selectedId) : undefined) ??
		(await getCurrentEdition(database)) ??
		editions[0] ??
		null;
	const [authz, tree] = await Promise.all([
		loadAuthz(database, user, edition?.id ?? null),
		edition ? loadAreaTree(database, edition.id) : Promise.resolve(null)
	]);
	if (!authz.hasAnyGrant) error(403, 'error.forbidden');
	return { user, authz, editions, edition, tree };
}

export function requireAdmin(ctx: AdminContext): void {
	if (!ctx.authz.isAdmin) error(403, 'error.forbidden');
}

export function requirePermission(
	ctx: AdminContext,
	permission: Permission,
	areaId?: string | null
) {
	if (!ctx.authz.can(permission, areaId)) error(403, 'error.forbidden');
}

export function requireEdition(ctx: AdminContext): { edition: Edition; tree: AreaTree<Area> } {
	if (!ctx.edition || !ctx.tree) redirect(303, '/admin/editions');
	return { edition: ctx.edition, tree: ctx.tree };
}

/**
 * Runs a service call inside a form action and converts expected `DomainError`s into a 400 form
 * failure (`{ error, errors }`) so the page can show a translated message.
 */
export async function attempt<T>(
	fn: () => Promise<T>,
	opts: { values?: Record<string, unknown>; action?: string } = {}
) {
	try {
		return { ok: true as const, value: await fn() };
	} catch (e) {
		if (isDomainError(e)) {
			const errors: Record<string, string> = e.field ? { [e.field]: `error.${e.code}` } : {};
			return {
				ok: false as const,
				failure: fail(400, {
					action: opts.action,
					error: `error.${e.code}`,
					errors,
					values: stringValues(opts.values ?? {})
				})
			};
		}
		throw e;
	}
}

function stringValues(values: Record<string, unknown>): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [k, v] of Object.entries(values)) {
		if (v === null || v === undefined) out[k] = '';
		else if (typeof v !== 'object') out[k] = String(v);
	}
	return out;
}
