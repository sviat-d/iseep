ALTER TABLE "hypotheses" ADD COLUMN "product_ids" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "icp_evidence" ADD COLUMN "product_ids" jsonb DEFAULT '[]'::jsonb;