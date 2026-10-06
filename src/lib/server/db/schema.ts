import { sql } from 'drizzle-orm';
import {
	bigserial,
	boolean,
	check,
	date,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
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
		...timestamps
	},
	(t) => [index('areas_edition_idx').on(t.editionId), index('areas_parent_idx').on(t.parentId)]
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
	'cancelled'
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
		sortOrder: integer('sort_order').notNull().default(0)
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
		createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
		...timestamps
	},
	(t) => [
		index('assignments_position_idx').on(t.positionId),
		index('assignments_user_idx').on(t.userId),
		// A person holds at most one active place per shift.
		uniqueIndex('assignments_one_active_per_shift')
			.on(t.shiftId, t.userId)
			.where(sql`${t.status} in ('requested', 'booked')`)
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
