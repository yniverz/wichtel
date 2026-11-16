CREATE TYPE "public"."news_audience" AS ENUM('public', 'everyone', 'helpers', 'crew', 'role', 'area', 'shift');--> statement-breakpoint
CREATE TABLE "news" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"audience" "news_audience" NOT NULL,
	"area_id" uuid,
	"shift_id" uuid,
	"role_id" uuid,
	"title_de" text NOT NULL,
	"title_en" text DEFAULT '' NOT NULL,
	"body_de" text NOT NULL,
	"body_en" text DEFAULT '' NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"pinned_until" timestamp with time zone,
	"author_id" uuid,
	"mailed" integer,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "news_seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "news_edition_idx" ON "news" USING btree ("edition_id","published_at");