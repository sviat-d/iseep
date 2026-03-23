"use server";

import { getAuthContext } from "@/lib/auth";
import { getAiConfig, callAi } from "@/lib/ai-client";
import { checkAiLimit, trackAiUsage } from "@/lib/ai-usage";
import { getProductContext } from "@/lib/queries/product-context";
import type { ActionResult } from "@/lib/types";

export type AiEvaluation = {
  fitProbability: "high" | "medium" | "low";
  sellProbability: "high" | "medium" | "low";
  reasoning: string;
  potentialUseCases: string[];
  risks: string[];
  recommendation: string;
};

export async function evaluateClusterWithAi(
  clusterIndustry: string,
  clusterCountries: string[],
  clusterCompanies: string[],
  clusterLeadCount: number
): Promise<ActionResult & { evaluation?: AiEvaluation }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Please sign in" };

  const limit = await checkAiLimit(ctx.workspaceId);
  if (!limit.allowed) {
    return { error: `Monthly AI limit reached (${limit.used}/${limit.limit}).` };
  }

  const productCtx = await getProductContext(ctx.workspaceId);
  if (!productCtx) {
    return { error: "Add your product context first to use AI evaluation." };
  }

  try {
    const config = await getAiConfig(ctx.workspaceId);

    const prompt = `You are a GTM strategy analyst. Evaluate whether this market segment could be a good fit for the user's product.

PRODUCT CONTEXT:
- Company: ${productCtx.companyName ?? "N/A"}
- Product: ${productCtx.productDescription}
- Target customers: ${productCtx.targetCustomers ?? "N/A"}
- Use cases: ${(productCtx.coreUseCases as string[] | null)?.join(", ") ?? "N/A"}
- Value propositions: ${(productCtx.keyValueProps as string[] | null)?.join(", ") ?? "N/A"}
- Industries focus: ${(productCtx.industriesFocus as string[] | null)?.join(", ") ?? "N/A"}
- Geo focus: ${(productCtx.geoFocus as string[] | null)?.join(", ") ?? "N/A"}

DISCOVERED SEGMENT:
- Industry: ${clusterIndustry}
- Countries: ${clusterCountries.join(", ") || "Various"}
- Number of companies: ${clusterLeadCount}
- Example companies: ${clusterCompanies.slice(0, 5).join(", ")}

Answer these questions:
1. How likely is it that companies in this segment NEED the user's product? (high/medium/low)
2. How likely is the user able to SELL to this segment? (high/medium/low)
3. Why? (2-3 sentences max)
4. What specific use cases could these companies have for the product? (list 2-3)
5. What risks or challenges exist? (list 1-2)
6. One-sentence recommendation

Return ONLY valid JSON:
{
  "fitProbability": "high|medium|low",
  "sellProbability": "high|medium|low",
  "reasoning": "string",
  "potentialUseCases": ["string"],
  "risks": ["string"],
  "recommendation": "string"
}`;

    const responseText = await callAi(config, undefined, prompt, 1000);

    await trackAiUsage(ctx.workspaceId, ctx.userId, "cluster_evaluation");

    let jsonStr = responseText;
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) jsonStr = match[1];

    const evaluation = JSON.parse(jsonStr.trim()) as AiEvaluation;
    return { success: true, evaluation };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("credit") || msg.includes("billing")) {
      return { error: "AI service temporarily unavailable. Try again later." };
    }
    return { error: "Could not evaluate this segment. Try again." };
  }
}
