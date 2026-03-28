ALTER TABLE "hypotheses" ADD COLUMN "recipients" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "hypotheses" ADD COLUMN "positive_replies" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "hypotheses" ADD COLUMN "sqls" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "hypotheses" ADD COLUMN "won_deals" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "hypotheses" ADD COLUMN "lost_deals" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "icp_evidence" ADD COLUMN "deal_value" numeric;--> statement-breakpoint
ALTER TABLE "icp_evidence" ADD COLUMN "deal_type" text;--> statement-breakpoint
ALTER TABLE "icp_evidence" ADD COLUMN "why_won" text;--> statement-breakpoint
ALTER TABLE "icp_evidence" ADD COLUMN "why_lost" text;