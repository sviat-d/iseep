CREATE TABLE "activity_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid,
	"event_type" text NOT NULL,
	"entity_type" text,
	"entity_id" uuid,
	"summary" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "icp_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"icp_id" uuid NOT NULL,
	"company_name" text NOT NULL,
	"outcome" text NOT NULL,
	"reason_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"note" text,
	"industry" text,
	"region" text,
	"date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"invited_by" uuid NOT NULL,
	"token" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	CONSTRAINT "invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "icp_snapshots" ADD COLUMN "source" text DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE "icp_snapshots" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN "invited_by" uuid;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "onboarding_step" integer DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "icp_evidence" ADD CONSTRAINT "icp_evidence_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "icp_evidence" ADD CONSTRAINT "icp_evidence_icp_id_icps_id_fk" FOREIGN KEY ("icp_id") REFERENCES "public"."icps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;