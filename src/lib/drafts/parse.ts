import {
  draftsInputSchema,
  PAYLOAD_SCHEMAS,
  type DraftTargetType,
  type DraftInputItem,
} from "./types";

export type ParsedDraft = {
  targetType: DraftTargetType;
  targetId: string | null;
  summary: string;
  reasoning: string | null;
  payload: Record<string, unknown>;
};

export type ParseResult =
  | { success: true; drafts: ParsedDraft[] }
  | { success: false; error: string; details?: Array<{ index: number; issues: string[] }> };

export function parseDraftsInput(jsonString: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonString);
  } catch {
    return { success: false, error: "Invalid JSON. Please check the format." };
  }

  const topResult = draftsInputSchema.safeParse(raw);
  if (!topResult.success) {
    return {
      success: false,
      error: "Invalid format. Expected { \"drafts\": [...] }",
      details: topResult.error.issues.map((iss) => ({
        index: 0,
        issues: [iss.message],
      })),
    };
  }

  const errors: Array<{ index: number; issues: string[] }> = [];
  const parsed: ParsedDraft[] = [];

  for (let i = 0; i < topResult.data.drafts.length; i++) {
    const item: DraftInputItem = topResult.data.drafts[i];
    const payloadSchema = PAYLOAD_SCHEMAS[item.target_type];
    const payloadResult = payloadSchema.safeParse(item.payload);

    if (!payloadResult.success) {
      errors.push({
        index: i,
        issues: payloadResult.error.issues.map(
          (iss) => `${iss.path.join(".")}: ${iss.message}`,
        ),
      });
      continue;
    }

    if (
      (item.target_type === "update_product" || item.target_type === "update_icp") &&
      !item.target_id
    ) {
      errors.push({
        index: i,
        issues: [`target_id is required for ${item.target_type}`],
      });
      continue;
    }

    parsed.push({
      targetType: item.target_type,
      targetId: item.target_id ?? null,
      summary: item.summary,
      reasoning: item.reasoning ?? null,
      payload: payloadResult.data as Record<string, unknown>,
    });
  }

  if (errors.length > 0) {
    return { success: false, error: "Validation failed", details: errors };
  }

  return { success: true, drafts: parsed };
}
