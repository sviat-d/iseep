CREATE TABLE "product_icps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"icp_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_icps_product_icp" UNIQUE("product_id","icp_id")
);
--> statement-breakpoint
ALTER TABLE "icp_evidence" ADD COLUMN "product_id" uuid;--> statement-breakpoint
ALTER TABLE "product_icps" ADD CONSTRAINT "product_icps_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_icps" ADD CONSTRAINT "product_icps_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_icps" ADD CONSTRAINT "product_icps_icp_id_icps_id_fk" FOREIGN KEY ("icp_id") REFERENCES "public"."icps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "icp_evidence" ADD CONSTRAINT "icp_evidence_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;