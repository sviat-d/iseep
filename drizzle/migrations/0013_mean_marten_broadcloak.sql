CREATE TABLE "hypotheses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"icp_id" uuid NOT NULL,
	"name" text NOT NULL,
	"segment_id" uuid,
	"persona_id" uuid,
	"problem" text,
	"value_proposition" text,
	"expected_result" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"notes" text,
	"metrics_leads" integer DEFAULT 0,
	"metrics_replies" integer DEFAULT 0,
	"metrics_meetings" integer DEFAULT 0,
	"metrics_opps" integer DEFAULT 0,
	"metrics_wins" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "icp_evidence" ADD COLUMN "use_case_ids" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "icp_evidence" ADD COLUMN "hypothesis_id" uuid;--> statement-breakpoint
ALTER TABLE "personas" ADD COLUMN "goals" text;--> statement-breakpoint
ALTER TABLE "personas" ADD COLUMN "pain_points" text;--> statement-breakpoint
ALTER TABLE "personas" ADD COLUMN "triggers" text;--> statement-breakpoint
ALTER TABLE "personas" ADD COLUMN "decision_criteria" text;--> statement-breakpoint
ALTER TABLE "personas" ADD COLUMN "objections" text;--> statement-breakpoint
ALTER TABLE "personas" ADD COLUMN "desired_outcome" text;--> statement-breakpoint
ALTER TABLE "hypotheses" ADD CONSTRAINT "hypotheses_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hypotheses" ADD CONSTRAINT "hypotheses_icp_id_icps_id_fk" FOREIGN KEY ("icp_id") REFERENCES "public"."icps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hypotheses" ADD CONSTRAINT "hypotheses_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hypotheses" ADD CONSTRAINT "hypotheses_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "icp_evidence" ADD CONSTRAINT "icp_evidence_hypothesis_id_hypotheses_id_fk" FOREIGN KEY ("hypothesis_id") REFERENCES "public"."hypotheses"("id") ON DELETE no action ON UPDATE no action;