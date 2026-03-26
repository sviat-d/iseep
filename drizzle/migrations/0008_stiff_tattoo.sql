ALTER TABLE "icp_evidence" ADD COLUMN "company_domain" text;--> statement-breakpoint
ALTER TABLE "icp_evidence" ADD COLUMN "segment_id" uuid;--> statement-breakpoint
ALTER TABLE "icp_evidence" ADD COLUMN "channel" text;--> statement-breakpoint
ALTER TABLE "icp_evidence" ADD COLUMN "channel_detail" text;--> statement-breakpoint
ALTER TABLE "icp_evidence" ADD COLUMN "hypothesis" text;--> statement-breakpoint
ALTER TABLE "icp_evidence" ADD CONSTRAINT "icp_evidence_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE no action ON UPDATE no action;