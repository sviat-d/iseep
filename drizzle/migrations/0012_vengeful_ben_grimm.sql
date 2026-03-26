CREATE TABLE "product_use_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_use_cases_product_norm" UNIQUE("product_id","normalized_name")
);
--> statement-breakpoint
ALTER TABLE "icp_evidence" ADD COLUMN "use_case_id" uuid;--> statement-breakpoint
ALTER TABLE "product_use_cases" ADD CONSTRAINT "product_use_cases_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_use_cases" ADD CONSTRAINT "product_use_cases_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "icp_evidence" ADD CONSTRAINT "icp_evidence_use_case_id_product_use_cases_id_fk" FOREIGN KEY ("use_case_id") REFERENCES "public"."product_use_cases"("id") ON DELETE no action ON UPDATE no action;