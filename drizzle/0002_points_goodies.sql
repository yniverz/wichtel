CREATE TYPE "public"."claim_status" AS ENUM('selected', 'issued', 'cancelled', 'refund_pending', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."points_kind" AS ENUM('shift', 'goodie', 'adjustment');--> statement-breakpoint
CREATE TABLE "goodie_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goodie_id" uuid NOT NULL,
	"edition_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"variant" text,
	"status" "claim_status" DEFAULT 'selected' NOT NULL,
	"points" integer NOT NULL,
	"self_service" boolean DEFAULT true NOT NULL,
	"issued_at" timestamp with time zone,
	"issued_by" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goodies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"name_de" text NOT NULL,
	"name_en" text DEFAULT '' NOT NULL,
	"description_de" text DEFAULT '' NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"image_asset_id" uuid,
	"price" integer DEFAULT 1 NOT NULL,
	"max_per_person" integer DEFAULT 1 NOT NULL,
	"self_service_limit" integer,
	"stock" integer,
	"variants" text[] DEFAULT '{}'::text[] NOT NULL,
	"required_area_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"mandatory" boolean DEFAULT false NOT NULL,
	"mandatory_priority" integer DEFAULT 0 NOT NULL,
	"refundable" boolean DEFAULT false NOT NULL,
	"advance" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goodies_price" CHECK ("goodies"."price" >= 0),
	CONSTRAINT "goodies_max" CHECK ("goodies"."max_per_person" >= 1)
);
--> statement-breakpoint
CREATE TABLE "points_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"kind" "points_kind" NOT NULL,
	"assignment_id" uuid,
	"claim_id" uuid,
	"reason" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "areas" ADD COLUMN "points_per_shift" integer;--> statement-breakpoint
ALTER TABLE "areas" ADD COLUMN "points_per_hour" integer;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "points_per_shift" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "points_per_hour" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "night_bonus" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "night_start" text DEFAULT '00:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "night_end" text DEFAULT '06:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "last_minute_bonus" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "last_minute_hours" integer DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE "shift_positions" ADD COLUMN "points_per_shift" integer;--> statement-breakpoint
ALTER TABLE "shift_positions" ADD COLUMN "points_per_hour" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "qr_token" text DEFAULT replace(gen_random_uuid()::text, '-', '') NOT NULL;--> statement-breakpoint
ALTER TABLE "goodie_claims" ADD CONSTRAINT "goodie_claims_goodie_id_goodies_id_fk" FOREIGN KEY ("goodie_id") REFERENCES "public"."goodies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goodie_claims" ADD CONSTRAINT "goodie_claims_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goodie_claims" ADD CONSTRAINT "goodie_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goodie_claims" ADD CONSTRAINT "goodie_claims_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goodie_claims" ADD CONSTRAINT "goodie_claims_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goodies" ADD CONSTRAINT "goodies_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goodies" ADD CONSTRAINT "goodies_image_asset_id_assets_id_fk" FOREIGN KEY ("image_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_claim_id_goodie_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."goodie_claims"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "goodie_claims_user_idx" ON "goodie_claims" USING btree ("user_id","edition_id");--> statement-breakpoint
CREATE INDEX "goodie_claims_goodie_idx" ON "goodie_claims" USING btree ("goodie_id");--> statement-breakpoint
CREATE INDEX "goodies_edition_idx" ON "goodies" USING btree ("edition_id");--> statement-breakpoint
CREATE INDEX "points_ledger_user_idx" ON "points_ledger" USING btree ("user_id","edition_id");--> statement-breakpoint
CREATE INDEX "points_ledger_assignment_idx" ON "points_ledger" USING btree ("assignment_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_qr_token_unique" UNIQUE("qr_token");