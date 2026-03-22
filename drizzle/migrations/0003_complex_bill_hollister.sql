ALTER TABLE "icps" ADD COLUMN "share_token" text;--> statement-breakpoint
ALTER TABLE "icps" ADD COLUMN "share_mode" text;--> statement-breakpoint
ALTER TABLE "icps" ADD CONSTRAINT "icps_share_token_unique" UNIQUE("share_token");