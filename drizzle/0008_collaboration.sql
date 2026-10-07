CREATE TYPE "public"."swap_status" AS ENUM('open', 'proposed', 'pending_approval', 'completed', 'withdrawn', 'declined');--> statement-breakpoint
ALTER TYPE "public"."assignment_status" ADD VALUE 'held';--> statement-breakpoint
CREATE TABLE "buddy_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"name" text NOT NULL,
	"invite_code" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buddy_groups_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "buddy_members" (
	"group_id" uuid NOT NULL,
	"edition_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buddy_members_group_id_user_id_pk" PRIMARY KEY("group_id","user_id"),
	CONSTRAINT "buddy_members_one_group" UNIQUE("edition_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "swap_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"from_user_id" uuid NOT NULL,
	"to_user_id" uuid,
	"status" "swap_status" DEFAULT 'open' NOT NULL,
	"taker_id" uuid,
	"counter_assignment_id" uuid,
	"decided_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "areas" ADD COLUMN "swap_needs_approval" boolean;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "hold_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "bonus_points" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "swap_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "swap_needs_approval" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "buddy_groups_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "buddy_group_max_size" integer DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "group_hold_hours" integer DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE "shift_positions" ADD COLUMN "urgent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shift_positions" ADD COLUMN "urgent_bonus" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "shift_positions" ADD COLUMN "urgent_note" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "buddy_groups" ADD CONSTRAINT "buddy_groups_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buddy_groups" ADD CONSTRAINT "buddy_groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buddy_members" ADD CONSTRAINT "buddy_members_group_id_buddy_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."buddy_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buddy_members" ADD CONSTRAINT "buddy_members_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buddy_members" ADD CONSTRAINT "buddy_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swap_offers" ADD CONSTRAINT "swap_offers_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swap_offers" ADD CONSTRAINT "swap_offers_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swap_offers" ADD CONSTRAINT "swap_offers_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swap_offers" ADD CONSTRAINT "swap_offers_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swap_offers" ADD CONSTRAINT "swap_offers_taker_id_users_id_fk" FOREIGN KEY ("taker_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swap_offers" ADD CONSTRAINT "swap_offers_counter_assignment_id_assignments_id_fk" FOREIGN KEY ("counter_assignment_id") REFERENCES "public"."assignments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swap_offers" ADD CONSTRAINT "swap_offers_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "swap_offers_edition_idx" ON "swap_offers" USING btree ("edition_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "swap_offers_one_running" ON "swap_offers" USING btree ("assignment_id") WHERE "swap_offers"."status" in ('open', 'proposed', 'pending_approval');