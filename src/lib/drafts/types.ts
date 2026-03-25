import { z } from "zod/v4";

export const DRAFT_TARGET_TYPES = [
  "create_icp",
  "update_product",
  "update_icp",
  "create_segment",
] as const;

export type DraftTargetType = (typeof DRAFT_TARGET_TYPES)[number];

const criterionSchema = z.object({
  group: z.enum(["firmographic", "technographic", "behavioral", "compliance", "keyword"]),
  category: z.string().min(1),
  value: z.string().min(1),
  intent: z.enum(["qualify", "risk", "exclude"]),
  importance: z.number().min(1).max(10).optional(),
  note: z.string().optional(),
});

const personaSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export const createIcpPayloadSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  criteria: z.array(criterionSchema).default([]),
  personas: z.array(personaSchema).default([]),
});

export const updateProductPayloadSchema = z.object({
  companyName: z.string().optional(),
  website: z.string().optional(),
  productDescription: z.string().optional(),
  targetCustomers: z.string().optional(),
  coreUseCases: z.array(z.string()).optional(),
  keyValueProps: z.array(z.string()).optional(),
  industriesFocus: z.array(z.string()).optional(),
  geoFocus: z.array(z.string()).optional(),
  pricingModel: z.string().optional(),
  avgTicket: z.string().optional(),
});

export const updateIcpPayloadSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  addCriteria: z.array(criterionSchema).optional(),
  removeCriteria: z.array(z.object({
    category: z.string().min(1),
    value: z.string().min(1),
  })).optional(),
  addPersonas: z.array(personaSchema).optional(),
  removePersonas: z.array(z.object({
    name: z.string().min(1),
  })).optional(),
});

export const createSegmentPayloadSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  icpId: z.string().uuid(),
  logicJson: z.record(z.string(), z.unknown()).optional(),
  priorityScore: z.number().min(1).max(10).optional(),
});

export const PAYLOAD_SCHEMAS: Record<DraftTargetType, z.ZodType> = {
  create_icp: createIcpPayloadSchema,
  update_product: updateProductPayloadSchema,
  update_icp: updateIcpPayloadSchema,
  create_segment: createSegmentPayloadSchema,
};

export const draftInputItemSchema = z.object({
  target_type: z.enum(DRAFT_TARGET_TYPES),
  target_id: z.string().uuid().optional(),
  summary: z.string().min(1),
  reasoning: z.string().optional(),
  payload: z.record(z.string(), z.unknown()),
});

export const draftsInputSchema = z.object({
  drafts: z.array(draftInputItemSchema).min(1),
});

export type DraftInputItem = z.infer<typeof draftInputItemSchema>;
export type DraftsInput = z.infer<typeof draftsInputSchema>;
export type CreateIcpPayload = z.infer<typeof createIcpPayloadSchema>;
export type UpdateProductPayload = z.infer<typeof updateProductPayloadSchema>;
export type UpdateIcpPayload = z.infer<typeof updateIcpPayloadSchema>;
export type CreateSegmentPayload = z.infer<typeof createSegmentPayloadSchema>;
