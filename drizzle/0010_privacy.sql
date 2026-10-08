ALTER TABLE "instance_settings" ADD COLUMN "legal_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "legal_address" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "legal_representative" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "legal_email" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "legal_phone" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "legal_register" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "legal_vat_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "imprint_extra_de" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "imprint_extra_en" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "privacy_officer" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "privacy_de" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "privacy_en" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "retention_months" integer DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "audit_ip_days" integer DEFAULT 90 NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "error_alerts" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "retention_notice_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
-- Existing accounts start counting from now, so the retention job does not surprise anyone.
UPDATE "users" SET "last_seen_at" = now();