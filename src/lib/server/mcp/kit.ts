import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { AreaTree } from '#lib/domain/area-tree.ts';
import type { Authz } from '#lib/domain/permissions.ts';
import { isIsoDate, isWallTime, utcToZoned } from '#lib/domain/time.ts';
import { isMessageKey, translator } from '#lib/i18n/index.ts';
import { sha256 } from '../crypto.ts';
import type { DB } from '../db/client.ts';
import type { Area, Edition, InstanceSettings, OAuthGrant, User } from '../db/schema.ts';
import type { Actor } from '../audit.ts';
import { isDomainError } from '../errors.ts';
import { canSeeShiftArea } from '../shift-access.ts';
import { loadAreaTree } from '../services/areas.ts';
import { getCurrentEdition, getEdition } from '../services/editions.ts';
import { loadAuthz } from '../services/roles.ts';
import { getShift, type ShiftWithPositions } from '../services/shifts.ts';
import type { McpToolGroup } from './groups.ts';

export interface McpContext {
	db: DB;
	user: User;
	grant: OAuthGrant;
	settings: InstanceSettings;
	actor: Actor;
	now: () => Date;
	/** Where uploaded files live (qualification documents are removed after review). */
	uploadDir: string;
}

export type Json = Record<string, unknown> | unknown[];

/** A readable error for the assistant (no protocol failure). */
export class ToolError extends Error {}

export const wallTime = z.string().refine(isWallTime, 'Use HH:MM');
export const isoDate = z.string().refine(isIsoDate, 'Use YYYY-MM-DD');
export const editionParam = {
	editionId: z
		.string()
		.uuid()
		.optional()
		.describe('Edition (festival year); defaults to the current one')
};
export const confirmParam = {
	confirm: z.boolean().optional().describe('Only with the user’s agreement; without it: preview')
};

function ok(data: Json): CallToolResult {
	return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function fail(message: string): CallToolResult {
	return { isError: true, content: [{ type: 'text', text: message }] };
}

export interface Scope {
	edition: Edition;
	authz: Authz;
	tree: AreaTree<Area>;
}

/** Shared helpers for all tool groups of one request. */
export function createKit(ctx: McpContext, server: McpServer) {
	const t = translator(ctx.user.locale);
	const tz = ctx.settings.timezone;
	const writable = ctx.grant.scope === 'write';
	const enabled = (group: McpToolGroup) => writable && ctx.settings.mcpTools.includes(group);

	const local = (d: Date) => {
		const z = utcToZoned(d, tz);
		return `${z.date} ${z.time}`;
	};
	const pseudonym = (id: string) =>
		`Person ${sha256(ctx.settings.pseudonymSalt + id)
			.slice(0, 6)
			.toUpperCase()}`;
	/** A person as the assistant may see them, following the admin's privacy setting. */
	const person = (
		p: { id: string; firstName: string; lastName: string; email?: string; phone?: string },
		contactAllowed: boolean
	) => {
		const mode = ctx.settings.mcpPersonalData;
		if (mode === 'pseudonymous') return { userId: p.id, name: pseudonym(p.id) };
		const base = { userId: p.id, name: `${p.firstName} ${p.lastName}` };
		if (mode === 'full' && contactAllowed)
			return { ...base, email: p.email ?? null, phone: p.phone ?? null };
		return base;
	};
	/** Just the name (or pseudonym) of a person. */
	const nameOf = (p: { id: string; firstName: string; lastName: string }) => person(p, false).name;

	async function scope(editionId?: string): Promise<Scope> {
		const edition = editionId
			? await getEdition(ctx.db, editionId)
			: await getCurrentEdition(ctx.db);
		if (!edition) throw new ToolError('Edition not found.');
		const [authz, tree] = await Promise.all([
			loadAuthz(ctx.db, ctx.user, edition.id),
			loadAreaTree(ctx.db, edition.id)
		]);
		return { edition, authz, tree };
	}
	const require = (allowed: boolean) => {
		if (!allowed) throw new ToolError(t('error.forbidden'));
	};
	const requireAdmin = () => require(ctx.user.isAdmin);
	async function shiftFor(s: Scope, shiftId: string): Promise<ShiftWithPositions> {
		const shift = await getShift(ctx.db, shiftId);
		if (!shift || shift.editionId !== s.edition.id || !canSeeShiftArea(s, shift.areaId))
			throw new ToolError(t('error.notFound'));
		return shift;
	}
	const areaPath = (s: Scope, areaId: string) =>
		[...s.tree.path(areaId), s.tree.get(areaId)]
			.filter((a) => a !== undefined)
			.map((a) => a.nameDe)
			.join(' › ');
	const summary = (s: Scope, shift: ShiftWithPositions) => ({
		id: shift.id,
		title: shift.titleDe,
		area: areaPath(s, shift.areaId),
		areaId: shift.areaId,
		start: local(shift.startsAt),
		end: local(shift.endsAt),
		visibility: shift.visibility,
		positions: shift.positions.map((p) => ({
			id: p.id,
			name: p.nameDe,
			capacity: p.capacity,
			booked: p.booked,
			requested: p.requested,
			waitlisted: p.waitlisted,
			bookingMode: p.bookingMode,
			urgent: p.urgentAt !== null
		}))
	});
	/** Takes the new value if given, else keeps the old one (partial updates). */
	const pick = <T>(value: T | undefined, fallback: T): T =>
		value === undefined ? fallback : value;

	/** Registers a tool; errors become readable tool errors instead of protocol failures. */
	function tool<Shape extends z.ZodRawShape>(
		name: string,
		config: {
			title: string;
			description: string;
			input: Shape;
			readOnly?: boolean;
			destructive?: boolean;
		},
		run: (args: z.infer<z.ZodObject<Shape>>) => Promise<Json>
	) {
		server.registerTool(
			name,
			{
				title: config.title,
				description: config.description,
				inputSchema: config.input,
				annotations: {
					readOnlyHint: config.readOnly ?? false,
					destructiveHint: config.destructive ?? false,
					openWorldHint: false
				}
			},
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(async (args: any) => {
				try {
					return ok(await run(args));
				} catch (e) {
					if (e instanceof ToolError) return fail(e.message);
					if (isDomainError(e)) {
						const key = `error.${e.code}`;
						return fail(`${isMessageKey(key) ? t(key) : e.code} (${e.code})`);
					}
					throw e;
				}
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			}) as any
		);
	}

	return {
		ctx,
		t,
		tz,
		writable,
		enabled,
		local,
		pseudonym,
		person,
		nameOf,
		scope,
		require,
		requireAdmin,
		shiftFor,
		areaPath,
		summary,
		pick,
		tool
	};
}

export type Kit = ReturnType<typeof createKit>;
