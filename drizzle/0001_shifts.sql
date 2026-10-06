CREATE TYPE "public"."assignment_status" AS ENUM('requested', 'booked', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."attendance" AS ENUM('unknown', 'attended', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."booking_mode" AS ENUM('open', 'request');--> statement-breakpoint
CREATE TYPE "public"."shift_visibility" AS ENUM('public', 'internal');--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"position_id" uuid NOT NULL,
	"shift_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "assignment_status" NOT NULL,
	"attendance" "attendance" DEFAULT 'unknown' NOT NULL,
	"attendance_at" timestamp with time zone,
	"attendance_by" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shift_id" uuid NOT NULL,
	"name_de" text NOT NULL,
	"name_en" text DEFAULT '' NOT NULL,
	"description_de" text DEFAULT '' NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"capacity" integer NOT NULL,
	"booking_mode" "booking_mode" DEFAULT 'open' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "shift_positions_capacity" CHECK ("shift_positions"."capacity" >= 1)
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"area_id" uuid NOT NULL,
	"title_de" text NOT NULL,
	"title_en" text DEFAULT '' NOT NULL,
	"description_de" text DEFAULT '' NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"meeting_point" text DEFAULT '' NOT NULL,
	"contact" text DEFAULT '' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"visibility" "shift_visibility" DEFAULT 'public' NOT NULL,
	"cancel_deadline_hours" integer,
	"series_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shifts_time_order" CHECK ("shifts"."starts_at" < "shifts"."ends_at")
);
--> statement-breakpoint
ALTER TABLE "areas" ADD COLUMN "cancel_deadline_hours" integer;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "cancel_deadline_hours" integer DEFAULT 48 NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "min_break_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_position_id_shift_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."shift_positions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_attendance_by_users_id_fk" FOREIGN KEY ("attendance_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_positions" ADD CONSTRAINT "shift_positions_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assignments_position_idx" ON "assignments" USING btree ("position_id");--> statement-breakpoint
CREATE INDEX "assignments_user_idx" ON "assignments" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assignments_one_active_per_shift" ON "assignments" USING btree ("shift_id","user_id") WHERE "assignments"."status" in ('requested', 'booked');--> statement-breakpoint
CREATE INDEX "shift_positions_shift_idx" ON "shift_positions" USING btree ("shift_id");--> statement-breakpoint
CREATE INDEX "shifts_edition_start_idx" ON "shifts" USING btree ("edition_id","starts_at");--> statement-breakpoint
CREATE INDEX "shifts_area_idx" ON "shifts" USING btree ("area_id");