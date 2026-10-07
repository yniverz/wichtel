import { sql } from 'drizzle-orm';
import {
	bigserial,
	boolean,
	check,
	date,
	doublePrecision,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	unique,
	uniqueIndex,
	uuid,
	type AnyPgColumn
} from 'drizzle-orm/pg-core';

const timestamps = {
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date())
};

/** Default brand colors: signal red and wristband yellow. */
export const DEFAULT_PRIMARY = '#c03a1c';
export const DEFAULT_ACCENT = '#f4c430';

export const localeEnum = pgEnum('locale', ['de', 'en']);

// ---------------------------------------------------------------------------
// Accounts & authentication
// ---------------------------------------------------------------------------

export const users = pgTable('users', {
	id: uuid('id').primaryKey().defaultRandom(),
	/** Always stored lower-cased. */
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash'),
	firstName: text('first_name').notNull(),
	lastName: text('last_name').notNull(),
	phone: text('phone').notNull().default(''),
	locale: localeEnum('locale').notNull().default('de'),
	/** Instance administrators: manage settings, editions, role definitions and other admins. */
	isAdmin: boolean('is_admin').notNull().default(false),
	emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
	/** Random token behind the personal QR code (desk check-in / goodie pickup). Rotatable. */
	qrToken: text('qr_token')
		.notNull()
		.unique()
		.default(sql`replace(gen_random_uuid()::text, '-', '')`),
	/** Secret token for the personal iCal feed. Rotatable. */
	calendarToken: text('calendar_token')
		.notNull()
		.unique()
		.default(sql`replace(gen_random_uuid()::text, '-', '')`),
	...timestamps
});

export const sessions = pgTable(
	'sessions',
	{
		/** SHA-256 of the session token; the token itself only lives in the cookie. */
		id: text('id').primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('sessions_user_idx').on(t.userId)]
);

export const emailTokenPurposeEnum = pgEnum('email_token_purpose', [
	'verify_email',
	'reset_password'
]);

export const emailTokens = pgTable(
	'email_tokens',
	{
		/** SHA-256 of the token sent by e-mail. */
		id: text('id').primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		purpose: emailTokenPurposeEnum('purpose').notNull(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('email_tokens_user_idx').on(t.userId, t.purpose)]
);

// ---------------------------------------------------------------------------
// Instance configuration
// ---------------------------------------------------------------------------

export const assets = pgTable('assets', {
	id: uuid('id').primaryKey().defaultRandom(),
	filename: text('filename').notNull(),
	mimeType: text('mime_type').notNull(),
	size: integer('size').notNull(),
	createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const instanceSettings = pgTable(
	'instance_settings',
	{
		/** Singleton row, always 1. */
		id: integer('id').primaryKey().default(1),
		festivalName: text('festival_name').notNull().default('Wichtel'),
		taglineDe: text('tagline_de').notNull().default(''),
		taglineEn: text('tagline_en').notNull().default(''),
		primaryColor: text('primary_color').notNull().default(DEFAULT_PRIMARY),
		accentColor: text('accent_color').notNull().default(DEFAULT_ACCENT),
		logoAssetId: uuid('logo_asset_id').references(() => assets.id, { onDelete: 'set null' }),
		backgroundAssetId: uuid('background_asset_id').references(() => assets.id, {
			onDelete: 'set null'
		}),
		faviconAssetId: uuid('favicon_asset_id').references(() => assets.id, { onDelete: 'set null' }),
		contactEmail: text('contact_email').notNull().default(''),
		imprintUrl: text('imprint_url').notNull().default(''),
		privacyUrl: text('privacy_url').notNull().default(''),
		defaultLocale: localeEnum('default_locale').notNull().default('de'),
		timezone: text('timezone').notNull().default('Europe/Berlin'),
		registrationOpen: boolean('registration_open').notNull().default(true),
		/** Helpers may cancel bookings themselves until this many hours before the shift. */
		cancelDeadlineHours: integer('cancel_deadline_hours').notNull().default(48),
		/** Required gap between two shifts of the same person. */
		minBreakMinutes: integer('min_break_minutes').notNull().default(0),
		// Point rules (defaults; areas and positions can override per-shift/per-hour values)
		pointsPerShift: integer('points_per_shift').notNull().default(1),
		pointsPerHour: integer('points_per_hour').notNull().default(0),
		/** Extra points for shifts touching the night window (0 = off). */
		nightBonus: integer('night_bonus').notNull().default(0),
		nightStart: text('night_start').notNull().default('00:00'),
		nightEnd: text('night_end').notNull().default('06:00'),
		/** Extra points when booked less than `lastMinuteHours` before the start (0 = off). */
		lastMinuteBonus: integer('last_minute_bonus').notNull().default(0),
		lastMinuteHours: integer('last_minute_hours').notNull().default(24),
		/** Reminder e-mail this many hours before a shift (0 = no reminders). */
		reminderHours: integer('reminder_hours').notNull().default(24),
		/** Full positions offer a waiting list with automatic moving up. */
		waitlistEnabled: boolean('waitlist_enabled').notNull().default(true),
		/** Helpers may hand over or swap booked shifts (shift market, direct swap). */
		swapEnabled: boolean('swap_enabled').notNull().default(true),
		/** Handovers after the cancel deadline need a lead's approval (areas can override). */
		swapNeedsApproval: boolean('swap_needs_approval').notNull().default(false),
		/** Helpers may form buddy groups and book together. */
		buddyGroupsEnabled: boolean('buddy_groups_enabled').notNull().default(true),
		buddyGroupMaxSize: integer('buddy_group_max_size').notNull().default(8),
		/** How long places reserved for group members are held before they are released. */
		groupHoldHours: integer('group_hold_hours').notNull().default(24),
		/** Tile server for embedded maps (loaded only after the viewer agrees). */
		mapTileUrl: text('map_tile_url')
			.notNull()
			.default('https://tile.openstreetmap.org/{z}/{x}/{y}.png'),
		mapAttribution: text('map_attribution').notNull().default('© OpenStreetMap contributors'),
		/** SHA-256 of the one-time setup token; null once setup is complete. */
		setupTokenHash: text('setup_token_hash'),
		updatedAt: timestamps.updatedAt
	},
	(t) => [check('instance_settings_singleton', sql`${t.id} = 1`)]
);

// ---------------------------------------------------------------------------
// Editions (festival years) & area tree
// ---------------------------------------------------------------------------

export const editions = pgTable(
	'editions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		name: text('name').notNull(),
		startsOn: date('starts_on').notNull(),
		endsOn: date('ends_on').notNull(),
		/** The edition helpers currently see. At most one edition is current. */
		isCurrent: boolean('is_current').notNull().default(false),
		/** Uploaded site plan (image) on which places can be pinned. */
		sitePlanAssetId: uuid('site_plan_asset_id').references(() => assets.id, {
			onDelete: 'set null'
		}),
		/** The place of the volunteer desk, shown on the volunteers' home page. */
		deskPlaceId: uuid('desk_place_id'),
		archivedAt: timestamp('archived_at', { withTimezone: true }),
		...timestamps
	},
	(t) => [
		uniqueIndex('editions_single_current')
			.on(t.isCurrent)
			.where(sql`${t.isCurrent}`),
		check('editions_date_order', sql`${t.startsOn} <= ${t.endsOn}`)
	]
);

export const areas = pgTable(
	'areas',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		editionId: uuid('edition_id')
			.notNull()
			.references(() => editions.id, { onDelete: 'cascade' }),
		parentId: uuid('parent_id').references((): AnyPgColumn => areas.id, { onDelete: 'restrict' }),
		nameDe: text('name_de').notNull(),
		nameEn: text('name_en').notNull().default(''),
		descriptionDe: text('description_de').notNull().default(''),
		descriptionEn: text('description_en').notNull().default(''),
		sortOrder: integer('sort_order').notNull().default(0),
		/** Overrides the instance-wide cancel deadline for shifts in this area (and sub-areas). */
		cancelDeadlineHours: integer('cancel_deadline_hours'),
		/** Overrides whether late handovers need approval (null = inherit). */
		swapNeedsApproval: boolean('swap_needs_approval'),
		/** Point rule overrides (null = inherit from parent area / instance). */
		pointsPerShift: integer('points_per_shift'),
		pointsPerHour: integer('points_per_hour'),
		...timestamps
	},
	(t) => [index('areas_edition_idx').on(t.editionId), index('areas_parent_idx').on(t.parentId)]
);

// ---------------------------------------------------------------------------
// Places
// ---------------------------------------------------------------------------

export const places = pgTable(
	'places',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		editionId: uuid('edition_id')
			.notNull()
			.references(() => editions.id, { onDelete: 'cascade' }),
		nameDe: text('name_de').notNull(),
		nameEn: text('name_en').notNull().default(''),
		descriptionDe: text('description_de').notNull().default(''),
		descriptionEn: text('description_en').notNull().default(''),
		address: text('address').notNull().default(''),
		/** Geographic pin (WGS 84). */
		lat: doublePrecision('lat'),
		lng: doublePrecision('lng'),
		/** Pin on the edition's site plan, relative to the image (0–1). */
		planX: doublePrecision('plan_x'),
		planY: doublePrecision('plan_y'),
		sortOrder: integer('sort_order').notNull().default(0),
		...timestamps
	},
	(t) => [index('places_edition_idx').on(t.editionId)]
);

// ---------------------------------------------------------------------------
// Shifts, positions & assignments
// ---------------------------------------------------------------------------

export const shiftVisibilityEnum = pgEnum('shift_visibility', ['public', 'internal']);
export const bookingModeEnum = pgEnum('booking_mode', ['open', 'request']);
export const assignmentStatusEnum = pgEnum('assignment_status', [
	'requested',
	'booked',
	'rejected',
	'cancelled',
	'waitlisted',
	/** Reserved for a buddy-group member who has not accepted yet (see `holdUntil`). */
	'held'
]);
export const attendanceEnum = pgEnum('attendance', ['unknown', 'attended', 'no_show']);

export const shifts = pgTable(
	'shifts',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		editionId: uuid('edition_id')
			.notNull()
			.references(() => editions.id, { onDelete: 'cascade' }),
		areaId: uuid('area_id')
			.notNull()
			.references(() => areas.id, { onDelete: 'restrict' }),
		titleDe: text('title_de').notNull(),
		titleEn: text('title_en').notNull().default(''),
		descriptionDe: text('description_de').notNull().default(''),
		descriptionEn: text('description_en').notNull().default(''),
		location: text('location').notNull().default(''),
		meetingPoint: text('meeting_point').notNull().default(''),
		/** Structured places with pins; the text fields above add details ("behind the tent"). */
		locationPlaceId: uuid('location_place_id').references((): AnyPgColumn => places.id, {
			onDelete: 'set null'
		}),
		meetingPlaceId: uuid('meeting_place_id').references((): AnyPgColumn => places.id, {
			onDelete: 'set null'
		}),
		contact: text('contact').notNull().default(''),
		startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
		endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
		/** `internal` shifts are only visible to people with a role covering the area. */
		visibility: shiftVisibilityEnum('visibility').notNull().default('public'),
		/** Overrides area/instance cancel deadline. */
		cancelDeadlineHours: integer('cancel_deadline_hours'),
		/** Shifts created together by the series generator share this id. */
		seriesId: uuid('series_id'),
		...timestamps
	},
	(t) => [
		index('shifts_edition_start_idx').on(t.editionId, t.startsAt),
		index('shifts_area_idx').on(t.areaId),
		check('shifts_time_order', sql`${t.startsAt} < ${t.endsAt}`)
	]
);

export const shiftPositions = pgTable(
	'shift_positions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		shiftId: uuid('shift_id')
			.notNull()
			.references(() => shifts.id, { onDelete: 'cascade' }),
		nameDe: text('name_de').notNull(),
		nameEn: text('name_en').notNull().default(''),
		descriptionDe: text('description_de').notNull().default(''),
		descriptionEn: text('description_en').notNull().default(''),
		capacity: integer('capacity').notNull(),
		bookingMode: bookingModeEnum('booking_mode').notNull().default('open'),
		sortOrder: integer('sort_order').notNull().default(0),
		/** Point rule overrides for this position (null = inherit). */
		pointsPerShift: integer('points_per_shift'),
		pointsPerHour: integer('points_per_hour'),
		/** All of these qualifications are needed to book (leads may override). */
		requiredQualificationIds: uuid('required_qualification_ids')
			.array()
			.notNull()
			.default(sql`'{}'::uuid[]`),
		/** Shown as "nice to have"; never blocks. */
		preferredQualificationIds: uuid('preferred_qualification_ids')
			.array()
			.notNull()
			.default(sql`'{}'::uuid[]`),
		/** Set while a lead is calling for urgent help; bookings then earn `urgentBonus`. */
		urgentAt: timestamp('urgent_at', { withTimezone: true }),
		urgentBonus: integer('urgent_bonus').notNull().default(0),
		urgentNote: text('urgent_note').notNull().default('')
	},
	(t) => [
		index('shift_positions_shift_idx').on(t.shiftId),
		check('shift_positions_capacity', sql`${t.capacity} >= 1`)
	]
);

export const assignments = pgTable(
	'assignments',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		positionId: uuid('position_id')
			.notNull()
			.references(() => shiftPositions.id, { onDelete: 'cascade' }),
		/** Denormalised for overlap checks and per-shift uniqueness. */
		shiftId: uuid('shift_id')
			.notNull()
			.references(() => shifts.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		status: assignmentStatusEnum('status').notNull(),
		attendance: attendanceEnum('attendance').notNull().default('unknown'),
		attendanceAt: timestamp('attendance_at', { withTimezone: true }),
		attendanceBy: uuid('attendance_by').references(() => users.id, { onDelete: 'set null' }),
		reminderSentAt: timestamp('reminder_sent_at', { withTimezone: true }),
		/** Places reserved for buddy-group members are released after this time. */
		holdUntil: timestamp('hold_until', { withTimezone: true }),
		/** Extra points fixed at booking time (e.g. answering an urgent call). */
		bonusPoints: integer('bonus_points').notNull().default(0),
		createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
		...timestamps
	},
	(t) => [
		index('assignments_position_idx').on(t.positionId),
		index('assignments_user_idx').on(t.userId),
		// A person holds at most one active place (or waiting-list entry) per shift.
		uniqueIndex('assignments_one_active_per_shift')
			.on(t.shiftId, t.userId)
			// Written with the old values only: a freshly added enum value ('waitlisted') may not be
			// used in the migration that adds it.
			.where(sql`${t.status} not in ('rejected', 'cancelled')`)
	]
);

// ---------------------------------------------------------------------------
// Shift market & swaps
// ---------------------------------------------------------------------------

export const swapStatusEnum = pgEnum('swap_status', [
	/** Waiting for someone to take it (market) or for the addressed person (direct). */
	'open',
	/** The addressed person offered one of their shifts in return; the offerer decides. */
	'proposed',
	/** Agreed by both sides, waiting for a lead. */
	'pending_approval',
	'completed',
	'withdrawn',
	'declined'
]);

export const swapOffers = pgTable(
	'swap_offers',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		editionId: uuid('edition_id')
			.notNull()
			.references(() => editions.id, { onDelete: 'cascade' }),
		/** The booking being given away. */
		assignmentId: uuid('assignment_id')
			.notNull()
			.references(() => assignments.id, { onDelete: 'cascade' }),
		fromUserId: uuid('from_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		/** Direct offer to one person; null = shift market. */
		toUserId: uuid('to_user_id').references(() => users.id, { onDelete: 'cascade' }),
		status: swapStatusEnum('status').notNull().default('open'),
		/** Who takes the shift (set once someone agrees). */
		takerId: uuid('taker_id').references(() => users.id, { onDelete: 'set null' }),
		/** The taker's booking given in return (direct swap). */
		counterAssignmentId: uuid('counter_assignment_id').references(() => assignments.id, {
			onDelete: 'set null'
		}),
		decidedBy: uuid('decided_by').references(() => users.id, { onDelete: 'set null' }),
		...timestamps
	},
	(t) => [
		index('swap_offers_edition_idx').on(t.editionId, t.status),
		// One running offer per booking.
		uniqueIndex('swap_offers_one_running')
			.on(t.assignmentId)
			.where(sql`${t.status} in ('open', 'proposed', 'pending_approval')`)
	]
);

// ---------------------------------------------------------------------------
// Buddy groups
// ---------------------------------------------------------------------------

export const buddyGroups = pgTable('buddy_groups', {
	id: uuid('id').primaryKey().defaultRandom(),
	editionId: uuid('edition_id')
		.notNull()
		.references(() => editions.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	/** Secret code for joining (shared as a link). Rotatable. */
	inviteCode: text('invite_code').notNull().unique(),
	createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
	...timestamps
});

export const buddyMembers = pgTable(
	'buddy_members',
	{
		groupId: uuid('group_id')
			.notNull()
			.references(() => buddyGroups.id, { onDelete: 'cascade' }),
		/** Denormalised so that a person is in at most one group per edition. */
		editionId: uuid('edition_id')
			.notNull()
			.references(() => editions.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		primaryKey({ columns: [t.groupId, t.userId] }),
		unique('buddy_members_one_group').on(t.editionId, t.userId)
	]
);

// ---------------------------------------------------------------------------
// Roles & permissions
// ---------------------------------------------------------------------------

export const roles = pgTable('roles', {
	id: uuid('id').primaryKey().defaultRandom(),
	nameDe: text('name_de').notNull(),
	nameEn: text('name_en').notNull().default(''),
	descriptionDe: text('description_de').notNull().default(''),
	descriptionEn: text('description_en').notNull().default(''),
	/** Permission keys, see `#lib/domain/permissions.ts`. */
	permissions: text('permissions')
		.array()
		.notNull()
		.default(sql`'{}'::text[]`),
	...timestamps
});

export const roleAssignments = pgTable(
	'role_assignments',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		roleId: uuid('role_id')
			.notNull()
			.references(() => roles.id, { onDelete: 'cascade' }),
		editionId: uuid('edition_id')
			.notNull()
			.references(() => editions.id, { onDelete: 'cascade' }),
		/** Scope of the assignment; null means the whole edition. Inherited by all sub-areas. */
		areaId: uuid('area_id').references(() => areas.id, { onDelete: 'cascade' }),
		createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		unique('role_assignments_unique')
			.on(t.userId, t.roleId, t.editionId, t.areaId)
			.nullsNotDistinct(),
		index('role_assignments_user_edition_idx').on(t.userId, t.editionId)
	]
);

// ---------------------------------------------------------------------------
// Booking waves
// ---------------------------------------------------------------------------

export const waveAudienceEnum = pgEnum('wave_audience', [
	'everyone',
	'crew',
	'returning',
	'invite'
]);

/**
 * Time-controlled release of booking. Without any wave, booking is open for everyone; as soon
 * as an edition has waves, booking is only possible within a wave that covers the person and area.
 */
export const bookingWaves = pgTable(
	'booking_waves',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		editionId: uuid('edition_id')
			.notNull()
			.references(() => editions.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		opensAt: timestamp('opens_at', { withTimezone: true }).notNull(),
		closesAt: timestamp('closes_at', { withTimezone: true }),
		/** Areas (incl. sub-areas) this wave opens; empty = all. */
		areaIds: uuid('area_ids')
			.array()
			.notNull()
			.default(sql`'{}'::uuid[]`),
		audience: waveAudienceEnum('audience').notNull().default('everyone'),
		/** Secret code for `audience = invite` (link `/invite/<code>`). */
		inviteCode: text('invite_code')
			.notNull()
			.unique()
			.default(sql`replace(gen_random_uuid()::text, '-', '')`),
		...timestamps
	},
	(t) => [index('booking_waves_edition_idx').on(t.editionId)]
);

export const waveInvites = pgTable(
	'wave_invites',
	{
		waveId: uuid('wave_id')
			.notNull()
			.references(() => bookingWaves.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [primaryKey({ columns: [t.waveId, t.userId] })]
);

// ---------------------------------------------------------------------------
// Points & goodies
// ---------------------------------------------------------------------------

export const goodies = pgTable(
	'goodies',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		editionId: uuid('edition_id')
			.notNull()
			.references(() => editions.id, { onDelete: 'cascade' }),
		nameDe: text('name_de').notNull(),
		nameEn: text('name_en').notNull().default(''),
		descriptionDe: text('description_de').notNull().default(''),
		descriptionEn: text('description_en').notNull().default(''),
		imageAssetId: uuid('image_asset_id').references(() => assets.id, { onDelete: 'set null' }),
		price: integer('price').notNull().default(1),
		maxPerPerson: integer('max_per_person').notNull().default(1),
		/** How many may be picked by helpers themselves; null = unlimited. Leads can always hand out. */
		selfServiceLimit: integer('self_service_limit'),
		/** Informational stock count; null = not tracked. */
		stock: integer('stock'),
		/** Choices such as sizes; empty = no variants. */
		variants: text('variants')
			.array()
			.notNull()
			.default(sql`'{}'::text[]`),
		/** Only people who attended at least one shift in one of these areas (incl. sub-areas). */
		requiredAreaIds: uuid('required_area_ids')
			.array()
			.notNull()
			.default(sql`'{}'::uuid[]`),
		/** Redeemed automatically, in `mandatoryPriority` order, as soon as enough points exist. */
		mandatory: boolean('mandatory').notNull().default(false),
		mandatoryPriority: integer('mandatory_priority').notNull().default(0),
		/** Helpers may ask for a refund instead (e.g. already bought a ticket). Points stay used. */
		refundable: boolean('refundable').notNull().default(false),
		/** May be selected against points of booked (not yet worked) shifts. */
		advance: boolean('advance').notNull().default(false),
		active: boolean('active').notNull().default(true),
		sortOrder: integer('sort_order').notNull().default(0),
		...timestamps
	},
	(t) => [
		index('goodies_edition_idx').on(t.editionId),
		check('goodies_price', sql`${t.price} >= 0`),
		check('goodies_max', sql`${t.maxPerPerson} >= 1`)
	]
);

export const claimStatusEnum = pgEnum('claim_status', [
	'selected',
	'issued',
	'cancelled',
	'refund_pending',
	'refunded'
]);

export const goodieClaims = pgTable(
	'goodie_claims',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		goodieId: uuid('goodie_id')
			.notNull()
			.references(() => goodies.id, { onDelete: 'restrict' }),
		editionId: uuid('edition_id')
			.notNull()
			.references(() => editions.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		variant: text('variant'),
		status: claimStatusEnum('status').notNull().default('selected'),
		/** Points charged for this claim. */
		points: integer('points').notNull(),
		/** Counted against the goodie's self-service limit. */
		selfService: boolean('self_service').notNull().default(true),
		issuedAt: timestamp('issued_at', { withTimezone: true }),
		issuedBy: uuid('issued_by').references(() => users.id, { onDelete: 'set null' }),
		createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
		...timestamps
	},
	(t) => [
		index('goodie_claims_user_idx').on(t.userId, t.editionId),
		index('goodie_claims_goodie_idx').on(t.goodieId)
	]
);

export const pointsKindEnum = pgEnum('points_kind', ['shift', 'goodie', 'adjustment']);

/** Append-only points ledger. A person's balance is the sum of their entries in an edition. */
export const pointsLedger = pgTable(
	'points_ledger',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		editionId: uuid('edition_id')
			.notNull()
			.references(() => editions.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		amount: integer('amount').notNull(),
		kind: pointsKindEnum('kind').notNull(),
		assignmentId: uuid('assignment_id').references(() => assignments.id, { onDelete: 'set null' }),
		claimId: uuid('claim_id').references(() => goodieClaims.id, { onDelete: 'set null' }),
		reason: text('reason'),
		createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('points_ledger_user_idx').on(t.userId, t.editionId),
		index('points_ledger_assignment_idx').on(t.assignmentId)
	]
);

// ---------------------------------------------------------------------------
// Qualifications
// ---------------------------------------------------------------------------

export const proofEnum = pgEnum('qualification_proof', ['confirm', 'upload', 'either']);
export const retentionEnum = pgEnum('document_retention', ['keep', 'delete_after_review']);
export const userQualificationStatusEnum = pgEnum('user_qualification_status', [
	'pending',
	'approved',
	'rejected'
]);

/** Qualifications are defined once per instance and kept across editions. */
export const qualifications = pgTable('qualifications', {
	id: uuid('id').primaryKey().defaultRandom(),
	nameDe: text('name_de').notNull(),
	nameEn: text('name_en').notNull().default(''),
	descriptionDe: text('description_de').notNull().default(''),
	descriptionEn: text('description_en').notNull().default(''),
	proof: proofEnum('proof').notNull().default('either'),
	documentRetention: retentionEnum('document_retention').notNull().default('delete_after_review'),
	/** Approval expires after this many days; null = valid indefinitely. */
	validityDays: integer('validity_days'),
	active: boolean('active').notNull().default(true),
	sortOrder: integer('sort_order').notNull().default(0),
	...timestamps
});

export const userQualifications = pgTable(
	'user_qualifications',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		qualificationId: uuid('qualification_id')
			.notNull()
			.references(() => qualifications.id, { onDelete: 'cascade' }),
		status: userQualificationStatusEnum('status').notNull().default('pending'),
		/** Name of the privately stored proof document (see `UPLOAD_DIR/private`). */
		documentId: uuid('document_id'),
		documentName: text('document_name'),
		documentType: text('document_type'),
		note: text('note').notNull().default(''),
		reviewNote: text('review_note').notNull().default(''),
		reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
		reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
		expiresAt: timestamp('expires_at', { withTimezone: true }),
		...timestamps
	},
	(t) => [
		unique('user_qualifications_unique').on(t.userId, t.qualificationId),
		index('user_qualifications_status_idx').on(t.status)
	]
);

// ---------------------------------------------------------------------------
// Configurable profile fields
// ---------------------------------------------------------------------------

export const fieldTypeEnum = pgEnum('field_type', [
	'text',
	'textarea',
	'number',
	'date',
	'select',
	'multiselect',
	'checkbox'
]);
export const fieldContextEnum = pgEnum('field_context', ['registration', 'profile', 'goodie']);

export const profileFields = pgTable('profile_fields', {
	id: uuid('id').primaryKey().defaultRandom(),
	labelDe: text('label_de').notNull(),
	labelEn: text('label_en').notNull().default(''),
	helpDe: text('help_de').notNull().default(''),
	helpEn: text('help_en').notNull().default(''),
	type: fieldTypeEnum('type').notNull().default('text'),
	/** Choices for select / multiselect. */
	options: text('options')
		.array()
		.notNull()
		.default(sql`'{}'::text[]`),
	required: boolean('required').notNull().default(false),
	/** When the field is asked: at registration, only in the profile, or when choosing goodies. */
	context: fieldContextEnum('context').notNull().default('profile'),
	/** For context `goodie`: the goodies that need this field. */
	goodieIds: uuid('goodie_ids')
		.array()
		.notNull()
		.default(sql`'{}'::uuid[]`),
	/** Leads see the value next to the person in shift rosters (e.g. allergies for catering). */
	showToLeads: boolean('show_to_leads').notNull().default(false),
	active: boolean('active').notNull().default(true),
	sortOrder: integer('sort_order').notNull().default(0),
	...timestamps
});

export const profileValues = pgTable(
	'profile_values',
	{
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		fieldId: uuid('field_id')
			.notNull()
			.references(() => profileFields.id, { onDelete: 'cascade' }),
		value: jsonb('value').$type<string | number | boolean | string[]>().notNull(),
		updatedAt: timestamps.updatedAt
	},
	(t) => [primaryKey({ columns: [t.userId, t.fieldId] })]
);

// ---------------------------------------------------------------------------
// E-mail
// ---------------------------------------------------------------------------

/** Transactional outbox: e-mails are queued in the same transaction as the change they report. */
export const emailOutbox = pgTable(
	'email_outbox',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		to: text('to').notNull(),
		subject: text('subject').notNull(),
		text: text('text').notNull(),
		html: text('html').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		sendAfter: timestamp('send_after', { withTimezone: true }).notNull().defaultNow(),
		sentAt: timestamp('sent_at', { withTimezone: true }),
		attempts: integer('attempts').notNull().default(0),
		lastError: text('last_error')
	},
	(t) => [index('email_outbox_pending_idx').on(t.sentAt, t.sendAfter)]
);

/** Admin overrides of the default e-mail texts (per template and language). */
export const mailTemplates = pgTable(
	'mail_templates',
	{
		key: text('key').notNull(),
		locale: localeEnum('locale').notNull(),
		subject: text('subject').notNull(),
		body: text('body').notNull(),
		updatedAt: timestamps.updatedAt
	},
	(t) => [primaryKey({ columns: [t.key, t.locale] })]
);

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export const auditLog = pgTable(
	'audit_log',
	{
		id: bigserial('id', { mode: 'number' }).primaryKey(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
		action: text('action').notNull(),
		entityType: text('entity_type').notNull(),
		entityId: text('entity_id'),
		editionId: uuid('edition_id').references(() => editions.id, { onDelete: 'set null' }),
		/** Arbitrary structured details, typically `{ before, after }`. */
		data: jsonb('data').$type<Record<string, unknown>>().notNull().default({}),
		reason: text('reason'),
		ip: text('ip')
	},
	(t) => [
		index('audit_log_created_idx').on(t.createdAt),
		index('audit_log_entity_idx').on(t.entityType, t.entityId),
		index('audit_log_actor_idx').on(t.actorId)
	]
);

export type User = typeof users.$inferSelect;
export type InstanceSettings = typeof instanceSettings.$inferSelect;
export type Edition = typeof editions.$inferSelect;
export type Area = typeof areas.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type RoleAssignment = typeof roleAssignments.$inferSelect;
export type AuditEntry = typeof auditLog.$inferSelect;
export type Shift = typeof shifts.$inferSelect;
export type ShiftPosition = typeof shiftPositions.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Goodie = typeof goodies.$inferSelect;
export type GoodieClaim = typeof goodieClaims.$inferSelect;
export type PointsEntry = typeof pointsLedger.$inferSelect;
export type Qualification = typeof qualifications.$inferSelect;
export type UserQualification = typeof userQualifications.$inferSelect;
export type ProfileField = typeof profileFields.$inferSelect;
export type BookingWave = typeof bookingWaves.$inferSelect;
export type Place = typeof places.$inferSelect;
export type SwapOffer = typeof swapOffers.$inferSelect;
export type BuddyGroup = typeof buddyGroups.$inferSelect;
