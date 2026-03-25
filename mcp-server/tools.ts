import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { IseepClient } from "./client.js";

export function registerTools(server: McpServer, client: IseepClient) {
  // Tool 1: Get GTM Context
  server.tool(
    "get_context",
    "Get GTM context from iseep — product info, ICPs, and scoring data. Use this to understand the company's go-to-market strategy before making suggestions.",
    {
      modules: z
        .array(z.enum(["product", "icps", "scoring"]))
        .optional()
        .describe("Which modules to include. Default: all."),
    },
    async ({ modules }) => {
      const data = await client.getContext(modules);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    },
  );

  // Tool 2: List ICPs
  server.tool(
    "list_icps",
    "List all active ICPs (Ideal Customer Profiles) with their criteria and personas. Each ICP defines a target customer segment with qualify/risk/exclude rules.",
    {},
    async () => {
      const data = await client.listIcps();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    },
  );

  // Tool 3: Get Scoring Results
  server.tool(
    "get_scoring_results",
    "Get results from the latest lead scoring run — stats (high fit, borderline, blocked, unmatched) and top-scored leads with their ICP match details.",
    {
      uploadId: z
        .string()
        .optional()
        .describe("Specific upload ID. Default: latest scoring run."),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of leads to return. Default: 20, max: 100."),
    },
    async ({ uploadId, limit }) => {
      const data = await client.getScoringResults({ uploadId, limit });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    },
  );

  // Tool 4: Submit Suggestions
  server.tool(
    "submit_suggestions",
    "Submit change suggestions to iseep for human review. Supports: create_icp, update_product, update_icp, create_segment. The user will review and approve/reject each suggestion in the iseep UI.",
    {
      drafts: z
        .array(
          z.object({
            target_type: z
              .enum([
                "create_icp",
                "update_product",
                "update_icp",
                "create_segment",
              ])
              .describe("Type of change to propose"),
            target_id: z
              .string()
              .optional()
              .describe("Entity ID for update types"),
            summary: z
              .string()
              .describe("Human-readable summary of the change"),
            reasoning: z
              .string()
              .optional()
              .describe("Why this change is suggested"),
            payload: z
              .record(z.unknown())
              .describe("Change payload — shape depends on target_type"),
          }),
        )
        .describe("Array of suggestions to submit"),
    },
    async ({ drafts }) => {
      const data = (await client.submitSuggestions(drafts)) as {
        created: number;
        ids: string[];
      };
      return {
        content: [
          {
            type: "text" as const,
            text: `Successfully submitted ${data.created} suggestion(s). IDs: ${data.ids.join(", ")}. The user can review them in iseep at /drafts.`,
          },
        ],
      };
    },
  );
}
