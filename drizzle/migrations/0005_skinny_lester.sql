CREATE TABLE "ai_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"api_key" text NOT NULL,
	"model" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_keys_workspace_id_unique" UNIQUE("workspace_id")
);
--> statement-breakpoint
CREATE TABLE "product_context" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"company_name" text,
	"website" text,
	"product_description" text NOT NULL,
	"target_customers" text,
	"core_use_cases" jsonb DEFAULT '[]'::jsonb,
	"key_value_props" jsonb DEFAULT '[]'::jsonb,
	"industries_focus" jsonb DEFAULT '[]'::jsonb,
	"geo_focus" jsonb DEFAULT '[]'::jsonb,
	"pricing_model" text,
	"avg_ticket" text,
	"excluded_industries" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_context_workspace_id_unique" UNIQUE("workspace_id")
);
--> statement-breakpoint
CREATE TABLE "rejected_icps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"industry" text NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "value_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"category" text NOT NULL,
	"from_value" text NOT NULL,
	"to_value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "value_mappings_workspace_category_from" UNIQUE("workspace_id","category","from_value")
);
--> statement-breakpoint
ALTER TABLE "scored_leads" ADD COLUMN "confidence" integer;--> statement-breakpoint
ALTER TABLE "scored_uploads" ADD COLUMN "source_name" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "profile_share_token" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "profile_share_mode" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "profile_shared_icp_ids" jsonb;--> statement-breakpoint
ALTER TABLE "ai_keys" ADD CONSTRAINT "ai_keys_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_context" ADD CONSTRAINT "product_context_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rejected_icps" ADD CONSTRAINT "rejected_icps_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "value_mappings" ADD CONSTRAINT "value_mappings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_profile_share_token_unique" UNIQUE("profile_share_token");