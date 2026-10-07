CREATE TABLE "places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"name_de" text NOT NULL,
	"name_en" text DEFAULT '' NOT NULL,
	"description_de" text DEFAULT '' NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"plan_x" double precision,
	"plan_y" double precision,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "editions" ADD COLUMN "site_plan_asset_id" uuid;--> statement-breakpoint
ALTER TABLE "editions" ADD COLUMN "desk_place_id" uuid;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "map_tile_url" text DEFAULT 'https://tile.openstreetmap.org/{z}/{x}/{y}.png' NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "map_attribution" text DEFAULT '© OpenStreetMap contributors' NOT NULL;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "location_place_id" uuid;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "meeting_place_id" uuid;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "places_edition_idx" ON "places" USING btree ("edition_id");--> statement-breakpoint
ALTER TABLE "editions" ADD CONSTRAINT "editions_site_plan_asset_id_assets_id_fk" FOREIGN KEY ("site_plan_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_location_place_id_places_id_fk" FOREIGN KEY ("location_place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_meeting_place_id_places_id_fk" FOREIGN KEY ("meeting_place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;