import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { isHexColor, normalizeHex } from '#lib/domain/color.ts';
import { NEWS_AUDIENCES } from '#lib/domain/news.ts';
import { isWallTime, zonedToUtc } from '#lib/domain/time.ts';
import { LOCALES } from '#lib/i18n/index.ts';
import { news } from '../db/schema.ts';
import {
	MAIL_TEMPLATES,
	TEMPLATE_PLACEHOLDERS,
	templateText,
	unknownPlaceholders
} from '../notifications.ts';
import { discardMails, outboxLog, outboxProblems, outboxStatus, retryMails } from '../outbox.ts';
import { copyEdition } from '../services/edition-copy.ts';
import {
	createEdition,
	getEdition,
	makeCurrentEdition,
	setEditionArchived,
	updateEdition
} from '../services/editions.ts';
import { listTemplateOverrides, resetTemplate, saveTemplate } from '../services/mail-templates.ts';
import { deleteNews, manageableNews, mayManage, updateNews } from '../services/news.ts';
import {
	getSettings,
	invalidateSettingsCache,
	publicSettings,
	updateSettings,
	type SettingsUpdate
} from '../services/settings.ts';
import { editionParam, isoDate, ToolError, type Kit } from './kit.ts';

const count = (max: number) => z.number().int().min(0).max(max);
const url = z
	.string()
	.max(500)
	.refine((v) => v === '' || /^https?:\/\/\S+$/.test(v), 'Use an http(s) address or ""');
const email = z
	.string()
	.max(300)
	.refine((v) => v === '' || z.email().safeParse(v).success, 'Use an e-mail address or ""');
const color = z.string().refine(isHexColor, 'Use a colour like #1d4ed8');
const time = z.string().refine(isWallTime, 'Use HH:MM');

/**
 * Instance settings an assistant may change. Not here on purpose: the assistant settings
 * themselves (tool groups, personal data, redirect hosts) and uploaded images.
 */
const settingsShape = {
	festivalName: z.string().min(1).max(100),
	taglineDe: z.string().max(200),
	taglineEn: z.string().max(200),
	primaryColor: color,
	accentColor: color,
	contactEmail: email,
	helpUrl: url,
	defaultLocale: z.enum(LOCALES),
	timezone: z
		.string()
		.max(64)
		.refine((tz) => {
			try {
				new Intl.DateTimeFormat('en', { timeZone: tz });
				return true;
			} catch {
				return false;
			}
		}, 'Unknown time zone'),
	registrationOpen: z.boolean(),
	cancelDeadlineHours: count(24 * 60).describe(
		'Default hours before start until which helpers may cancel'
	),
	pointsPerShift: count(10000),
	pointsPerHour: count(10000),
	nightBonus: count(10000).describe('Extra points per night hour'),
	nightStart: time,
	nightEnd: time,
	lastMinuteBonus: count(10000),
	lastMinuteHours: count(10000),
	reminderHours: count(10000).describe('Reminder e-mail this many hours before a shift; 0 = off'),
	waitlistEnabled: z.boolean(),
	swapEnabled: z.boolean(),
	swapNeedsApproval: z.boolean(),
	buddyGroupsEnabled: z.boolean(),
	buddyGroupMaxSize: z.number().int().min(2).max(50),
	groupHoldHours: z
		.number()
		.int()
		.min(1)
		.max(24 * 14),
	mapTileUrl: z
		.string()
		.max(300)
		.refine(
			(v) => /^https:\/\/[^\s]+\{z\}[^\s]*\{x\}[^\s]*\{y\}/.test(v),
			'Needs {z}, {x} and {y}'
		),
	mapAttribution: z.string().max(300),
	minBreakMinutes: count(24 * 60).describe('Minimum break between two shifts of one person'),
	errorAlerts: z.boolean()
};

const legalShape = {
	legalName: z.string().max(200),
	legalAddress: z.string().max(500),
	legalRepresentative: z.string().max(500),
	legalEmail: email,
	legalPhone: z.string().max(50),
	legalRegister: z.string().max(300),
	legalVatId: z.string().max(50),
	imprintExtraDe: z.string().max(5000),
	imprintExtraEn: z.string().max(5000),
	privacyOfficer: z.string().max(500),
	privacyDe: z.string().max(60_000).describe('Privacy policy (Markdown)'),
	privacyEn: z.string().max(60_000),
	imprintUrl: url.describe('External imprint instead of the built-in one'),
	privacyUrl: url,
	retentionMonths: z.number().int().min(0).max(240).describe('Inactive accounts are deleted after'),
	auditIpDays: z.number().int().min(1).max(3650)
};

const optional = <S extends Record<string, z.ZodType>>(shape: S) =>
	Object.fromEntries(Object.entries(shape).map(([key, v]) => [key, v.optional()])) as unknown as {
		[K in keyof S]: z.ZodOptional<S[K]>;
	};

/** Drops keys that were not given. */
const given = (a: Record<string, unknown>) =>
	Object.fromEntries(Object.entries(a).filter(([, v]) => v !== undefined));

export function registerInstanceTools(k: Kit) {
	const { ctx, tool, scope, require, requireAdmin, enabled, pick, local, tz } = k;
	const showAddresses = ctx.settings.mcpPersonalData === 'full';

	// -- reading --------------------------------------------------------------------

	tool(
		'get_settings',
		{
			title: 'Get settings',
			description:
				'Instance settings (festival, booking rules, points, swaps, groups, map, legal details). Administrators only.',
			input: {
				includeLegalTexts: z
					.boolean()
					.optional()
					.describe('Also return the long privacy/imprint texts')
			},
			readOnly: true
		},
		async ({ includeLegalTexts }) => {
			requireAdmin();
			invalidateSettingsCache();
			const settings = await getSettings(ctx.db);
			const pub = publicSettings(settings);
			return {
				...pub,
				...(includeLegalTexts
					? {
							privacyDe: settings.privacyDe,
							privacyEn: settings.privacyEn,
							imprintExtraDe: settings.imprintExtraDe,
							imprintExtraEn: settings.imprintExtraEn
						}
					: {})
			};
		}
	);

	tool(
		'list_news',
		{
			title: 'List news',
			description: 'News posts of an edition you may edit, newest first.',
			input: editionParam,
			readOnly: true
		},
		async ({ editionId }) => {
			const s = await scope(editionId);
			require(s.authz.canSomewhere('mail.send'));
			return (await manageableNews(ctx.db, s.authz, s.edition.id)).map((p) => ({
				id: p.id,
				title: p.titleDe,
				audience: p.audience,
				areaId: p.areaId,
				shiftId: p.shiftId,
				roleId: p.roleId,
				pinned: p.pinned,
				mailed: p.mailed,
				published: local(p.publishedAt),
				body: p.bodyDe.length > 500 ? `${p.bodyDe.slice(0, 500)} …` : p.bodyDe
			}));
		}
	);

	tool(
		'list_mail_templates',
		{
			title: 'List e-mail templates',
			description:
				'The texts of automatic e-mails per language, with their placeholders and whether they were customised. Administrators only.',
			input: { key: z.enum(MAIL_TEMPLATES).optional() },
			readOnly: true
		},
		async ({ key }) => {
			requireAdmin();
			const overrides = await listTemplateOverrides(ctx.db);
			const keys = key ? [key] : [...MAIL_TEMPLATES];
			const result = [];
			for (const k_ of keys) {
				const versions = [];
				for (const locale of LOCALES)
					versions.push({
						locale,
						...(await templateText(ctx.db, k_, locale)),
						customised: overrides.some((o) => o.key === k_ && o.locale === locale)
					});
				result.push({ key: k_, placeholders: TEMPLATE_PLACEHOLDERS[k_], versions });
			}
			return result;
		}
	);

	tool(
		'get_outbox',
		{
			title: 'E-mail outbox',
			description:
				'Queued and failed e-mails and the mail history (searchable). Administrators only.',
			input: {
				query: z.string().max(100).optional(),
				page: z.number().int().min(0).max(1000).optional()
			},
			readOnly: true
		},
		async ({ query, page }) => {
			requireAdmin();
			const to = (address: string) => (showAddresses ? address : null);
			const [status, problems, history] = await Promise.all([
				outboxStatus(ctx.db),
				outboxProblems(ctx.db),
				// Searching by address would reveal addresses the assistant may not see.
				outboxLog(ctx.db, showAddresses ? (query ?? '') : '', page ?? 0, 50)
			]);
			return {
				status,
				problems: problems.map((m) => ({
					id: m.id,
					to: to(m.to),
					subject: m.subject,
					created: local(m.createdAt),
					attempts: m.attempts,
					lastError: m.lastError ?? ''
				})),
				history: {
					total: history.total,
					mails: history.mails.map((m) => ({
						id: m.id,
						to: to(m.to),
						subject: m.subject,
						state: m.state,
						at: local(m.sentAt ?? m.createdAt)
					}))
				}
			};
		}
	);

	// -- news (mail group) ------------------------------------------------------------

	if (enabled('mail')) {
		async function postFor(editionId: string | undefined, id: string) {
			const s = await scope(editionId);
			require(s.authz.canSomewhere('mail.send'));
			const [post] = await ctx.db
				.select()
				.from(news)
				.where(and(eq(news.id, id), eq(news.editionId, s.edition.id)));
			if (!post || !(await mayManage(ctx.db, s.authz, post)))
				throw new ToolError(k.t('error.notFound'));
			return { s, post };
		}

		tool(
			'update_news',
			{
				title: 'Update news',
				description: 'Corrects a news post. Only given fields change. Nothing is e-mailed again.',
				input: {
					...editionParam,
					newsId: z.string().uuid(),
					audience: z.enum(NEWS_AUDIENCES).optional(),
					areaId: z.string().uuid().nullable().optional(),
					shiftId: z.string().uuid().nullable().optional(),
					roleId: z.string().uuid().nullable().optional(),
					title: z.string().min(1).max(200).optional(),
					body: z.string().min(1).max(20_000).optional(),
					titleEn: z.string().max(200).optional(),
					bodyEn: z.string().max(20_000).optional(),
					pinned: z.boolean().optional(),
					pinnedUntil: isoDate.nullable().optional().describe('Last day the post stays pinned')
				}
			},
			async (a) => {
				const { s, post } = await postFor(a.editionId, a.newsId);
				const pinned = pick(a.pinned, post.pinned);
				const pinnedUntil =
					a.pinnedUntil === undefined
						? post.pinnedUntil
						: a.pinnedUntil
							? zonedToUtc(a.pinnedUntil, '23:59', tz)
							: null;
				await updateNews(ctx.db, ctx.actor, s.authz, s.edition.id, post.id, {
					audience: pick(a.audience, post.audience),
					areaId: pick(a.areaId, post.areaId),
					shiftId: pick(a.shiftId, post.shiftId),
					roleId: pick(a.roleId, post.roleId),
					titleDe: pick(a.title, post.titleDe),
					titleEn: pick(a.titleEn, post.titleEn),
					bodyDe: pick(a.body, post.bodyDe),
					bodyEn: pick(a.bodyEn, post.bodyEn),
					pinned,
					pinnedUntil: pinned ? pinnedUntil : null
				});
				return { id: post.id, updated: true };
			}
		);

		tool(
			'delete_news',
			{
				title: 'Delete news',
				description: 'Deletes a news post (e-mails already sent stay sent).',
				input: { ...editionParam, newsId: z.string().uuid() },
				destructive: true
			},
			async ({ editionId, newsId }) => {
				const { s, post } = await postFor(editionId, newsId);
				await deleteNews(ctx.db, ctx.actor, s.authz, s.edition.id, post.id);
				return { deleted: post.id };
			}
		);
	}

	// -- editions -------------------------------------------------------------------------

	if (enabled('editions')) {
		tool(
			'create_edition',
			{
				title: 'Create edition',
				description:
					'Creates an empty festival year. Administrators only. To start from last year, use copy_edition.',
				input: { name: z.string().min(1).max(100), startsOn: isoDate, endsOn: isoDate }
			},
			async (a) => {
				requireAdmin();
				const edition = await createEdition(ctx.db, ctx.actor, a);
				return { id: edition.id, name: edition.name, current: edition.isCurrent };
			}
		);

		tool(
			'copy_edition',
			{
				title: 'Copy edition',
				description:
					'Creates a new festival year from an existing one: areas always, optionally places, shifts (moved by the same number of days), goodies, role assignments and booking waves (default: places, shifts and goodies yes, roles and waves no). Nobody is booked. Administrators only.',
				input: {
					sourceId: z.string().uuid(),
					name: z.string().min(1).max(100),
					startsOn: isoDate.describe('First day of the new edition'),
					places: z.boolean().optional(),
					shifts: z.boolean().optional(),
					goodies: z.boolean().optional(),
					roles: z.boolean().optional(),
					waves: z.boolean().optional()
				}
			},
			async (a) => {
				requireAdmin();
				const edition = await copyEdition(ctx.db, ctx.actor, a.sourceId, {
					name: a.name,
					startsOn: a.startsOn,
					places: a.places ?? true,
					shifts: a.shifts ?? true,
					goodies: a.goodies ?? true,
					roles: a.roles ?? false,
					waves: a.waves ?? false
				});
				return {
					id: edition.id,
					name: edition.name,
					startsOn: edition.startsOn,
					endsOn: edition.endsOn
				};
			}
		);

		tool(
			'update_edition',
			{
				title: 'Update edition',
				description:
					'Renames an edition or changes its dates (shifts are not moved). Administrators only.',
				input: {
					editionId: z.string().uuid(),
					name: z.string().min(1).max(100).optional(),
					startsOn: isoDate.optional(),
					endsOn: isoDate.optional()
				}
			},
			async (a) => {
				requireAdmin();
				const edition = await getEdition(ctx.db, a.editionId);
				if (!edition) throw new ToolError(k.t('error.notFound'));
				await updateEdition(ctx.db, ctx.actor, edition.id, {
					name: pick(a.name, edition.name),
					startsOn: pick(a.startsOn, edition.startsOn),
					endsOn: pick(a.endsOn, edition.endsOn)
				});
				return { id: edition.id, updated: true };
			}
		);

		tool(
			'make_current_edition',
			{
				title: 'Make edition current',
				description:
					'Switches the whole system to another festival year: helpers then see and book its shifts. Without confirm: true it only explains. Administrators only.',
				input: { editionId: z.string().uuid(), confirm: z.boolean().optional() }
			},
			async ({ editionId, confirm }) => {
				requireAdmin();
				const edition = await getEdition(ctx.db, editionId);
				if (!edition) throw new ToolError(k.t('error.notFound'));
				if (!confirm)
					return {
						preview: true,
						edition: edition.name,
						note: 'All helpers will see this edition from now on. Repeat with confirm: true.'
					};
				await makeCurrentEdition(ctx.db, ctx.actor, edition.id);
				return { current: edition.id };
			}
		);

		tool(
			'set_edition_archived',
			{
				title: 'Archive edition',
				description:
					'Archives (read-only, hidden from lists) or un-archives a past edition. Administrators only.',
				input: { editionId: z.string().uuid(), archived: z.boolean() }
			},
			async ({ editionId, archived }) => {
				requireAdmin();
				await setEditionArchived(ctx.db, ctx.actor, editionId, archived);
				return { editionId, archived };
			}
		);
	}

	// -- settings, legal texts, e-mail templates and outbox -------------------------------------

	if (!enabled('settings')) return;

	tool(
		'update_settings',
		{
			title: 'Update settings',
			description:
				'Changes instance settings. Only given fields change. The AI-assistant settings and images can only be changed in Wichtel itself. Administrators only.',
			input: optional(settingsShape)
		},
		async (a) => {
			requireAdmin();
			const update: SettingsUpdate = given(a);
			if (update.primaryColor) update.primaryColor = normalizeHex(update.primaryColor);
			if (update.accentColor) update.accentColor = normalizeHex(update.accentColor);
			if (update.contactEmail) update.contactEmail = update.contactEmail.trim().toLowerCase();
			if (Object.keys(update).length === 0) throw new ToolError('Nothing to change.');
			await updateSettings(ctx.db, ctx.actor, update);
			return { updated: Object.keys(update) };
		}
	);

	tool(
		'update_legal',
		{
			title: 'Update legal details',
			description:
				'Changes imprint and privacy details and texts, data retention and how long IP addresses are kept in the log. Only given fields change. Administrators only.',
			input: optional(legalShape)
		},
		async (a) => {
			requireAdmin();
			const update: SettingsUpdate = given(a);
			if (update.legalEmail) update.legalEmail = update.legalEmail.trim().toLowerCase();
			if (Object.keys(update).length === 0) throw new ToolError('Nothing to change.');
			await updateSettings(ctx.db, ctx.actor, update);
			return { updated: Object.keys(update) };
		}
	);

	tool(
		'save_mail_template',
		{
			title: 'Save e-mail template',
			description:
				'Replaces the text of an automatic e-mail in one language. Placeholders in braces like {name} are filled in (see list_mail_templates). Administrators only.',
			input: {
				key: z.enum(MAIL_TEMPLATES),
				locale: z.enum(LOCALES),
				subject: z.string().min(1).max(300),
				body: z.string().min(1).max(10_000)
			}
		},
		async (a) => {
			requireAdmin();
			await saveTemplate(ctx.db, ctx.actor, a);
			const unknown = unknownPlaceholders(a.key, `${a.subject}\n${a.body}`);
			return {
				saved: `${a.key}:${a.locale}`,
				...(unknown.length > 0
					? {
							warning: `Not a placeholder of this e-mail (kept as typed): ${unknown.map((n) => `{${n}}`).join(', ')}`
						}
					: {})
			};
		}
	);

	tool(
		'reset_mail_template',
		{
			title: 'Reset e-mail template',
			description: 'Goes back to the built-in text of an automatic e-mail. Administrators only.',
			input: { key: z.enum(MAIL_TEMPLATES), locale: z.enum(LOCALES) },
			destructive: true
		},
		async ({ key, locale }) => {
			requireAdmin();
			await resetTemplate(ctx.db, ctx.actor, key, locale);
			return { reset: `${key}:${locale}` };
		}
	);

	tool(
		'retry_mails',
		{
			title: 'Retry e-mails',
			description:
				'Puts failed e-mails back into the queue (ids from get_outbox). Administrators only.',
			input: { ids: z.array(z.string().uuid()).min(1).max(500) }
		},
		async ({ ids }) => {
			requireAdmin();
			await retryMails(ctx.db, ctx.actor, ids, ctx.now());
			return { retried: ids.length };
		}
	);

	tool(
		'discard_mails',
		{
			title: 'Discard e-mails',
			description:
				'Removes queued or failed e-mails so they are never sent (ids from get_outbox). Administrators only.',
			input: { ids: z.array(z.string().uuid()).min(1).max(500) },
			destructive: true
		},
		async ({ ids }) => {
			requireAdmin();
			await discardMails(ctx.db, ctx.actor, ids);
			return { discarded: ids.length };
		}
	);
}
