CREATE TABLE "scored_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"upload_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"raw_data" jsonb NOT NULL,
	"company_name" text,
	"industry" text,
	"country" text,
	"website" text,
	"contact_name" text,
	"contact_email" text,
	"best_icp_id" uuid,
	"best_icp_name" text,
	"fit_score" integer,
	"fit_level" text NOT NULL,
	"match_reasons" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scored_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"total_rows" integer NOT NULL,
	"scored_at" timestamp with time zone DEFAULT now() NOT NULL,
	"column_mapping" jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scored_leads" ADD CONSTRAINT "scored_leads_upload_id_scored_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."scored_uploads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scored_leads" ADD CONSTRAINT "scored_leads_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scored_leads" ADD CONSTRAINT "scored_leads_best_icp_id_icps_id_fk" FOREIGN KEY ("best_icp_id") REFERENCES "public"."icps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scored_uploads" ADD CONSTRAINT "scored_uploads_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scored_uploads" ADD CONSTRAINT "scored_uploads_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;