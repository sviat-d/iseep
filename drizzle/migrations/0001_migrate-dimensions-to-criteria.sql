CREATE TABLE "criteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"icp_id" uuid,
	"persona_id" uuid,
	"group" text NOT NULL,
	"category" text NOT NULL,
	"operator" text,
	"value" text NOT NULL,
	"intent" text DEFAULT 'qualify' NOT NULL,
	"weight" integer,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "icp_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"icp_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"snapshot_data" jsonb NOT NULL,
	"change_summary" text,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "icp_snapshots_icp_version" UNIQUE("icp_id","version")
);
--> statement-breakpoint
DROP TABLE "dimensions" CASCADE;--> statement-breakpoint
ALTER TABLE "icps" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "product_requests" ADD COLUMN "status" text DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "product_requests" ADD COLUMN "source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "segments" ADD COLUMN "priority_score" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "criteria" ADD CONSTRAINT "criteria_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "criteria" ADD CONSTRAINT "criteria_icp_id_icps_id_fk" FOREIGN KEY ("icp_id") REFERENCES "public"."icps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "criteria" ADD CONSTRAINT "criteria_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "icp_snapshots" ADD CONSTRAINT "icp_snapshots_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "icp_snapshots" ADD CONSTRAINT "icp_snapshots_icp_id_icps_id_fk" FOREIGN KEY ("icp_id") REFERENCES "public"."icps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "icp_snapshots" ADD CONSTRAINT "icp_snapshots_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;