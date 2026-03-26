ALTER TABLE "products" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "core_use_cases" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "key_value_props" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "pricing_model" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "avg_ticket" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "company_description" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "target_customers" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "industries_focus" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "geo_focus" jsonb DEFAULT '[]'::jsonb;