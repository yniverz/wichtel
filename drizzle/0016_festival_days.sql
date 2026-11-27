ALTER TABLE "editions" ADD COLUMN "festival_starts_on" date;--> statement-breakpoint
ALTER TABLE "editions" ADD COLUMN "festival_ends_on" date;--> statement-breakpoint
ALTER TABLE "editions" ADD CONSTRAINT "editions_festival_order" CHECK ("editions"."festival_starts_on" <= "editions"."festival_ends_on");