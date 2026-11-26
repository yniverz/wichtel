import { z } from 'zod';
import { involvedInEdition } from '../desk.ts';
import { getPerson } from '../services/people.ts';
import {
	cancelClaim,
	claimStats,
	createGoodie,
	deleteGoodie,
	getGoodie,
	goodieOverview,
	issueClaim,
	issueDirectly,
	listGoodies,
	markRefunded,
	updateGoodie,
	type GoodieInput
} from '../services/goodies.ts';
import { pointsHistory } from '../services/points.ts';
import { editionParam, ToolError, type Kit, type Scope } from './kit.ts';

const goodieShape = {
	nameEn: z.string().max(100).optional(),
	description: z.string().max(1000).optional(),
	descriptionEn: z.string().max(1000).optional(),
	price: z.number().int().min(0).max(100_000).optional().describe('In points'),
	maxPerPerson: z.number().int().min(1).max(100).optional(),
	selfServiceLimit: z
		.number()
		.int()
		.min(0)
		.max(1440)
		.nullable()
		.optional()
		.describe('How many helpers may pick it themselves; the rest only at the desk. null = all'),
	stock: z.number().int().min(0).max(1440).nullable().optional().describe('null = unlimited'),
	variants: z.array(z.string().min(1).max(50)).max(30).optional().describe('e.g. sizes S, M, L'),
	requiredAreaIds: z
		.array(z.string().uuid())
		.max(100)
		.optional()
		.describe('Only for people who helped in one of these areas; empty = everyone'),
	pickupPlaceId: z.string().uuid().nullable().optional(),
	pickupInfo: z.string().max(300).optional(),
	mandatory: z.boolean().optional().describe('Redeemed automatically as soon as points allow'),
	mandatoryPriority: z.number().int().min(0).max(1000).optional(),
	refundable: z.boolean().optional(),
	advance: z.boolean().optional().describe('May be picked with points not earned yet'),
	active: z.boolean().optional(),
	sortOrder: z.number().int().min(-9999).max(9999).optional()
};

export function registerGoodieTools(k: Kit) {
	const { ctx, tool, scope, require, enabled, pick, nameOf, local } = k;

	const deskAccess = (s: Scope) => ({
		issue: s.authz.canSomewhere('goodie.issue'),
		any:
			s.authz.canSomewhere('goodie.issue') ||
			s.authz.canSomewhere('attendance.confirm') ||
			s.authz.can('points.adjust') ||
			s.authz.can('goodie.manage')
	});
	/** Desk staff only reach people who take part in the edition, not every account. */
	async function deskPerson(s: Scope, userId: string) {
		const p = await getPerson(ctx.db, userId);
		if (!p || p.deletedAt) throw new ToolError(k.t('error.notFound'));
		if (!s.authz.isAdmin && !(await involvedInEdition(ctx.db, [p.id], s.edition.id)).has(p.id))
			throw new ToolError(k.t('error.notFound'));
		return p;
	}

	// -- reading --------------------------------------------------------------------

	tool(
		'list_goodies',
		{
			title: 'List goodies',
			description:
				'Goodies of an edition (rewards for points) with how many were picked and issued.',
			input: editionParam,
			readOnly: true
		},
		async ({ editionId }) => {
			const s = await scope(editionId);
			require(deskAccess(s).any);
			const [list, stats] = await Promise.all([
				listGoodies(ctx.db, s.edition.id),
				claimStats(ctx.db, s.edition.id)
			]);
			return list.map((g) => ({
				id: g.id,
				name: g.nameDe,
				nameEn: g.nameEn,
				description: g.descriptionDe,
				price: g.price,
				maxPerPerson: g.maxPerPerson,
				selfServiceLimit: g.selfServiceLimit,
				stock: g.stock,
				variants: g.variants,
				requiredAreaIds: g.requiredAreaIds,
				pickupPlaceId: g.pickupPlaceId,
				pickupInfo: g.pickupInfo,
				mandatory: g.mandatory,
				refundable: g.refundable,
				advance: g.advance,
				active: g.active,
				claims: stats.get(g.id) ?? {}
			}));
		}
	);

	tool(
		'get_person_goodies',
		{
			title: 'Goodies and points of a person',
			description:
				'Like the volunteer desk: a person’s points, open goodie picks (to issue) and recent point history.',
			input: { ...editionParam, userId: z.string().uuid() },
			readOnly: true
		},
		async ({ editionId, userId }) => {
			const s = await scope(editionId);
			require(deskAccess(s).any);
			const p = await deskPerson(s, userId);
			const [overview, history] = await Promise.all([
				goodieOverview(ctx.db, p.id, s.edition.id),
				pointsHistory(ctx.db, p.id, s.edition.id)
			]);
			return {
				name: nameOf(p),
				balance: overview.balance,
				pending: overview.pending,
				reserved: overview.reserved,
				claims: overview.claims.map(({ claim, goodie }) => ({
					claimId: claim.id,
					goodie: goodie.nameDe,
					variant: claim.variant,
					status: claim.status
				})),
				available: overview.goodies
					.filter((g) => g.active)
					.map((g) => ({
						goodieId: g.id,
						name: g.nameDe,
						price: g.price,
						variants: g.variants,
						availability: g.availability
					})),
				history: history.slice(0, 20).map((h) => ({ ...h, createdAt: local(h.createdAt) }))
			};
		}
	);

	if (!enabled('goodies')) return;

	// -- goodie definitions ----------------------------------------------------------------

	const input = (
		a: { name?: string } & { [K in keyof typeof goodieShape]?: z.infer<(typeof goodieShape)[K]> },
		base: GoodieInput,
		validAreas: Set<string>
	): GoodieInput => ({
		nameDe: pick(a.name, base.nameDe),
		nameEn: pick(a.nameEn, base.nameEn),
		descriptionDe: pick(a.description, base.descriptionDe),
		descriptionEn: pick(a.descriptionEn, base.descriptionEn),
		price: pick(a.price, base.price),
		maxPerPerson: pick(a.maxPerPerson, base.maxPerPerson),
		selfServiceLimit: pick(a.selfServiceLimit, base.selfServiceLimit),
		stock: pick(a.stock, base.stock),
		variants: [...new Set(pick(a.variants, base.variants))],
		requiredAreaIds: pick(a.requiredAreaIds, base.requiredAreaIds).filter((id) =>
			validAreas.has(id)
		),
		pickupPlaceId: pick(a.pickupPlaceId, base.pickupPlaceId),
		pickupInfo: pick(a.pickupInfo, base.pickupInfo),
		mandatory: pick(a.mandatory, base.mandatory),
		mandatoryPriority: pick(a.mandatoryPriority, base.mandatoryPriority),
		refundable: pick(a.refundable, base.refundable),
		advance: pick(a.advance, base.advance),
		active: pick(a.active, base.active),
		sortOrder: pick(a.sortOrder, base.sortOrder)
	});
	const areaIdsOf = (s: Scope) => new Set(s.tree.flat().map((e) => e.area.id));

	tool(
		'create_goodie',
		{
			title: 'Create goodie',
			description: 'Adds a goodie helpers can get for their points (shirt, food voucher …).',
			input: { ...editionParam, name: z.string().min(1).max(100), ...goodieShape }
		},
		async (a) => {
			const s = await scope(a.editionId);
			require(s.authz.can('goodie.manage'));
			const goodie = await createGoodie(
				ctx.db,
				ctx.actor,
				s.edition.id,
				input(
					a,
					{
						nameDe: a.name,
						nameEn: '',
						descriptionDe: '',
						descriptionEn: '',
						price: 1,
						maxPerPerson: 1,
						selfServiceLimit: null,
						stock: null,
						variants: [],
						requiredAreaIds: [],
						pickupPlaceId: null,
						pickupInfo: '',
						mandatory: false,
						mandatoryPriority: 0,
						refundable: false,
						advance: false,
						active: true,
						sortOrder: 0
					},
					areaIdsOf(s)
				)
			);
			return { id: goodie.id, name: goodie.nameDe };
		}
	);

	async function goodieFor(s: Scope, goodieId: string) {
		const goodie = await getGoodie(ctx.db, goodieId);
		if (!goodie || goodie.editionId !== s.edition.id) throw new ToolError(k.t('error.notFound'));
		return goodie;
	}

	tool(
		'update_goodie',
		{
			title: 'Update goodie',
			description: 'Changes a goodie. Only given fields change.',
			input: {
				...editionParam,
				goodieId: z.string().uuid(),
				name: z.string().min(1).max(100).optional(),
				...goodieShape
			}
		},
		async (a) => {
			const s = await scope(a.editionId);
			require(s.authz.can('goodie.manage'));
			const goodie = await goodieFor(s, a.goodieId);
			await updateGoodie(ctx.db, ctx.actor, goodie.id, input(a, goodie, areaIdsOf(s)));
			return { id: goodie.id, updated: true };
		}
	);

	tool(
		'delete_goodie',
		{
			title: 'Delete goodie',
			description: 'Deletes a goodie (only possible while nobody has picked it).',
			input: { ...editionParam, goodieId: z.string().uuid() },
			destructive: true
		},
		async ({ editionId, goodieId }) => {
			const s = await scope(editionId);
			require(s.authz.can('goodie.manage'));
			const goodie = await goodieFor(s, goodieId);
			await deleteGoodie(ctx.db, ctx.actor, goodie.id);
			return { deleted: goodie.id };
		}
	);

	// -- volunteer desk ---------------------------------------------------------------

	const claimInput = { ...editionParam, userId: z.string().uuid(), claimId: z.string().uuid() };
	async function deskClaim(a: { editionId?: string; userId: string }) {
		const s = await scope(a.editionId);
		require(deskAccess(s).issue);
		const p = await deskPerson(s, a.userId);
		return { s, claimScope: { editionId: s.edition.id, userId: p.id } };
	}

	tool(
		'issue_goodie_claim',
		{
			title: 'Issue picked goodie',
			description: 'Hands out a goodie the person picked (claim id from get_person_goodies).',
			input: claimInput
		},
		async (a) => {
			const { claimScope } = await deskClaim(a);
			await issueClaim(ctx.db, ctx.actor, a.claimId, claimScope, ctx.now());
			return { claimId: a.claimId, issued: true };
		}
	);

	tool(
		'cancel_goodie_claim',
		{
			title: 'Cancel goodie pick',
			description: 'Cancels a goodie the person picked but did not get yet; the points come back.',
			input: claimInput,
			destructive: true
		},
		async (a) => {
			const { claimScope } = await deskClaim(a);
			await cancelClaim(ctx.db, ctx.actor, a.claimId, claimScope);
			return { claimId: a.claimId, cancelled: true };
		}
	);

	tool(
		'mark_goodie_refunded',
		{
			title: 'Mark goodie returned',
			description:
				'Confirms a returned goodie (refund requested by the person); the points come back.',
			input: claimInput
		},
		async (a) => {
			const { claimScope } = await deskClaim(a);
			await markRefunded(ctx.db, ctx.actor, a.claimId, claimScope, ctx.now());
			return { claimId: a.claimId, refunded: true };
		}
	);

	tool(
		'hand_out_goodie',
		{
			title: 'Hand out goodie directly',
			description:
				'Gives a person a goodie at the desk without a previous pick; the points are deducted.',
			input: {
				...editionParam,
				userId: z.string().uuid(),
				goodieId: z.string().uuid(),
				variant: z.string().max(50).optional()
			}
		},
		async (a) => {
			const { s } = await deskClaim(a);
			await goodieFor(s, a.goodieId);
			const claim = await issueDirectly(
				ctx.db,
				ctx.actor,
				a.userId,
				a.goodieId,
				a.variant || null,
				ctx.now()
			);
			return { claimId: claim.id, issued: true };
		}
	);
}
