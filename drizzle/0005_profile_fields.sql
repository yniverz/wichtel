CREATE TYPE "public"."field_context" AS ENUM('registration', 'profile', 'goodie');--> statement-breakpoint
CREATE TYPE "public"."field_type" AS ENUM('text', 'textarea', 'number', 'date', 'select', 'multiselect', 'checkbox');--> statement-breakpoint
CREATE TABLE "profile_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label_de" text NOT NULL,
	"label_en" text DEFAULT '' NOT NULL,
	"help_de" text DEFAULT '' NOT NULL,
	"help_en" text DEFAULT '' NOT NULL,
	"type" "field_type" DEFAULT 'text' NOT NULL,
	"options" text[] DEFAULT '{}'::text[] NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"context" "field_context" DEFAULT 'profile' NOT NULL,
	"goodie_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"show_to_leads" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_values" (
	"user_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_values_user_id_field_id_pk" PRIMARY KEY("user_id","field_id")
);
--> statement-breakpoint
ALTER TABLE "profile_values" ADD CONSTRAINT "profile_values_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_values" ADD CONSTRAINT "profile_values_field_id_profile_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."profile_fields"("id") ON DELETE cascade ON UPDATE no action;