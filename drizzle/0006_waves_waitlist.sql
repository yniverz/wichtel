CREATE TYPE "public"."wave_audience" AS ENUM('everyone', 'crew', 'returning', 'invite');--> statement-breakpoint
ALTER TYPE "public"."assignment_status" ADD VALUE 'waitlisted';--> statement-breakpoint
CREATE TABLE "booking_waves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"name" text NOT NULL,
	"opens_at" timestamp with time zone NOT NULL,
	"closes_at" timestamp with time zone,
	"area_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"audience" "wave_audience" DEFAULT 'everyone' NOT NULL,
	"invite_code" text DEFAULT replace(gen_random_uuid()::text, '-', '') NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_waves_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "wave_invites" (
	"wave_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wave_invites_wave_id_user_id_pk" PRIMARY KEY("wave_id","user_id")
);
--> statement-breakpoint
DROP INDEX "assignments_one_active_per_shift";--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "waitlist_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_waves" ADD CONSTRAINT "booking_waves_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wave_invites" ADD CONSTRAINT "wave_invites_wave_id_booking_waves_id_fk" FOREIGN KEY ("wave_id") REFERENCES "public"."booking_waves"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wave_invites" ADD CONSTRAINT "wave_invites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_waves_edition_idx" ON "booking_waves" USING btree ("edition_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assignments_one_active_per_shift" ON "assignments" USING btree ("shift_id","user_id") WHERE "assignments"."status" not in ('rejected', 'cancelled');