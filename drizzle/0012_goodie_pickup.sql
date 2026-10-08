ALTER TABLE "goodies" ADD COLUMN "pickup_place_id" uuid;--> statement-breakpoint
ALTER TABLE "goodies" ADD COLUMN "pickup_info" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "goodies" ADD CONSTRAINT "goodies_pickup_place_id_places_id_fk" FOREIGN KEY ("pickup_place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;