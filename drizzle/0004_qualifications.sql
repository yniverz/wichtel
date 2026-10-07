CREATE TYPE "public"."qualification_proof" AS ENUM('confirm', 'upload', 'either');--> statement-breakpoint
CREATE TYPE "public"."document_retention" AS ENUM('keep', 'delete_after_review');--> statement-breakpoint
CREATE TYPE "public"."user_qualification_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "qualifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_de" text NOT NULL,
	"name_en" text DEFAULT '' NOT NULL,
	"description_de" text DEFAULT '' NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"proof" "qualification_proof" DEFAULT 'either' NOT NULL,
	"document_retention" "document_retention" DEFAULT 'delete_after_review' NOT NULL,
	"validity_days" integer,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_qualifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"qualification_id" uuid NOT NULL,
	"status" "user_qualification_status" DEFAULT 'pending' NOT NULL,
	"document_id" uuid,
	"document_name" text,
	"document_type" text,
	"note" text DEFAULT '' NOT NULL,
	"review_note" text DEFAULT '' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_qualifications_unique" UNIQUE("user_id","qualification_id")
);
--> statement-breakpoint
ALTER TABLE "shift_positions" ADD COLUMN "required_qualification_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL;--> statement-breakpoint
ALTER TABLE "shift_positions" ADD COLUMN "preferred_qualification_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL;--> statement-breakpoint
ALTER TABLE "user_qualifications" ADD CONSTRAINT "user_qualifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_qualifications" ADD CONSTRAINT "user_qualifications_qualification_id_qualifications_id_fk" FOREIGN KEY ("qualification_id") REFERENCES "public"."qualifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_qualifications" ADD CONSTRAINT "user_qualifications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_qualifications_status_idx" ON "user_qualifications" USING btree ("status");