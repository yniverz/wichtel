ALTER TABLE "assignments" ADD COLUMN "promoted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shift_positions" ADD COLUMN "urgent_sent_at" timestamp with time zone;--> statement-breakpoint
UPDATE "shift_positions" SET "urgent_sent_at" = "urgent_at" WHERE "urgent_at" IS NOT NULL;