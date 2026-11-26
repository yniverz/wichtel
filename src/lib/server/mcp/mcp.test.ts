import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from '../db/client.ts';
import { eq } from 'drizzle-orm';
import { roleAssignments, roles, users } from '../db/schema.ts';
import { createTestDatabase } from '../testing/db.ts';
import { createArea } from '../services/areas.ts';
import { createEdition } from '../services/editions.ts';
import { createCode, exchangeCode, pkceChallenge, registerClient } from '../services/oauth.ts';
import { getSettings, invalidateSettingsCache, updateSettings } from '../services/settings.ts';
import { MCP_TOOL_GROUPS } from './groups.ts';
import { createShift } from '../services/shifts.ts';
import { handleMcpRequest } from './handler.ts';

let database: Database;
const actor = { userId: null };
beforeEach(async () => {
	invalidateSettingsCache();
	database = await createTestDatabase();
});
afterEach(async () => {
	invalidateSettingsCache();
	await database.close();
});

const area = (nameDe: string) => ({
	parentId: null,
	nameDe,
	nameEn: '',
	descriptionDe: '',
	descriptionEn: '',
	sortOrder: 0,
	cancelDeadlineHours: null,
	pointsPerShift: null,
	pointsPerHour: null
});

async function seed(permissions: string[]) {
	const db = database.db;
	const edition = await createEdition(db, actor, {
		name: '2027',
		startsOn: '2027-06-01',
		endsOn: '2027-06-30'
	});
	const bar = await createArea(db, actor, edition.id, area('Bar'));
	const build = await createArea(db, actor, edition.id, area('Aufbau'));
	const [lead] = await db
		.insert(users)
		.values({
			email: 'lead@x.org',
			firstName: 'Lea',
			lastName: 'Lead',
			emailVerifiedAt: new Date()
		})
		.returning();
	const [role] = await db.insert(roles).values({ nameDe: 'Bar-Leitung', permissions }).returning();
	await db
		.insert(roleAssignments)
		.values({ userId: lead.id, roleId: role.id, editionId: edition.id, areaId: bar.id });
	const shift = await createShift(db, actor, edition.id, {
		areaId: bar.id,
		titleDe: 'Theke',
		titleEn: '',
		descriptionDe: '',
		descriptionEn: '',
		location: '',
		meetingPoint: '',
		contact: '',
		visibility: 'public',
		cancelDeadlineHours: null,
		startsAt: new Date('2027-06-12T16:00:00Z'),
		endsAt: new Date('2027-06-12T20:00:00Z'),
		positions: [
			{
				nameDe: 'Theke',
				nameEn: '',
				descriptionDe: '',
				descriptionEn: '',
				capacity: 2,
				bookingMode: 'open'
			}
		]
	});
	const token = async (scope: 'read' | 'write') => {
		const redirect = 'https://claude.ai/api/mcp/auth_callback';
		const client = await registerClient(db, { name: 'Claude', redirectUris: [redirect] });
		const verifier = 'x'.repeat(48);
		const code = await createCode(db, {
			clientId: client.id,
			userId: lead.id,
			redirectUri: redirect,
			codeChallenge: pkceChallenge(verifier),
			scope
		});
		return (
			await exchangeCode(db, {
				code,
				clientId: client.id,
				redirectUri: redirect,
				codeVerifier: verifier
			})
		).access_token;
	};
	return { db, edition, bar, build, lead, shift, token };
}

let id = 0;
async function rpc(db: Database['db'], token: string | null, method: string, params: object = {}) {
	const response = await handleMcpRequest(
		db,
		new Request('http://localhost/mcp', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				accept: 'application/json, text/event-stream',
				'mcp-protocol-version': '2025-06-18',
				...(token ? { authorization: `Bearer ${token}` } : {})
			},
			body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params })
		}),
		null,
		{ uploadDir: '/tmp/wichtel-test-uploads' }
	);
	return { status: response.status, headers: response.headers, body: await response.json() };
}

const call = async (db: Database['db'], token: string, name: string, args: object = {}) => {
	const { body } = await rpc(db, token, 'tools/call', { name, arguments: args });
	const text = body.result.content[0].text as string;
	return {
		isError: Boolean(body.result.isError),
		text,
		data: body.result.isError ? null : JSON.parse(text)
	};
};

const toolNames = async (db: Database['db'], token: string) =>
	((await rpc(db, token, 'tools/list')).body.result.tools as { name: string }[]).map((t) => t.name);

const shiftArgs = (areaId: string) => ({
	areaId,
	title: 'Abbau',
	date: '2027-06-13',
	start: '22:00',
	end: '02:00',
	positions: [{ name: 'Team', capacity: 3 }]
});

describe('MCP endpoint', () => {
	it('asks for authorization without a valid token', async () => {
		const s = await seed(['mcp.use']);
		const res = await rpc(s.db, null, 'tools/list');
		expect(res.status).toBe(401);
		expect(res.headers.get('www-authenticate')).toContain('resource_metadata=');
		expect((await rpc(s.db, 'nonsense', 'tools/list')).status).toBe(401);
	});

	it('refuses people without the permission', async () => {
		const s = await seed(['shift.manage']);
		expect((await rpc(s.db, await s.token('write'), 'tools/list')).status).toBe(403);
	});

	it('acts with the person’s own permissions only', async () => {
		const s = await seed(['mcp.use', 'shift.manage', 'assignment.manage']);
		const token = await s.token('write');
		const names = await toolNames(s.db, token);
		expect(names).toEqual(expect.arrayContaining(['list_shifts', 'create_shift', 'assign_person']));
		// Mail and points are off by default.
		expect(names).not.toContain('publish_news');
		expect(names).not.toContain('adjust_points');

		const created = await call(s.db, token, 'create_shift', shiftArgs(s.bar.id));
		expect(created.isError).toBe(false);
		// Overnight: 22:00 local on the 13th until 02:00 on the 14th.
		expect([created.data.start, created.data.end]).toEqual([
			'2027-06-13 22:00',
			'2027-06-14 02:00'
		]);

		const elsewhere = await call(s.db, token, 'create_shift', shiftArgs(s.build.id));
		expect(elsewhere.isError).toBe(true);
		expect(elsewhere.text).toBe('Dafür fehlen dir die Rechte.');

		const list = await call(s.db, token, 'list_shifts');
		expect(list.data.count).toBe(2);
	});

	it('offers only reading tools on read-only connections', async () => {
		const s = await seed(['mcp.use', 'shift.manage']);
		const names = await toolNames(s.db, await s.token('read'));
		expect(names).toContain('list_shifts');
		expect(names).not.toContain('create_shift');
	});

	it('hides names when the admin chose pseudonyms', async () => {
		const s = await seed(['mcp.use', 'shift.manage', 'assignment.manage', 'helper.contact.view']);
		await updateSettings(s.db, actor, { mcpPersonalData: 'pseudonymous' });
		const token = await s.token('write');
		const added = await call(s.db, token, 'assign_person', {
			positionId: (await call(s.db, token, 'get_shift', { shiftId: s.shift.id })).data.positions[0]
				.id,
			userId: s.lead.id
		});
		expect(added.isError).toBe(false);
		const shift = await call(s.db, token, 'get_shift', { shiftId: s.shift.id });
		expect(shift.data.people[0].name).toMatch(/^Person [0-9A-F]{6}$/);
		expect(shift.text).not.toContain('Lea');
		expect(shift.text).not.toContain('lead@x.org');

		// Searching by name must not map names to pseudonyms; the pseudonym itself is found.
		const byName = await call(s.db, token, 'find_people', { query: 'Lea' });
		expect(byName.data).toEqual([]);
		const pseudonym = shift.data.people[0].name as string;
		const byPseudonym = await call(s.db, token, 'find_people', { query: pseudonym });
		expect(byPseudonym.data.map((p: { userId: string }) => p.userId)).toEqual([s.lead.id]);
	});

	it('keeps the new tool groups off until an admin switches them on', async () => {
		const s = await seed(['mcp.use', 'shift.manage', 'role.assign']);
		const names = await toolNames(s.db, await s.token('write'));
		// Reading is always there …
		expect(names).toEqual(expect.arrayContaining(['my_overview', 'list_roles', 'list_waves']));
		// … changing only with the group switched on.
		for (const name of [
			'assign_role',
			'update_settings',
			'my_book',
			'create_goodie',
			'copy_edition'
		])
			expect(names).not.toContain(name);
	});

	it('offers everything an admin can do – except the crown jewels', async () => {
		const s = await seed(['mcp.use']);
		await s.db.update(users).set({ isAdmin: true }).where(eq(users.id, s.lead.id));
		await updateSettings(s.db, actor, { mcpTools: [...MCP_TOOL_GROUPS] });
		const token = await s.token('write');
		const names = await toolNames(s.db, token);
		expect(names).toEqual(
			expect.arrayContaining([
				'update_area',
				'create_wave',
				'set_attendance',
				'create_role',
				'assign_role',
				'create_qualification',
				'review_qualification',
				'update_person',
				'create_goodie',
				'hand_out_goodie',
				'copy_edition',
				'update_settings',
				'save_mail_template',
				'update_news',
				'my_book',
				'my_claim_goodie'
			])
		);
		for (const forbidden of ['set_admin', 'delete_account', 'create_reset_link', 'change_password'])
			expect(names).not.toContain(forbidden);

		// Roles and qualifications can now be set up through the assistant.
		const qual = await call(s.db, token, 'create_qualification', { name: 'Erste Hilfe' });
		expect(qual.isError).toBe(false);
		const role = await call(s.db, token, 'create_role', {
			name: 'Barleitung',
			permissions: ['shift.manage', 'assignment.manage']
		});
		expect(role.isError).toBe(false);
		const assigned = await call(s.db, token, 'assign_role', {
			userId: s.lead.id,
			roleId: role.data.id,
			areaId: s.bar.id
		});
		expect(assigned.isError).toBe(false);
		const crew = await call(s.db, token, 'list_role_assignments', { areaId: s.bar.id });
		expect(crew.data.map((r: { role: string }) => r.role)).toContain('Barleitung');

		// Settings change, but the assistant settings themselves are out of reach.
		const changed = await call(s.db, token, 'update_settings', {
			festivalName: 'Unifest',
			mcpTools: [],
			mcpPersonalData: 'full'
		});
		expect(changed.isError).toBe(false);
		invalidateSettingsCache();
		const settings = await getSettings(s.db);
		expect(settings.festivalName).toBe('Unifest');
		expect(settings.mcpTools).toEqual([...MCP_TOOL_GROUPS]);
		expect(settings.mcpPersonalData).toBe('names');

		// The e-mail address is never changed through an assistant.
		const renamed = await call(s.db, token, 'update_person', {
			userId: s.lead.id,
			firstName: 'Lena',
			email: 'evil@x.org'
		});
		expect(renamed.isError).toBe(false);
		const [after] = await s.db.select().from(users).where(eq(users.id, s.lead.id));
		expect([after.firstName, after.email]).toEqual(['Lena', 'lead@x.org']);
	});

	it('does not let leads do what only admins may', async () => {
		const s = await seed(['mcp.use', 'role.assign']);
		await updateSettings(s.db, actor, { mcpTools: [...MCP_TOOL_GROUPS] });
		const token = await s.token('write');
		const role = await call(s.db, token, 'create_role', { name: 'Chef', permissions: [] });
		expect(role.isError).toBe(true);
		const settings = await call(s.db, token, 'update_settings', { festivalName: 'X' });
		expect(settings.isError).toBe(true);
	});

	it('books and cancels shifts for the signed-in person', async () => {
		const s = await seed(['mcp.use']);
		await updateSettings(s.db, actor, { mcpTools: ['self'] });
		const token = await s.token('write');
		const bookable = await call(s.db, token, 'my_bookable_shifts');
		const positionId = bookable.data.shifts[0].positions[0].positionId as string;
		const booked = await call(s.db, token, 'my_book', { positionId });
		expect(booked.data.status).toBe('booked');
		const mine = await call(s.db, token, 'my_overview');
		expect(mine.data.assignments.map((a: { title: string }) => a.title)).toEqual(['Theke']);
		const cancelled = await call(s.db, token, 'my_cancel', {
			assignmentId: booked.data.assignmentId
		});
		expect(cancelled.isError).toBe(false);
	});

	it('changes only the given fields of existing positions', async () => {
		const s = await seed(['mcp.use', 'shift.manage']);
		const token = await s.token('write');
		const created = await call(s.db, token, 'create_shift', {
			...shiftArgs(s.bar.id),
			positions: [{ name: 'Team', capacity: 3, description: 'Gläser spülen', pointsPerHour: 2 }]
		});
		const positionId = created.data.positions[0].id as string;

		const updated = await call(s.db, token, 'update_shift', {
			shiftId: created.data.id,
			positions: [{ id: positionId, capacity: 5 }]
		});
		expect(updated.isError).toBe(false);
		const shift = await call(s.db, token, 'get_shift', { shiftId: created.data.id });
		expect(shift.data.positions[0]).toMatchObject({
			name: 'Team',
			capacity: 5,
			description: 'Gläser spülen',
			pointsPerHour: 2,
			requiredQualificationIds: []
		});

		const incomplete = await call(s.db, token, 'update_shift', {
			shiftId: created.data.id,
			positions: [{ id: positionId }, { capacity: 2 }]
		});
		expect(incomplete.isError).toBe(true);
	});
});
