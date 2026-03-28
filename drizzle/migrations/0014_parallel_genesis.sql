ALTER TABLE "hypotheses" ADD COLUMN "selected_criteria_ids" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "hypotheses" ADD COLUMN "selected_persona_ids" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "hypotheses" ADD COLUMN "solution" text;--> statement-breakpoint
ALTER TABLE "hypotheses" ADD COLUMN "outcome" text;