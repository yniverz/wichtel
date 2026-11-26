import { z } from 'zod';
import { utcToZoned } from '#lib/domain/time.ts';
import { LOCALES } from '#lib/i18n/index.ts';
import { bookingOptionsFor } from '../booking-options.ts';
import { directOfferLimiter, groupJoinLimiter } from '../limits.ts';
import { updateProfile } from '../services/accounts.ts';
import {
	acceptHold,
	bookPosition,
	cancelOwnAssignment,
	joinWaitlist,
	listUserAssignments
} from '../services/assignments.ts';
import { getCurrentEdition } from '../services/editions.ts';
import { fieldsFor, listFields } from '../services/fields.ts';
import {
	cancelClaim,
	changeVariant,
	claimGoodie,
	goodieOverview,
	requestRefund
} from '../services/goodies.ts';
import {
	bookForGroup,
	createGroup,
	getGroup,
	joinGroup,
	leaveGroup,
	rotateGroupCode
} from '../services/groups.ts';
import { applyForQualification, listUserQualifications } from '../services/qualifications.ts';
import { getShift, listShifts } from '../services/shifts.ts';
import {
	answerProposal,
	createOffer,
	declineOffer,
	marketOffers,
	offersInvolving,
	takeOffer,
	withdrawOffer
} from '../services/swaps.ts';
import { isoDate, ToolError, type Kit } from './kit.ts';
import { fieldValuesParam, saveFieldAnswers } from './tools-people.ts';

/** What the signed-in person can do for themself, like in the helper app (current edition only). */
export function registerSelfTools(k: Kit) {
	const { ctx, tool, enabled, nameOf, local, tz } = k;
	const me = ctx.user;

	async function currentEdition() {
		const edition = await getCurrentEdition(ctx.db);
		if (!edition) throw new ToolError(k.t('error.notFound'));
		return edition;
	}
	const booking = () => ({ db: ctx.db, now: ctx.now() });

	// -- reading --------------------------------------------------------------------

	tool(
		'my_overview',
		{
			title: 'My shifts and more',
			description:
				'The signed-in person’s own shifts (booked, requested, held for them, waitlisted), running handovers, group, points and goodies in the current edition.',
			input: {},
			readOnly: true
		},
		async () => {
			const edition = await currentEdition();
			const [mine, offers, group, goodies, quals] = await Promise.all([
				listUserAssignments(ctx.db, me.id, edition.id),
				offersInvolving(ctx.db, me.id, edition.id, ctx.now()),
				getGroup(ctx.db, me.id, edition.id),
				goodieOverview(ctx.db, me.id, edition.id),
				listUserQualifications(ctx.db, me.id)
			]);
			const shiftIds = [...new Set(mine.map((a) => a.shiftId))];
			const shiftList = await Promise.all(shiftIds.map((id) => getShift(ctx.db, id)));
			const byId = new Map(shiftList.filter((s) => s !== undefined).map((s) => [s.id, s]));
			return {
				edition: edition.name,
				emailVerified: me.emailVerifiedAt !== null,
				assignments: mine
					.filter((a) => a.status !== 'cancelled')
					.map((a) => {
						const shift = byId.get(a.shiftId);
						return {
							assignmentId: a.id,
							shiftId: a.shiftId,
							title: shift?.titleDe ?? null,
							position: shift?.positions.find((p) => p.id === a.positionId)?.nameDe ?? null,
							start: shift ? local(shift.startsAt) : null,
							end: shift ? local(shift.endsAt) : null,
							status: a.status,
							holdUntil: a.holdUntil ? local(a.holdUntil) : null,
							attendance: a.attendance
						};
					}),
				handovers: offers.map((o) => ({
					offerId: o.id,
					status: o.status,
					shift: `${o.shift.titleDe} ${local(o.shift.startsAt)}`,
					fromMe: o.fromUserId === me.id,
					toMe: o.toUserId === me.id,
					takenByMe: o.takerId === me.id,
					inExchangeFor: o.counter ? `${o.counter.titleDe} ${local(o.counter.startsAt)}` : null
				})),
				group: group
					? {
							name: group.name,
							inviteCode: group.inviteCode,
							members: group.members.map((m) => ({
								userId: m.userId,
								name: nameOf({ id: m.userId, firstName: m.firstName, lastName: m.lastName })
							}))
						}
					: null,
				points: { balance: goodies.balance, pending: goodies.pending, reserved: goodies.reserved },
				goodieClaims: goodies.claims.map(({ claim, goodie }) => ({
					claimId: claim.id,
					goodie: goodie.nameDe,
					variant: claim.variant,
					status: claim.status
				})),
				goodiesAvailable: goodies.goodies
					.filter((g) => g.active)
					.map((g) => ({
						goodieId: g.id,
						name: g.nameDe,
						price: g.price,
						variants: g.variants,
						availability: g.availability
					})),
				qualifications: quals.map(({ entry, qualification }) => ({
					qualificationId: qualification.id,
					name: qualification.nameDe,
					status: entry.status
				}))
			};
		}
	);

	tool(
		'my_bookable_shifts',
		{
			title: 'Shifts I can book',
			description:
				'Upcoming shifts of the current edition the signed-in person can see, with free places and whether booking is open for them.',
			input: {
				from: isoDate.optional(),
				to: isoDate.optional(),
				areaId: z.string().uuid().optional(),
				freeOnly: z.boolean().optional().describe('Only positions with free places (default true)')
			},
			readOnly: true
		},
		async ({ from, to, areaId, freeOnly }) => {
			const edition = await currentEdition();
			const s = await k.scope(edition.id);
			const opts = await bookingOptionsFor(ctx.db, me, edition.id, ctx.now());
			const areaIds = areaId ? [...s.tree.covered([areaId])] : undefined;
			const now = ctx.now().getTime();
			const list = (await listShifts(ctx.db, edition.id, areaIds ? { areaIds } : {}))
				.filter((sh) => sh.startsAt.getTime() > now && opts.canSee(sh))
				.filter((sh) => {
					const day = utcToZoned(sh.startsAt, tz).date;
					return (!from || day >= from) && (!to || day <= to);
				})
				.map((sh) => ({
					shiftId: sh.id,
					title: sh.titleDe,
					area: k.areaPath(s, sh.areaId),
					start: local(sh.startsAt),
					end: local(sh.endsAt),
					bookingOpen: opts.isOpen ? opts.isOpen(sh) : true,
					positions: sh.positions
						.filter((p) => freeOnly === false || p.booked + p.requested < p.capacity)
						.map((p) => ({
							positionId: p.id,
							name: p.nameDe,
							free: Math.max(0, p.capacity - p.booked - p.requested),
							bookingMode: p.bookingMode,
							urgent: p.urgentAt !== null
						}))
				}))
				.filter((sh) => sh.positions.length > 0);
			return { count: list.length, shifts: list.slice(0, 200) };
		}
	);

	tool(
		'my_market_offers',
		{
			title: 'Shifts offered by others',
			description: 'Shifts other helpers give away on the market (take one with my_take_offer).',
			input: {},
			readOnly: true
		},
		async () => {
			const edition = await currentEdition();
			const offers = (await marketOffers(ctx.db, edition.id, ctx.now()))
				.filter((o) => o.fromUserId !== me.id)
				.slice(0, 50);
			const shiftList = await Promise.all(offers.map((o) => getShift(ctx.db, o.shiftId)));
			return offers.map((o, i) => {
				const shift = shiftList[i];
				return {
					offerId: o.id,
					shiftId: o.shiftId,
					title: shift?.titleDe ?? null,
					position: shift?.positions.find((p) => p.id === o.positionId)?.nameDe ?? null,
					start: shift ? local(shift.startsAt) : null,
					end: shift ? local(shift.endsAt) : null
				};
			});
		}
	);

	if (!enabled('self')) return;

	/** Like the helper app: booking needs a confirmed e-mail address. */
	const requireVerified = () => {
		if (!me.emailVerifiedAt) throw new ToolError('Please confirm your e-mail address first.');
	};
	const optsFor = async () => {
		requireVerified();
		const edition = await currentEdition();
		return { edition, opts: await bookingOptionsFor(ctx.db, me, edition.id, ctx.now()) };
	};

	// -- own shifts -------------------------------------------------------------------

	tool(
		'my_book',
		{
			title: 'Book a shift for me',
			description:
				'Books a position for the signed-in person (or requests it if a lead has to confirm).',
			input: { positionId: z.string().uuid() }
		},
		async ({ positionId }) => {
			const { opts } = await optsFor();
			const a = await bookPosition(booking(), me.id, positionId, opts);
			return { assignmentId: a.id, status: a.status };
		}
	);

	tool(
		'my_cancel',
		{
			title: 'Cancel my shift',
			description:
				'Cancels one of the person’s own bookings, requests, waitlist places or reserved (held) places. Only until the cancel deadline.',
			input: { assignmentId: z.string().uuid() },
			destructive: true
		},
		async ({ assignmentId }) => {
			requireVerified();
			await cancelOwnAssignment(booking(), me.id, assignmentId);
			return { cancelled: assignmentId };
		}
	);

	tool(
		'my_join_waitlist',
		{
			title: 'Join waitlist',
			description: 'Puts the person on the waitlist of a full position.',
			input: { positionId: z.string().uuid() }
		},
		async ({ positionId }) => {
			const { opts } = await optsFor();
			const a = await joinWaitlist(booking(), me.id, positionId, opts);
			return { assignmentId: a.id, status: a.status };
		}
	);

	tool(
		'my_accept_hold',
		{
			title: 'Accept reserved place',
			description: 'Accepts a place someone from the group reserved for the person.',
			input: { assignmentId: z.string().uuid() }
		},
		async ({ assignmentId }) => {
			requireVerified();
			await acceptHold(booking(), me.id, assignmentId);
			return { accepted: assignmentId };
		}
	);

	tool(
		'my_offer_shift',
		{
			title: 'Give my shift away',
			description:
				'Offers one of the person’s booked shifts on the market, or directly to one person by e-mail address. The shift stays theirs until someone takes it.',
			input: {
				assignmentId: z.string().uuid(),
				toEmail: z.string().email().max(300).optional().describe('Offer directly to this person')
			}
		},
		async ({ assignmentId, toEmail }) => {
			requireVerified();
			if (toEmail && !directOfferLimiter.attempt(me.id))
				throw new ToolError(k.t('error.rateLimited'));
			const offer = await createOffer(booking(), me.id, {
				assignmentId,
				toEmail: toEmail?.trim().toLowerCase() || null
			});
			return { offerId: offer.id };
		}
	);

	tool(
		'my_withdraw_offer',
		{
			title: 'Withdraw my offer',
			description: 'Takes back a shift the person offered.',
			input: { offerId: z.string().uuid() }
		},
		async ({ offerId }) => {
			requireVerified();
			await withdrawOffer(booking(), me.id, offerId);
			return { withdrawn: offerId };
		}
	);

	tool(
		'my_take_offer',
		{
			title: 'Take an offered shift',
			description:
				'Takes a shift someone offers (market or directly to the person), optionally giving one of the own shifts in exchange.',
			input: {
				offerId: z.string().uuid(),
				counterAssignmentId: z
					.string()
					.uuid()
					.optional()
					.describe('Own booking offered in return (direct swaps)')
			}
		},
		async ({ offerId, counterAssignmentId }) => {
			const { edition, opts } = await optsFor();
			const result = await takeOffer(booking(), me.id, offerId, {
				...opts,
				editionId: edition.id,
				counterAssignmentId: counterAssignmentId ?? null
			});
			return { offerId, result };
		}
	);

	tool(
		'my_decline_offer',
		{
			title: 'Decline an offer to me',
			description: 'Declines a shift someone offered directly to the person.',
			input: { offerId: z.string().uuid() }
		},
		async ({ offerId }) => {
			requireVerified();
			await declineOffer(booking(), me.id, offerId);
			return { declined: offerId };
		}
	);

	tool(
		'my_answer_swap',
		{
			title: 'Answer a swap proposal',
			description: 'Accepts or rejects a swap someone proposed for one of the person’s offers.',
			input: { offerId: z.string().uuid(), accept: z.boolean() }
		},
		async ({ offerId, accept }) => {
			requireVerified();
			return { offerId, result: await answerProposal(booking(), me.id, offerId, accept) };
		}
	);

	// -- group ------------------------------------------------------------------------

	tool(
		'my_book_for_group',
		{
			title: 'Book for my group',
			description:
				'Books the position for the person and reserves places for chosen group members, who then accept or decline.',
			input: {
				positionId: z.string().uuid(),
				memberIds: z.array(z.string().uuid()).max(50).describe('User ids of group members')
			}
		},
		async ({ positionId, memberIds }) => {
			const { opts } = await optsFor();
			return bookForGroup(booking(), me, positionId, memberIds, opts);
		}
	);

	tool(
		'my_group_create',
		{
			title: 'Create my group',
			description: 'Creates a group of friends who want to help together (current edition).',
			input: { name: z.string().min(1).max(60) }
		},
		async ({ name }) => {
			requireVerified();
			const edition = await currentEdition();
			await createGroup(ctx.db, me.id, edition.id, name);
			return { created: name };
		}
	);

	tool(
		'my_group_join',
		{
			title: 'Join a group',
			description: 'Joins a group with its invitation code.',
			input: { code: z.string().min(1).max(40) }
		},
		async ({ code }) => {
			requireVerified();
			if (!groupJoinLimiter.attempt(me.id)) throw new ToolError(k.t('error.rateLimited'));
			const edition = await currentEdition();
			await joinGroup(ctx.db, me.id, edition.id, code);
			return { joined: true };
		}
	);

	tool(
		'my_group_leave',
		{
			title: 'Leave my group',
			description: 'Leaves the group (own bookings stay).',
			input: {},
			destructive: true
		},
		async () => {
			const edition = await currentEdition();
			await leaveGroup(ctx.db, me.id, edition.id);
			return { left: true };
		}
	);

	tool(
		'my_group_new_code',
		{
			title: 'New group invitation code',
			description: 'Replaces the group’s invitation code (the old one stops working).',
			input: {}
		},
		async () => {
			const edition = await currentEdition();
			await rotateGroupCode(ctx.db, me.id, edition.id);
			return { inviteCode: (await getGroup(ctx.db, me.id, edition.id))?.inviteCode ?? null };
		}
	);

	// -- goodies --------------------------------------------------------------------------

	tool(
		'my_claim_goodie',
		{
			title: 'Pick a goodie',
			description:
				'Picks a goodie for the person’s points (see my_overview). Some goodies ask questions first (answers via fields).',
			input: {
				goodieId: z.string().uuid(),
				variant: z.string().max(50).optional(),
				fields: fieldValuesParam.optional()
			}
		},
		async ({ goodieId, variant, fields }) => {
			requireVerified();
			const edition = await currentEdition();
			const asked = fieldsFor(await listFields(ctx.db), { goodieId });
			const missing = asked.filter((f) => f.required && !(fields && f.id in fields));
			if (missing.length > 0)
				throw new ToolError(
					`Answer these first: ${missing.map((f) => `${f.id} (${f.labelDe})`).join(', ')}`
				);
			if (fields) await saveFieldAnswers(ctx.db, me.id, asked, fields);
			const claim = await claimGoodie(
				ctx.db,
				ctx.actor,
				me.id,
				goodieId,
				variant || null,
				edition.id
			);
			return { claimId: claim.id, status: claim.status };
		}
	);

	const ownScope = async () => ({ editionId: (await currentEdition()).id, userId: me.id });

	tool(
		'my_cancel_goodie',
		{
			title: 'Cancel my goodie',
			description: 'Cancels a goodie the person picked but did not get yet; the points come back.',
			input: { claimId: z.string().uuid() },
			destructive: true
		},
		async ({ claimId }) => {
			await cancelClaim(ctx.db, ctx.actor, claimId, await ownScope(), true);
			return { cancelled: claimId };
		}
	);

	tool(
		'my_goodie_variant',
		{
			title: 'Change goodie variant',
			description: 'Changes the variant (e.g. size) of a picked goodie.',
			input: { claimId: z.string().uuid(), variant: z.string().min(1).max(50) }
		},
		async ({ claimId, variant }) => {
			await changeVariant(ctx.db, await ownScope(), claimId, variant);
			return { claimId, variant };
		}
	);

	tool(
		'my_return_goodie',
		{
			title: 'Return a goodie',
			description: 'Asks to return a goodie the person got (if refundable); the desk confirms it.',
			input: { claimId: z.string().uuid() }
		},
		async ({ claimId }) => {
			await requestRefund(ctx.db, await ownScope(), claimId);
			return { claimId, refundRequested: true };
		}
	);

	// -- profile and qualifications ---------------------------------------------------------

	tool(
		'my_update_profile',
		{
			title: 'Update my profile',
			description:
				'Changes the person’s own name, phone or language. E-mail address and password can only be changed in Wichtel itself.',
			input: {
				firstName: z.string().min(1).max(100).optional(),
				lastName: z.string().min(1).max(100).optional(),
				phone: z.string().max(50).optional(),
				locale: z.enum(LOCALES).optional()
			}
		},
		async (a) => {
			await updateProfile(ctx.db, me.id, {
				firstName: a.firstName ?? me.firstName,
				lastName: a.lastName ?? me.lastName,
				phone: a.phone ?? me.phone,
				locale: a.locale ?? me.locale
			});
			return { updated: true };
		}
	);

	tool(
		'my_set_fields',
		{
			title: 'Answer my profile questions',
			description:
				'Sets the person’s own answers to registration/profile questions. Only given fields change.',
			input: { values: fieldValuesParam }
		},
		async ({ values }) => {
			const fields = fieldsFor(await listFields(ctx.db), 'profile');
			return { saved: await saveFieldAnswers(ctx.db, me.id, fields, values) };
		}
	);

	tool(
		'my_apply_qualification',
		{
			title: 'Apply for a qualification',
			description:
				'Confirms that the person has a qualification (see list_qualifications); a reviewer decides. Qualifications that need an uploaded document can only be applied for in Wichtel itself.',
			input: { qualificationId: z.string().uuid(), note: z.string().max(1000).optional() }
		},
		async ({ qualificationId, note }) => {
			requireVerified();
			await applyForQualification(ctx.db, ctx.uploadDir, me.id, {
				qualificationId,
				confirmed: true,
				document: null,
				note: note ?? ''
			});
			return { qualificationId, status: 'pending' };
		}
	);
}
